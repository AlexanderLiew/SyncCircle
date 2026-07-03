import { motion } from "motion/react";
import { User, Users } from "lucide-react";

export type PlanningMode = "personal" | "group";

interface PlannerModeSelectorProps {
  mode: PlanningMode;
  onModeChange: (mode: PlanningMode) => void;
}

/**
 * Toggle between "Personal" and "Plan with Friends" planning modes.
 * Validates: Requirements 14.5
 */
export function PlannerModeSelector({
  mode,
  onModeChange,
}: PlannerModeSelectorProps) {
  return (
    <div className="flex gap-2 p-1 rounded-xl bg-accent/30 border border-border">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onModeChange("personal")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          mode === "personal"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-accent/50 text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={mode === "personal"}
        aria-label="Personal planning mode"
      >
        <User className="w-4 h-4" />
        Personal
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onModeChange("group")}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          mode === "group"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-accent/50 text-muted-foreground hover:text-foreground"
        }`}
        aria-pressed={mode === "group"}
        aria-label="Plan with Friends mode"
      >
        <Users className="w-4 h-4" />
        Plan with Friends
      </motion.button>
    </div>
  );
}
