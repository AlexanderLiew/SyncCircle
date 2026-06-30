import { useState, useCallback } from 'react';
import type { ChatMessage, TimetableClass, Task, UserSettings } from '../types';
import { getClasses, getTasks, getSettings } from '../lib/storage';

// --- Types ---

export interface UserContext {
  timetable: TimetableClass[];
  tasks: Task[];
  aiPreferences: UserSettings['aiPreferences'];
}

interface APIResult<T> {
  data?: T;
  error?: string;
}

export interface UseKiroAPIReturn {
  summarizeNote: (content: string) => Promise<APIResult<{ summary: string }>>;
  chatMessage: (
    message: string,
    history: ChatMessage[],
    context: UserContext
  ) => Promise<APIResult<{ response: string }>>;
  isLoading: boolean;
  error: string | null;
}

// --- API Base URL ---

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_KIRO_API_URL) ||
  'https://api.kiro.placeholder.dev';

// --- Core fetch wrapper with AbortController timeout ---

async function callKiroAPI<T>(
  endpoint: string,
  payload: unknown,
  timeoutMs: number
): Promise<APIResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { error: 'Something went wrong. Please try again.' };
    }
    return { data: await res.json() };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }
    return { error: 'Unable to connect. Please check your connection.' };
  }
}

// --- Hook ---

/**
 * Custom hook for interacting with the Kiro API.
 *
 * Provides methods for note summarization and AI chat,
 * along with shared loading and error state.
 */
export function useKiroAPI(): UseKiroAPIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarizeNote = useCallback(
    async (content: string): Promise<APIResult<{ summary: string }>> => {
      setIsLoading(true);
      setError(null);

      const result = await callKiroAPI<{ summary: string }>(
        `${API_BASE_URL}/api/summarize`,
        { content },
        30_000 // 30s timeout
      );

      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  const chatMessage = useCallback(
    async (
      message: string,
      history: ChatMessage[],
      context: UserContext
    ): Promise<APIResult<{ response: string }>> => {
      setIsLoading(true);
      setError(null);

      const result = await callKiroAPI<{ response: string }>(
        `${API_BASE_URL}/api/chat`,
        {
          message,
          history,
          context: {
            timetable: context.timetable,
            tasks: context.tasks,
            aiPreferences: context.aiPreferences,
          },
        },
        10_000 // 10s timeout
      );

      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  return { summarizeNote, chatMessage, isLoading, error };
}

/**
 * Helper to build UserContext from current localStorage state.
 * Useful for callers who want a quick way to assemble context.
 */
export function buildUserContext(): UserContext {
  const settings = getSettings();
  return {
    timetable: getClasses(),
    tasks: getTasks(),
    aiPreferences: settings.aiPreferences,
  };
}
