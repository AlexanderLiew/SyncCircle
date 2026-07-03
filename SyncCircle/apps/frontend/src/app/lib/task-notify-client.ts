import { apiClient } from './api-client';
import { API_PATHS } from '@synccircle/shared';
import type { NotifyTaskResponse } from '@synccircle/shared';

/**
 * Determines whether a given date string (YYYY-MM-DD) is tomorrow
 * in the user's local timezone.
 */
export function isTomorrow(dueDate: string): boolean {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${yyyy}-${mm}-${dd}`;
  return dueDate === tomorrowStr;
}

/**
 * Sends a task reminder email request to the backend.
 * Fires only when dueDate equals tomorrow in user's local timezone.
 * Failures are silently swallowed — email is best-effort (fire-and-forget).
 */
export async function notifyTaskDueTomorrow(task: { title: string; dueDate: string }): Promise<void> {
  try {
    if (!isTomorrow(task.dueDate)) {
      return;
    }

    await apiClient.post<NotifyTaskResponse>(API_PATHS.TASKS_NOTIFY, {
      taskTitle: task.title,
      dueDate: task.dueDate,
    });
  } catch {
    // Fire-and-forget: silently swallow all errors
  }
}
