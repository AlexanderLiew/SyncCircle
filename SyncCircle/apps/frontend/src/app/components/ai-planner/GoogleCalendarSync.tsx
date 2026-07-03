import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Check, AlertCircle, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  initGoogleAuth,
  signInGoogle,
  isGoogleConnected,
  getGoogleAccessToken,
} from '../../lib/google-calendar';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleCalendarSyncProps {
  event: {
    title: string;
    startDateTime: string;
    endDateTime: string;
    location?: string;
  };
}

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

// ─── Constants ───────────────────────────────────────────────────────────────

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * GoogleCalendarSync provides an optional "Sync to Google Calendar" button
 * shown after an AI Planner event is created. It uses the existing Google
 * OAuth2 integration to push the event to the user's primary calendar.
 *
 * This component does NOT block backend event creation — it's purely an
 * optional post-acceptance action.
 *
 * Validates: Requirements 17.1, 17.2, 17.3, 17.4
 */
export function GoogleCalendarSync({ event }: GoogleCalendarSyncProps) {
  const [connected, setConnected] = useState<boolean>(isGoogleConnected());
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Google Auth on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await initGoogleAuth();
        if (mounted) {
          setIsInitialized(true);
          setConnected(isGoogleConnected());
        }
      } catch (err) {
        if (mounted) {
          console.warn('[GoogleCalendarSync] Auth init failed:', err);
          setIsInitialized(true); // still mark initialized so UI renders
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  /**
   * Connect to Google Calendar via OAuth2 popup.
   * Handles the case where token is expired or missing (Requirement 17.3).
   */
  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      await signInGoogle();
      setConnected(true);
      toast.success('Connected to Google Calendar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect';
      setErrorMessage(msg);
      toast.error('Failed to connect to Google Calendar');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Create a Google Calendar event using the Calendar API v3.
   * Uses the existing OAuth2 token from localStorage.
   */
  const handleSync = useCallback(async () => {
    setSyncState('syncing');
    setErrorMessage(null);

    // Check if token is still valid
    const token = getGoogleAccessToken();
    if (!token) {
      // Token expired or missing — prompt re-authentication (Requirement 17.3)
      setConnected(false);
      setSyncState('idle');
      setErrorMessage('Google Calendar session expired. Please reconnect.');
      toast.error('Google Calendar session expired', {
        description: 'Please reconnect to sync your event.',
      });
      return;
    }

    try {
      const body = {
        summary: event.title,
        start: {
          dateTime: event.startDateTime,
          timeZone: 'Asia/Singapore',
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: 'Asia/Singapore',
        },
        ...(event.location ? { location: event.location } : {}),
      };

      const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        // Token expired on Google's side — prompt re-auth (Requirement 17.3)
        setConnected(false);
        setSyncState('idle');
        setErrorMessage('Google Calendar session expired. Please reconnect.');
        toast.error('Session expired', {
          description: 'Please reconnect to Google Calendar.',
        });
        return;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error('[GoogleCalendarSync] Sync failed:', response.status, errText);
        throw new Error(`Sync failed (${response.status})`);
      }

      setSyncState('success');
      toast.success('Event synced to Google Calendar');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sync';
      setSyncState('error');
      setErrorMessage(msg);
      toast.error('Failed to sync to Google Calendar', {
        description: msg,
      });
    }
  }, [event]);

  // Don't render anything until auth is initialized
  if (!isInitialized) return null;

  return (
    <div className="mt-3">
      <AnimatePresence mode="wait">
        {/* Success State */}
        {syncState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm"
          >
            <Check className="w-4 h-4" />
            <span>Synced to Google Calendar</span>
          </motion.div>
        )}

        {/* Not Connected — Show Connect Button (Requirement 17.3) */}
        {syncState !== 'success' && !connected && (
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {errorMessage && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage}
              </p>
            )}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent/60 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Connect to Google Calendar"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {isConnecting ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          </motion.div>
        )}

        {/* Connected — Show Sync Button (Requirements 17.1, 17.2) */}
        {syncState !== 'success' && connected && (
          <motion.div
            key="sync"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {errorMessage && (
              <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage}
              </p>
            )}
            <button
              onClick={handleSync}
              disabled={syncState === 'syncing'}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-accent/60 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sync event to Google Calendar"
            >
              {syncState === 'syncing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 text-primary" />
              )}
              {syncState === 'syncing' ? 'Syncing…' : 'Sync to Google Calendar'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
