import { motion, AnimatePresence } from "motion/react";
import { Calendar, Clock, Users, User, ChevronRight } from "lucide-react";

/** Planning session status values. */
export type PlanningSessionStatus =
  | "draft"
  | "generating"
  | "options-generated"
  | "creator-accepted"
  | "confirmed"
  | "cancelled"
  | "rejected";

/** Planning session mode. */
export type PlanningMode = "personal" | "group";

/** A planning session record for display in the list. */
export interface PlanningSession {
  sessionId: string;
  creatorUserId: string;
  mode: PlanningMode;
  status: PlanningSessionStatus;
  activity: string;
  durationMinutes: number;
  dateRangeStart: string; // ISO 8601 date
  dateRangeEnd: string; // ISO 8601 date
  participantUserIds: string[];
  createdAt: string; // ISO 8601 timestamp
}

export interface PlanningSessionListProps {
  sessions: PlanningSession[];
  onSelectSession: (sessionId: string) => void;
}

/** Status badge color mapping. */
const STATUS_STYLES: Record<PlanningSessionStatus, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  generating:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "options-generated":
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "creator-accepted":
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  confirmed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  rejected:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

/** Human-friendly status labels. */
const STATUS_LABELS: Record<PlanningSessionStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  "options-generated": "Options Ready",
  "creator-accepted": "Accepted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

/**
 * Format an ISO date to a short readable form.
 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Format an ISO timestamp to a relative or short date.
 */
function formatCreatedAt(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * PlanningSessionList displays a history of past planning sessions.
 * Shows activity name, mode badge, status badge, date range, and created date.
 * Sessions are sorted by createdAt descending.
 *
 * Validates: Requirements 14.1
 */
export function PlanningSessionList({
  sessions,
  onSelectSession,
}: PlanningSessionListProps) {
  // Sort by createdAt descending
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {sortedSessions.map((session, index) => (
          <motion.button
            key={session.sessionId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => onSelectSession(session.sessionId)}
            className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-accent/40 hover:border-primary/20 transition-all group"
            aria-label={`Planning session: ${session.activity}`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                {/* Activity name */}
                <p className="font-medium text-sm truncate">
                  {session.activity}
                </p>

                {/* Meta row: mode badge, date range, created */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Mode Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                      session.mode === "group"
                        ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                        : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                    }`}
                  >
                    {session.mode === "group" ? (
                      <Users className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    {session.mode === "group" ? "Group" : "Personal"}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_STYLES[session.status]}`}
                  >
                    {STATUS_LABELS[session.status]}
                  </span>

                  {/* Date Range */}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {formatDate(session.dateRangeStart)} –{" "}
                    {formatDate(session.dateRangeEnd)}
                  </span>

                  {/* Duration */}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {session.durationMinutes}min
                  </span>
                </div>

                {/* Created date */}
                <p className="text-xs text-muted-foreground mt-1">
                  Created {formatCreatedAt(session.createdAt)}
                </p>
              </div>

              {/* Chevron */}
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
