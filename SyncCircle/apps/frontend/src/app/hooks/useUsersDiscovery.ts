import { useState, useEffect, useCallback } from 'react';
import { apiClient, UnauthorizedError } from '../lib/api-client';
import { API_PATHS, type UsersListResponse } from '@synccircle/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiscoverableUser {
  userId: string;
  displayName: string;
  email: string;
}

export interface UseUsersDiscoveryReturn {
  users: DiscoverableUser[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for fetching all registered users for friend discovery.
 * Uses GET /users to retrieve the full user list.
 * Handles UnauthorizedError gracefully by setting error state.
 */
export function useUsersDiscovery(): UseUsersDiscoveryReturn {
  const [users, setUsers] = useState<DiscoverableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<UsersListResponse>(API_PATHS.USERS);
      setUsers(data.users);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setError('Session expired. Please log in again.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refresh: fetchUsers,
  };
}
