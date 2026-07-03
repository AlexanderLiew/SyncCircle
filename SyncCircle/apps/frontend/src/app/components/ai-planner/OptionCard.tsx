import { motion } from "motion/react";
import {
  Clock,
  MapPin,
  Users,
  Sparkles,
  Check,
  RefreshCw,
} from "lucide-react";

/** A proposed time option from the AI Planner backend. */
export interface ProposedTimeOption {
  optionId: string;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  durationMinutes: number;
  explanation: string;
  score: number;
  status: "proposed" | "accepted" | "rejected";
  location?: string;
}

export interface OptionCardProps {
  option: ProposedTimeOption;
  onAccept: (optionId: string) => void;
  onFindAnother: (optionId: string) => void;
  isLoading?: boolean;
  participantNames?: string[];
}

/**
 * Format duration as "Xhr Ymin" or just "Ymin" / "Xhr".
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}hr`;
  return `${hours}hr ${mins}min`;
}

/**
 * Format an ISO datetime to a readable time string.
 */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Format an ISO datetime to a readable date string.
 */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * OptionCard displays a single proposed time option from the AI Planner.
 * Shows start/end time, duration, location, participants, and AI explanation.
 * Provides "Accept" and "Find Another Time" action buttons.
 *
 * Validates: Requirements 14.1, 14.2
 */
export function OptionCard({
  option,
  onAccept,
  onFindAnother,
  isLoading = false,
  participantNames,
}: OptionCardProps) {
  const isAccepted = option.status === "accepted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
        isAccepted
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
          : "border-border bg-card hover:border-primary/30"
      }`}
    >
      {/* Date & Time Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {formatDate(option.start)}
          </p>
          <p className="text-lg font-semibold">
            {formatTime(option.start)} – {formatTime(option.end)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/60 text-sm font-medium">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          {formatDuration(option.durationMinutes)}
        </div>
      </div>

      {/* Location */}
      {option.location && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{option.location}</span>
        </div>
      )}

      {/* Participants */}
      {participantNames && participantNames.length > 0 && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{participantNames.join(", ")}</span>
        </div>
      )}

      {/* AI Explanation */}
      {option.explanation && (
        <div className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-gradient-to-r from-[#b8a4d4]/10 to-[#f4b8d0]/10 border border-border/50">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-foreground/80 leading-relaxed">
            {option.explanation}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {option.status === "proposed" && (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => onAccept(option.optionId)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Accept time slot: ${formatTime(option.start)} to ${formatTime(option.end)}`}
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => onFindAnother(option.optionId)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/80 border border-border text-foreground font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Find another time slot"
          >
            <RefreshCw className="w-4 h-4" />
            Find Another Time
          </button>
        </div>
      )}

      {/* Accepted State */}
      {isAccepted && (
        <div className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
          <Check className="w-4 h-4" />
          Time slot accepted
        </div>
      )}
    </motion.div>
  );
}
