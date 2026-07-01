import { useState, useEffect, useCallback } from 'react';
import { apiClient, UnauthorizedError } from '../lib/api-client';
import { API_PATHS, type FriendsListResponse } from '@synccircle/shared';
import { useAuth } from './useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Friend {
  friendId: string;
  displayName: string;
  createdAt: string;
}

export interface UseFriendsReturn {
  friends: Friend[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook for interacting with the Friends API.
 * Fetches the list of active friends and provides a method to remove a friend.
 * Does NOT use localStorage — all data comes from the backend.
 */
export function useFriends(): UseFriendsReturn {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  const fetchFriends = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<FriendsListResponse>(API_PATHS.FRIENDS);
      setFriends(data.friends);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        setError('Session expired. Please log in again.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const removeFriend = useCallback(async (friendId: string) => {
    setError(null);
    try {
      const path = API_PATHS.FRIENDS_REMOVE.replace(':friendId', friendId);
      await apiClient.del(path);
      // Re-fetch to get updated list
      await fetchFriends();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        logout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to remove friend');
      throw err;
    }
  }, [fetchFriends, logout]);

  return {
    friends,
    isLoading,
    error,
    refresh: fetchFriends,
    removeFriend,
  };
}
