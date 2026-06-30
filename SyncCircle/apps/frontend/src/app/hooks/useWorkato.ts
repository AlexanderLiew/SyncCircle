import { useCallback } from 'react';
import { toast } from 'sonner';
import type { TimetableClass, Note } from '../types';
import {
  WORKATO_WEBHOOK_URL,
  PENDING_SYNCS_KEY,
  mapClassToGoogleCalendarEvent,
  type PendingSync,
  type SyncAction,
} from '../lib/workato-client';

// ============================================================
// useWorkato — Hook implementing the WorkatoClient interface
// ============================================================

export interface UseWorkatoReturn {
  syncClass: (action: SyncAction, classData: TimetableClass) => Promise<void>;
  syncNote: (action: 'create' | 'update', noteData: Note) => Promise<void>;
  connectGoogleCalendar: (userId: string) => Promise<{ connected: boolean }>;
  connectGoogleNotes: (userId: string) => Promise<{ connected: boolean }>;
  disconnectGoogleCalendar: (userId: string) => Promise<void>;
  retryPendingSyncs: () => Promise<void>;
}

// --- Helpers ---

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getPendingSyncs(): PendingSync[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingSyncs(syncs: PendingSync[]): void {
  localStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(syncs));
}

function addPendingSync(sync: Omit<PendingSync, 'id' | 'createdAt'>): void {
  const pending = getPendingSyncs();
  pending.push({
    ...sync,
    id: generateId(),
    createdAt: new Date().toISOString(),
  });
  savePendingSyncs(pending);
}

/**
 * Fire-and-forget POST to the Workato webhook.
 * Returns true on success, false on failure.
 */
async function postWebhook(path: string, payload: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${WORKATO_WEBHOOK_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Hook ---

/**
 * Custom hook for interacting with Workato webhooks.
 *
 * All sync operations are fire-and-forget:
 * - On success: silently completes
 * - On failure: shows a toast notification and stores the failed sync for retry
 */
export function useWorkato(): UseWorkatoReturn {
  const syncClass = useCallback(
    async (action: SyncAction, classData: TimetableClass): Promise<void> => {
      const payload = {
        action,
        class: mapClassToGoogleCalendarEvent(classData),
        raw: classData,
      };

      const success = await postWebhook('/class-sync', payload);

      if (!success) {
        toast.error('Sync to Google Calendar failed. Changes saved locally.');
        addPendingSync({ type: 'class', action, payload });
      }
    },
    []
  );

  const syncNote = useCallback(
    async (action: 'create' | 'update', noteData: Note): Promise<void> => {
      const payload = {
        action,
        note: {
          id: noteData.id,
          title: noteData.title,
          content: noteData.content,
          folderId: noteData.folderId,
          updatedAt: noteData.updatedAt,
        },
      };

      const success = await postWebhook('/note-sync', payload);

      if (!success) {
        toast.error('Sync to Google Notes failed. Changes saved locally.');
        addPendingSync({ type: 'note', action, payload });
      }
    },
    []
  );

  const connectGoogleCalendar = useCallback(
    async (userId: string): Promise<{ connected: boolean }> => {
      const payload = { userId, service: 'google-calendar', action: 'connect' };
      const success = await postWebhook('/calendar-connect', payload);

      if (!success) {
        toast.error('Failed to connect Google Calendar. Please try again.');
        addPendingSync({ type: 'calendar-connect', action: 'connect', payload });
        return { connected: false };
      }

      return { connected: true };
    },
    []
  );

  const connectGoogleNotes = useCallback(
    async (userId: string): Promise<{ connected: boolean }> => {
      const payload = { userId, service: 'google-notes', action: 'connect' };
      const success = await postWebhook('/notes-connect', payload);

      if (!success) {
        toast.error('Failed to connect Google Notes. Please try again.');
        addPendingSync({ type: 'notes-connect', action: 'connect', payload });
        return { connected: false };
      }

      return { connected: true };
    },
    []
  );

  const disconnectGoogleCalendar = useCallback(
    async (userId: string): Promise<void> => {
      const payload = { userId, service: 'google-calendar', action: 'disconnect' };
      const success = await postWebhook('/calendar-disconnect', payload);

      if (!success) {
        toast.error('Failed to disconnect Google Calendar. Please try again.');
        addPendingSync({ type: 'calendar-disconnect', action: 'disconnect', payload });
      }
    },
    []
  );

  const retryPendingSyncs = useCallback(async (): Promise<void> => {
    const pending = getPendingSyncs();
    if (pending.length === 0) return;

    const remaining: PendingSync[] = [];

    for (const sync of pending) {
      let path: string;
      switch (sync.type) {
        case 'class':
          path = '/class-sync';
          break;
        case 'note':
          path = '/note-sync';
          break;
        case 'calendar-connect':
          path = '/calendar-connect';
          break;
        case 'calendar-disconnect':
          path = '/calendar-disconnect';
          break;
        case 'notes-connect':
          path = '/notes-connect';
          break;
        default:
          remaining.push(sync);
          continue;
      }

      const success = await postWebhook(path, sync.payload);
      if (!success) {
        remaining.push(sync);
      }
    }

    savePendingSyncs(remaining);

    if (remaining.length > 0 && remaining.length < pending.length) {
      toast.info(`Retried syncs: ${pending.length - remaining.length} succeeded, ${remaining.length} still pending.`);
    } else if (remaining.length === 0 && pending.length > 0) {
      toast.success('All pending syncs completed successfully.');
    }
  }, []);

  return {
    syncClass,
    syncNote,
    connectGoogleCalendar,
    connectGoogleNotes,
    disconnectGoogleCalendar,
    retryPendingSyncs,
  };
}
