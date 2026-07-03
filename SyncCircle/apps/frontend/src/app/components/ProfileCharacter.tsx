import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";

export type CharacterState = "idle" | "studying" | "celebration" | "evolving";
export type EvolutionLevel = 1 | 2 | 3 | 4;

export interface EvolutionInfo {
  level: EvolutionLevel;
  title: string;
  streak: number;
  nextLevelAt: number | null;
}

export const EVOLUTION_LEVELS: Record<EvolutionLevel, { title: string; minStreak: number; minMinutes: number }> = {
  1: { title: "Baby", minStreak: 0, minMinutes: 0 },
  2: { title: "Kid", minStreak: 3, minMinutes: 60 },
  3: { title: "Teen", minStreak: 7, minMinutes: 300 },
  4: { title: "Scholar", minStreak: 14, minMinutes: 1000 },
};

export function getEvolutionLevel(streak: number): EvolutionInfo {
  let level: EvolutionLevel = 1;
  if (streak >= 14) level = 4;
  else if (streak >= 7) level = 3;
  else if (streak >= 3) level = 2;
  const nextLevelAt = level < 4 ? EVOLUTION_LEVELS[(level + 1) as EvolutionLevel].minStreak : null;
  return { level, title: EVOLUTION_LEVELS[level].title, streak, nextLevelAt };
}

export function getEvolutionFromMinutes(totalMinutes: number): EvolutionInfo {
  let level: EvolutionLevel = 1;
  if (totalMinutes >= 1000) level = 4;
  else if (totalMinutes >= 300) level = 3;
  else if (totalMinutes >= 60) level = 2;
  const nextLevelAt = level < 4 ? EVOLUTION_LEVELS[(level + 1) as EvolutionLevel].minMinutes : null;
  return { level, title: EVOLUTION_LEVELS[level].title, streak: totalMinutes, nextLevelAt };
}

// ─── Color Palette (user picks one, applies to all stages) ───────────────────

export const CHARACTER_COLORS = [
  "#FFB5A7", // coral/peach
  "#FCD5CE", // light pink
  "#B8E0D2", // mint
  "#D6CFFF", // lavender
  "#95D5F4", // sky blue
  "#FDE68A", // warm yellow
  "#A7F3D0", // seafoam
  "#E9D5FF", // lilac
  "#FECACA", // blush
  "#CBD5E1", // slate
];

const CHAR_COLOR_KEY = "synccircle_char_color";

export function getCharColor(): string {
  try {
    return localStorage.getItem(CHAR_COLOR_KEY) || CHARACTER_COLORS[0];
  } catch { return CHARACTER_COLORS[0]; }
}

