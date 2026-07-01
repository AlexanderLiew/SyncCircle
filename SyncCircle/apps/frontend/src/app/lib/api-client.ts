import { AUTH_HEADER, AUTH_SCHEME, ERROR_CODES, type ErrorResponse } from '@synccircle/shared';

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// ─── Token Provider ──────────────────────────────────────────────────────────

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

/**
 * Register the function that supplies the current Cognito JWT.
 * The auth hook calls this once on mount so the API client can attach
 * the token to every outgoing request.
 */
export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

// ─── Error Classes ───────────────────────────────────────────────────────────

/**
 * Thrown when the server responds with HTTP 401.
 * The auth layer should catch this and trigger a re-authentication flow.
 */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Thrown for non-401 error responses from the API.
 * Carries the structured error details returned by the server.
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly field?: string;

  constructor(response: ErrorResponse, statusCode: number) {
    super(response.error);
    this.name = 'ApiError';
    this.code = response.code;
    this.statusCode = statusCode;
    this.field = response.field;
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!tokenProvider) {
    return {};
  }

  const token = await tokenProvider();
  if (!token) {
    return {};
  }

  return { [AUTH_HEADER]: `${AUTH_SCHEME} ${token}` };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, options);

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    let errorBody: ErrorResponse;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = {
        error: response.statusText || 'Unknown error',
        code: ERROR_CODES.INTERNAL_ERROR,
      };
    }
    throw new ApiError(errorBody, response.status);
  }

  // Handle 204 No Content (e.g. DELETE responses)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Public API Client ───────────────────────────────────────────────────────

/**
 * Authenticated API client for the SyncCircle Friends Backend.
 *
 * Automatically attaches the Cognito JWT from the registered token provider,
 * handles 401 (throws UnauthorizedError) and error responses (throws ApiError).
 *
 * @example
 * ```typescript
 * import { apiClient } from '@/app/lib/api-client';
 * import { API_PATHS, type FriendsListResponse } from '@synccircle/shared';
 *
 * const data = await apiClient.get<FriendsListResponse>(API_PATHS.FRIENDS);
 * ```
 */
export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  del<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
