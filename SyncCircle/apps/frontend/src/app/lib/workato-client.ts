import type { TimetableClass } from '../types';

// ============================================================
// Workato Client — Webhook URL Configuration & Helpers
// ============================================================

/**
 * Base webhook URL for Workato recipes.
 * Configured via VITE_WORKATO_WEBHOOK_URL environment variable.
 * Falls back to a placeholder for local development.
 */
export const WORKATO_WEBHOOK_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WORKATO_WEBHOOK_URL) ||
  'https://hooks.workato.com/webhooks/placeholder';

/**
 * localStorage key for storing failed syncs that should be retried on next load.
 */
export const PENDING_SYNCS_KEY = 'synccircle_pending_syncs';

// --- Pending Sync Types ---

export type SyncAction = 'create' | 'update' | 'delete';

export type SyncType = 'class' | 'note' | 'calendar-connect' | 'calendar-disconnect' | 'notes-connect';

export interface PendingSync {
  id: string;
  type: SyncType;
  action: SyncAction | 'connect' | 'disconnect';
  payload: unknown;
  createdAt: string;
}

// --- Google Calendar Field Mapping ---

/**
 * Maps CramCircle TimetableClass fields to Google Calendar event fields.
 * Used by the Workato webhook to create/update Google Calendar events.
 */
export function mapClassToGoogleCalendarEvent(classData: TimetableClass): Record<string, unknown> {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

  return {
    summary: classData.title,
    description: `Module: ${classData.moduleCode}`,
    location: classData.location,
    recurrence: `BYDAY=${dayNames[classData.dayOfWeek].slice(0, 2).toUpperCase()}`,
    start: {
      time: classData.startTime,
      dayOfWeek: dayNames[classData.dayOfWeek],
    },
    end: {
      time: classData.endTime,
      dayOfWeek: dayNames[classData.dayOfWeek],
    },
    colorId: classData.color,
    source: classData.source,
    externalId: classData.id,
    moduleCode: classData.moduleCode,
  };
}
