import { useState } from "react";
import { motion } from "motion/react";
import { Sparkles, Clock, Calendar, Loader2 } from "lucide-react";
import { FriendSelector, type FriendSelectorFriend } from "./FriendSelector";
import type { PlanningMode } from "./PlannerModeSelector";

export interface PlanningRequestData {
  activity: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  participantIds?: string[];
}

interface PlanningRequestFormProps {
  mode: PlanningMode;
  onSubmit: (data: PlanningRequestData) => void;
  isLoading: boolean;
  friends?: FriendSelectorFriend[];
}

/** Format minutes as "X hr Y min" */
function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

/** Get today's date as YYYY-MM-DD */
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Form for creating a planning request: activity, duration, date range,
 * and (in group mode) friend selection.
 * Validates: Requirements 14.5, 14.6
 */
export function PlanningRequestForm({
  mode,
  onSubmit,
  isLoading,
  friends = [],
}: PlanningRequestFormProps) {
  const [activity, setActivity] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [dateRangeStart, setDateRangeStart] = useState(todayISO());
  const [dateRangeEnd, setDateRangeEnd] = useState(todayISO());
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const canSubmit =
    activity.trim().length > 0 &&
    dateRangeStart &&
    dateRangeEnd &&
    dateRangeEnd >= dateRangeStart &&
    (mode === "personal" || selectedFriendIds.length > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    const data: PlanningRequestData = {
      activity: activity.trim(),
      durationMinutes,
      dateRangeStart,
      dateRangeEnd,
    };

    if (mode === "group") {
      data.participantIds = selectedFriendIds;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Activity input */}
      <div className="space-y-1.5">
        <label
          htmlFor="planning-activity"
          className="text-sm font-medium text-foreground"
        >
          Activity
        </label>
        <input
          id="planning-activity"
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="e.g. Study for ML Exam, Group project meeting"
          disabled={isLoading}
          className="w-full px-3 py-2.5 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all disabled:opacity-50"
        />
      </div>

      {/* Duration slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="planning-duration"
            className="text-sm font-medium text-foreground flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Duration
          </label>
          <span className="text-sm font-medium text-primary">
            {formatDuration(durationMinutes)}
          </span>
        </div>
        <input
          id="planning-duration"
          type="range"
          min={15}
          max={480}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          disabled={isLoading}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-accent/50 accent-primary disabled:opacity-50"
          aria-valuemin={15}
          aria-valuemax={480}
          aria-valuenow={durationMinutes}
          aria-valuetext={formatDuration(durationMinutes)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>15 min</span>
          <span>8 hr</span>
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="planning-start-date"
            className="text-sm font-medium text-foreground flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            Start Date
          </label>
          <input
            id="planning-start-date"
            type="date"
            value={dateRangeStart}
            min={todayISO()}
            onChange={(e) => setDateRangeStart(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="planning-end-date"
            className="text-sm font-medium text-foreground flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            End Date
          </label>
          <input
            id="planning-end-date"
            type="date"
            value={dateRangeEnd}
            min={dateRangeStart || todayISO()}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 rounded-lg bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all disabled:opacity-50"
          />
        </div>
      </div>

      {/* Friend selector (group mode only) */}
      {mode === "group" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <FriendSelector
            friends={friends}
            selectedIds={selectedFriendIds}
            onSelectionChange={setSelectedFriendIds}
          />
        </motion.div>
      )}

      {/* Submit button */}
      <motion.button
        type="submit"
        disabled={!canSubmit || isLoading}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Finding times…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {mode === "group" ? "Find Group Times" : "Find Times"}
          </>
        )}
      </motion.button>
    </form>
  );
}
