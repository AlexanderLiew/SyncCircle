import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { saveUser } from '../lib/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  userId: string;
  email: string;
  displayName: string;
  course?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, course?: string) => Promise<void>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

export type AuthContextValue = AuthState & AuthActions;

// ---------------------------------------------------------------------------
// Cognito Configuration
// ---------------------------------------------------------------------------

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID ?? '';

function getUserPool(): CognitoUserPool {
  if (!USER_POOL_ID || !CLIENT_ID) {
    throw new Error(
      'Missing Cognito configuration. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID environment variables.',
    );
  }
  return new CognitoUserPool({
    UserPoolId: USER_POOL_ID,
    ClientId: CLIENT_ID,
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ─── Dev Bypass: skip Cognito entirely when VITE_DEV_BYPASS_AUTH=true ───
  const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
  if (DEV_BYPASS) {
    const devUser: AuthUser = {
      userId: 'dev-user-001',
      email: 'dev@synccircle.test',
      displayName: 'Dev User',
      course: 'Computer Science',
    };
    const devValue: AuthContextValue = {
      user: devUser,
      isAuthenticated: true,
      isLoading: false,
      login: async () => {},
      register: async () => {},
      confirmRegistration: async () => {},
      logout: () => {},
      refreshSession: async () => {},
      getToken: async () => 'dev-bypass-token',
    };
    return React.createElement(AuthContext.Provider, { value: devValue }, children);
  }
  // ─── End Dev Bypass ─────────────────────────────────────────────────────

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const poolRef = useRef<CognitoUserPool | null>(null);

  // Sync authenticated user to localStorage so getUser() (used by
  // useTaskNotifications) always returns the real Cognito account email.
  useEffect(() => {
    if (user) {
      saveUser({
        id: user.userId,
        email: user.email,
        displayName: user.displayName,
        course: user.course,
        createdAt: new Date().toISOString(),
      });
    }
  }, [user]);

  // Lazily initialise the pool to avoid throwing at import time when env vars
  // are missing (e.g. during tests or SSR).
  const getPool = useCallback(() => {
    if (!poolRef.current) {
      try {
        poolRef.current = getUserPool();
      } catch {
        // Cognito not configured — return null and operate in unauthenticated mode
        return null;
      }
    }
    return poolRef.current;
  }, []);

  // -------------------------------------------------------------------------
  // Extract user attributes from a valid session
  // -------------------------------------------------------------------------

  const extractUser = useCallback((session: CognitoUserSession, cognitoUser: CognitoUser): Promise<AuthUser> => {
    return new Promise((resolve, reject) => {
      cognitoUser.getUserAttributes((err, attributes) => {
        if (err) {
          reject(err);
          return;
        }

        const attrMap: Record<string, string> = {};
        attributes?.forEach((attr) => {
          attrMap[attr.getName()] = attr.getValue();
        });

        resolve({
          userId: attrMap['sub'] ?? '',
          email: attrMap['email'] ?? '',
          displayName: attrMap['custom:displayName'] ?? attrMap['name'] ?? '',
          course: attrMap['custom:course'] || undefined,
        });
      });
    });
  }, []);

  // -------------------------------------------------------------------------
  // Restore session on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const pool = getPool();
        if (!pool) {
          setIsLoading(false);
          return;
        }
        const cognitoUser = pool.getCurrentUser();
        if (!cognitoUser) {
          setIsLoading(false);
          return;
        }

        cognitoUser.getSession(async (err: Error | null, session: CognitoUserSession | null) => {
          if (cancelled) return;
          if (err || !session || !session.isValid()) {
            setIsLoading(false);
            return;
          }

          try {
            const authUser = await extractUser(session, cognitoUser);
            if (!cancelled) {
              setUser(authUser);
            }
          } catch {
            // Could not retrieve attributes – treat as unauthenticated
          } finally {
            if (!cancelled) setIsLoading(false);
          }
        });
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, [getPool, extractUser]);

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const pool = getPool();
    if (!pool) throw new Error('Cognito not configured');
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: async (session) => {
          try {
            const authUser = await extractUser(session, cognitoUser);
            setUser(authUser);
            resolve();
          } catch (e) {
            reject(e);
          }
        },
        onFailure: (err) => reject(err),
        newPasswordRequired: () => reject(new Error('New password required. Please contact support.')),
      });
    });
  }, [getPool, extractUser]);

  // -------------------------------------------------------------------------
  // Register
  // -------------------------------------------------------------------------

  const register = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    course?: string,
  ): Promise<void> => {
    const pool = getPool();
    if (!pool) throw new Error('Cognito not configured');

    const attributes: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'custom:displayName', Value: displayName }),
    ];

    if (course) {
      attributes.push(new CognitoUserAttribute({ Name: 'custom:course', Value: course }));
    }

    return new Promise((resolve, reject) => {
      pool.signUp(email, password, attributes, [], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }, [getPool]);

  // -------------------------------------------------------------------------
  // Confirm registration (email verification code)
  // -------------------------------------------------------------------------

  const confirmRegistration = useCallback(async (email: string, code: string): Promise<void> => {
    const pool = getPool();
    if (!pool) throw new Error('Cognito not configured');
    const cognitoUser = new CognitoUser({ Username: email, Pool: pool });

    return new Promise((resolve, reject) => {
      cognitoUser.confirmRegistration(code, true, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }, [getPool]);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const logout = useCallback(() => {
    const pool = getPool();
    if (pool) {
      const cognitoUser = pool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.signOut();
      }
    }
    setUser(null);
  }, [getPool]);

  // -------------------------------------------------------------------------
  // Refresh session
  // -------------------------------------------------------------------------

  const refreshSession = useCallback(async (): Promise<void> => {
    const pool = getPool();
    if (!pool) throw new Error('Cognito not configured');
    const cognitoUser = pool.getCurrentUser();
    if (!cognitoUser) {
      throw new Error('No active session to refresh.');
    }

    return new Promise((resolve, reject) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          reject(err ?? new Error('Session expired.'));
          return;
        }

        const refreshToken = session.getRefreshToken();
        cognitoUser.refreshSession(refreshToken, async (refreshErr, newSession) => {
          if (refreshErr) {
            reject(refreshErr);
            return;
          }
          try {
            const authUser = await extractUser(newSession, cognitoUser);
            setUser(authUser);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });
    });
  }, [getPool, extractUser]);

  // -------------------------------------------------------------------------
  // Get current JWT access token (used by API client)
  // -------------------------------------------------------------------------

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const pool = getPool();
      if (!pool) return null;
      const cognitoUser = pool.getCurrentUser();
      if (!cognitoUser) return null;

      return new Promise((resolve) => {
        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
            return;
          }
          resolve(session.getIdToken().getJwtToken());
        });
      });
    } catch {
      return null;
    }
  }, [getPool]);

  // -------------------------------------------------------------------------
  // Register token provider with API client (when available)
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Dynamically import the api-client to avoid hard dependency ordering issues.
    // Task 11.1 creates api-client.ts with a setTokenProvider export.
    import('../lib/api-client')
      .then((mod) => {
        if (typeof mod.setTokenProvider === 'function') {
          mod.setTokenProvider(getToken);
        }
      })
      .catch(() => {
        // api-client not yet available – will be integrated once task 11.1 is complete
      });
  }, [getToken]);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    confirmRegistration,
    logout,
    refreshSession,
    getToken,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}