export function setCharColor(color: string): void {
  localStorage.setItem(CHAR_COLOR_KEY, color);
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const idleVariants: Variants = {
  idle: {
    y: [-2, 2, -2],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
};

const studyingVariants: Variants = {
  studying: {
    rotate: [-2, 2, -2],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
};

const celebrationVariants: Variants = {
  celebration: {
    y: [0, -20, 0],
    scale: [1, 1.1, 1],
    transition: { type: "spring", stiffness: 300, damping: 12 },
  },
};

// ─── Confetti ────────────────────────────────────────────────────────────────

function CelebrationConfetti() {
  const colors = ["#FFB5A7", "#D6CFFF", "#FDE68A", "#A7F3D0", "#95D5F4", "#FECACA"];
  const pieces = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: (i - 5) * 14 + Math.random() * 8,
    color: colors[i % colors.length],
    delay: Math.random() * 0.15,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ width: 6, height: 6, backgroundColor: p.color, left: "50%", top: "50%" }}
          initial={{ opacity: 1, x: 0, y: 0 }}
          animate={{ opacity: [1, 1, 0], x: p.x, y: [-10, -40, 30], scale: [0, 1, 0.4] }}
          transition={{ duration: 0.9, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ─── Stage Renderers (SVG) ───────────────────────────────────────────────────

function BabyStage({ color }: { color: string }) {
  // Round toddler blob with big eyes, tiny arms, sitting
  return (
    <svg viewBox="0 0 100 120" width="100%" height="100%">
      {/* Body — round */}
      <ellipse cx="50" cy="70" rx="28" ry="30" fill={color} />
      {/* Head — big relative to body */}
      <circle cx="50" cy="38" r="24" fill={color} />
      {/* Cheeks */}
      <circle cx="38" cy="44" r="5" fill="#ff9999" opacity="0.4" />
      <circle cx="62" cy="44" r="5" fill="#ff9999" opacity="0.4" />
      {/* Eyes — big and round */}
      <circle cx="42" cy="36" r="5" fill="#2d2d2d" />
      <circle cx="58" cy="36" r="5" fill="#2d2d2d" />
      <circle cx="44" cy="34" r="2" fill="white" />
      <circle cx="60" cy="34" r="2" fill="white" />
      {/* Tiny smile */}
      <path d="M44 48 Q50 54 56 48" fill="none" stroke="#c07070" strokeWidth="2" strokeLinecap="round" />
      {/* Tiny arms */}
      <ellipse cx="26" cy="68" rx="6" ry="8" fill={color} opacity="0.9" />
      <ellipse cx="74" cy="68" rx="6" ry="8" fill={color} opacity="0.9" />
      {/* Pacifier/dummy */}
      <circle cx="50" cy="52" r="3" fill="#ffcc80" stroke="#e6a040" strokeWidth="1" />
    </svg>
  );
}

function KidStage({ color }: { color: string }) {
  // Small human with legs, backpack, energetic
  return (
    <svg viewBox="0 0 100 140" width="100%" height="100%">
      {/* Legs */}
      <rect x="38" y="105" width="9" height="22" rx="4" fill={color} opacity="0.85" />
      <rect x="53" y="105" width="9" height="22" rx="4" fill={color} opacity="0.85" />
      {/* Shoes */}
      <ellipse cx="42" cy="128" rx="7" ry="4" fill="#5a5a5a" />
      <ellipse cx="58" cy="128" rx="7" ry="4" fill="#5a5a5a" />
      {/* Body */}
      <rect x="34" y="65" width="32" height="42" rx="14" fill={color} />
      {/* Backpack */}
      <rect x="58" y="70" width="12" height="20" rx="5" fill="#ff9966" opacity="0.8" />
      <rect x="60" y="74" width="8" height="4" rx="2" fill="#cc6633" opacity="0.6" />
      {/* Arms */}
      <rect x="24" y="72" width="10" height="24" rx="5" fill={color} opacity="0.9" />
      <rect x="66" y="72" width="10" height="24" rx="5" fill={color} opacity="0.9" />
      {/* Head */}
      <circle cx="50" cy="48" r="22" fill={color} />
      {/* Hair tuft */}
      <path d="M40 30 Q50 20 60 30" fill={color} stroke="#555" strokeWidth="2" opacity="0.4" />
      {/* Eyes */}
      <circle cx="42" cy="46" r="4" fill="#2d2d2d" />
      <circle cx="58" cy="46" r="4" fill="#2d2d2d" />
      <circle cx="43.5" cy="44.5" r="1.5" fill="white" />
      <circle cx="59.5" cy="44.5" r="1.5" fill="white" />
      {/* Smile */}
      <path d="M42 56 Q50 62 58 56" fill="none" stroke="#c07070" strokeWidth="2" strokeLinecap="round" />
      {/* Cheeks */}
      <circle cx="35" cy="52" r="4" fill="#ff9999" opacity="0.3" />
      <circle cx="65" cy="52" r="4" fill="#ff9999" opacity="0.3" />
    </svg>
  );
}

function TeenStage({ color }: { color: string }) {
  // Taller, holds a book, more detailed
  return (
    <svg viewBox="0 0 100 160" width="100%" height="100%">
      {/* Legs */}
      <rect x="37" y="115" width="10" height="30" rx="5" fill={color} opacity="0.85" />
      <rect x="53" y="115" width="10" height="30" rx="5" fill={color} opacity="0.85" />
      {/* Shoes */}
      <ellipse cx="42" cy="146" rx="8" ry="5" fill="#4a4a4a" />
      <ellipse cx="58" cy="146" rx="8" ry="5" fill="#4a4a4a" />
      {/* Body */}
      <rect x="33" y="60" width="34" height="58" rx="14" fill={color} />
      {/* Arms */}
      <rect x="22" y="66" width="11" height="30" rx="5" fill={color} opacity="0.9" />
      <rect x="67" y="66" width="11" height="30" rx="5" fill={color} opacity="0.9" />
      {/* Book in left hand */}
      <rect x="14" y="90" width="18" height="14" rx="2" fill="#6366f1" />
      <rect x="22" y="90" width="2" height="14" rx="1" fill="#4f46e5" />
      {/* Head */}
      <circle cx="50" cy="42" r="22" fill={color} />
      {/* Eyes — slightly more mature */}
      <ellipse cx="42" cy="40" rx="3.5" ry="4" fill="#2d2d2d" />
      <ellipse cx="58" cy="40" rx="3.5" ry="4" fill="#2d2d2d" />
      <circle cx="43" cy="38.5" r="1.5" fill="white" />
      <circle cx="59" cy="38.5" r="1.5" fill="white" />
      {/* Slight smile */}
      <path d="M44 50 Q50 55 56 50" fill="none" stroke="#a06060" strokeWidth="1.8" strokeLinecap="round" />
      {/* Headphones */}
      <path d="M30 34 Q30 18 50 18 Q70 18 70 34" fill="none" stroke="#555" strokeWidth="3" strokeLinecap="round" />
      <rect x="26" y="32" width="8" height="10" rx="4" fill="#555" />
      <rect x="66" y="32" width="8" height="10" rx="4" fill="#555" />
    </svg>
  );
}

function ScholarStage({ color }: { color: string }) {
  // Full adult scholar — confident, stack of books, graduation cap
  return (
    <svg viewBox="0 0 100 170" width="100%" height="100%">
      {/* Legs */}
      <rect x="36" y="125" width="11" height="32" rx="5" fill={color} opacity="0.85" />
      <rect x="53" y="125" width="11" height="32" rx="5" fill={color} opacity="0.85" />
      {/* Shoes */}
      <ellipse cx="41" cy="158" rx="9" ry="5" fill="#3a3a3a" />
      <ellipse cx="59" cy="158" rx="9" ry="5" fill="#3a3a3a" />
      {/* Body */}
      <rect x="32" y="58" width="36" height="70" rx="14" fill={color} />
      {/* Collar / coat detail */}
      <path d="M40 60 L50 70 L60 60" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />
      {/* Arms */}
      <rect x="20" y="64" width="12" height="34" rx="6" fill={color} opacity="0.9" />
      <rect x="68" y="64" width="12" height="34" rx="6" fill={color} opacity="0.9" />
      {/* Stack of books in arm */}
      <rect x="10" y="92" width="20" height="6" rx="1.5" fill="#ef4444" />
      <rect x="11" y="86" width="18" height="6" rx="1.5" fill="#3b82f6" />
      <rect x="12" y="80" width="16" height="6" rx="1.5" fill="#22c55e" />
      {/* Head */}
      <circle cx="50" cy="40" r="22" fill={color} />
      {/* Graduation cap */}
      <polygon points="50,10 80,22 50,28 20,22" fill="#1e293b" />
      <rect x="48" y="8" width="4" height="4" rx="2" fill="#ffd700" />
      <line x1="72" y1="22" x2="74" y2="32" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="74" cy="33" r="2" fill="#ffd700" />
      {/* Glasses */}
      <circle cx="42" cy="38" r="6" fill="none" stroke="#444" strokeWidth="1.5" />
      <circle cx="58" cy="38" r="6" fill="none" stroke="#444" strokeWidth="1.5" />
      <line x1="48" y1="38" x2="52" y2="38" stroke="#444" strokeWidth="1.5" />
      {/* Eyes behind glasses */}
      <circle cx="42" cy="38" r="2.5" fill="#2d2d2d" />
      <circle cx="58" cy="38" r="2.5" fill="#2d2d2d" />
      {/* Confident smile */}
      <path d="M43 49 Q50 55 57 49" fill="none" stroke="#a06060" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface ProfileCharacterProps {
  state?: CharacterState;
  level?: EvolutionLevel;
  size?: "sm" | "md" | "lg";
  onCelebrationComplete?: () => void;
}

export function ProfileCharacter({
  state = "idle",
  level = 1,
  size = "lg",
  onCelebrationComplete,
}: ProfileCharacterProps) {
  const [currentState, setCurrentState] = useState<CharacterState>(state);
  const [showConfetti, setShowConfetti] = useState(false);
  const color = getCharColor();

  useEffect(() => {
    setCurrentState(state);
    if (state === "celebration" || state === "evolving") {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        setCurrentState("idle");
        onCelebrationComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state, onCelebrationComplete]);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-48 h-48",
  };

  const variants = currentState === "studying" ? studyingVariants
    : currentState === "celebration" || currentState === "evolving" ? celebrationVariants
    : idleVariants;

  const StageComponent = level === 4 ? ScholarStage
    : level === 3 ? TeenStage
    : level === 2 ? KidStage
    : BabyStage;

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
      <AnimatePresence>{showConfetti && <CelebrationConfetti />}</AnimatePresence>
      <motion.div
        className="w-full h-full"
        variants={variants}
        animate={currentState}
      >
        <StageComponent color={color} />
      </motion.div>
    </div>
  );
}
