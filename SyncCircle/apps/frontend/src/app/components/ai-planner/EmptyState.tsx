import { motion } from "motion/react";
import {
  UserPlus,
  CalendarX,
  AlertTriangle,
  Inbox,
  RefreshCw,
} from "lucide-react";

export type EmptyStateType = "no-friends" | "no-slots" | "error" | "no-sessions";

export interface EmptyStateProps {
  type: EmptyStateType;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Configuration per empty state type. */
const EMPTY_STATE_CONFIG: Record<
  EmptyStateType,
  {
    icon: React.ComponentType<{ className?: string }>;
    defaultMessage: string;
    defaultActionLabel?: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  "no-friends": {
    icon: UserPlus,
    defaultMessage:
      "You need friends to plan group sessions. Add some friends to get started!",
    defaultActionLabel: "Go to Friends",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  "no-slots": {
    icon: CalendarX,
    defaultMessage:
      "No available time slots found for the selected period. Try adjusting your date range or reducing the session duration.",
    defaultActionLabel: "Adjust Constraints",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  error: {
    icon: AlertTriangle,
    defaultMessage:
      "Something went wrong while processing your request. Please try again.",
    defaultActionLabel: "Retry",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
  },
  "no-sessions": {
    icon: Inbox,
    defaultMessage:
      "No planning sessions yet. Start planning your study time with the AI planner!",
    defaultActionLabel: undefined,
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
};

/**
 * EmptyState displays contextual feedback when the AI Planner has no content to show.
 * Supports different states: no friends, no available slots, errors, and no sessions.
 *
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4
 */
export function EmptyState({ type, message, actionLabel, onAction }: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;
  const displayActionLabel = actionLabel || config.defaultActionLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center py-10 px-6"
      role="status"
      aria-label={displayMessage}
    >
      {/* Icon */}
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${config.iconBg}`}
      >
        <Icon className={`w-7 h-7 ${config.iconColor}`} />
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {displayMessage}
      </p>

      {/* Action Button */}
      {displayActionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
          aria-label={displayActionLabel}
        >
          {type === "error" && <RefreshCw className="w-4 h-4" />}
          {type === "no-friends" && <UserPlus className="w-4 h-4" />}
          {displayActionLabel}
        </button>
      )}
    </motion.div>
  );
}
