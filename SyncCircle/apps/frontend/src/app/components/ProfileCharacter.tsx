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

export const EVOLUTION_LEVELS: Record<EvolutionLevel, { title: string; minStreak: number }> = {
  1: { title: "Freshman", minStreak: 0 },
  2: { title: "Scholar", minStreak: 3 },
  3: { title: "Master", minStreak: 7 },
  4: { title: "Legend", minStreak: 14 },
};

export function getEvolutionLevel(streak: number): EvolutionInfo {
  let level: EvolutionLevel = 1;
  if (streak >= 14) level = 4;
  else if (streak >= 7) level = 3;
  else if (streak >= 3) level = 2;

  const nextLevelAt = level < 4 ? EVOLUTION_LEVELS[(level + 1) as EvolutionLevel].minStreak : null;

  return {
    level,
    title: EVOLUTION_LEVELS[level].title,
    streak,
    nextLevelAt,
  };
}

interface ProfileCharacterProps {
  state?: CharacterState;
  level?: EvolutionLevel;
  onCelebrationComplete?: () => void;
}

const characterVariants: Variants = {
  idle: {
    scale: [0.98, 1.02, 0.98],
    y: [-3, 3, -3],
    rotate: 0,
    transition: {
      scale: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
      y: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      },
      rotate: {
        duration: 0.3,
      },
    },
  },
  studying: {
    scale: 1,
    y: 0,
    rotate: [-5, 5, -3, 4, -5],
    transition: {
      rotate: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
      scale: {
        duration: 0.3,
      },
      y: {
        duration: 0.3,
      },
    },
  },
  celebration: {
    scale: [1, 1.1, 1],
    y: [0, -30, 0],
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      duration: 0.8,
    },
  },
};

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
}

function CelebrationConfetti() {
  const colors = ["#b8a4d4", "#f4b8d0", "#ffd700", "#4ade80", "#60a5fa", "#f97316"];
  const pieces: ConfettiPiece[] = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (i - 6) * 15 + Math.random() * 10,
    color: colors[i % colors.length],
    delay: Math.random() * 0.2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute rounded-full"
          style={{
            width: 8,
            height: 8,
            backgroundColor: piece.color,
            left: "50%",
            top: "50%",
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{
            opacity: [1, 1, 0],
            x: piece.x,
            y: [-20, -50 - Math.random() * 30, 40],
            scale: [0, 1.2, 0.5],
          }}
          transition={{
            duration: 1,
            delay: piece.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export function ProfileCharacter({
  state = "idle",
  level = 1,
  onCelebrationComplete,
}: ProfileCharacterProps) {
  const [currentState, setCurrentState] = useState<CharacterState>(state);
  const [showConfetti, setShowConfetti] = useState(false);

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

  // Evolution visual properties
  const glowColor = level === 4 ? '#ffd700' : level === 3 ? '#b388ff' : level === 2 ? '#60a5fa' : 'transparent';
  const hasAura = level >= 2;
  const hasCrown = level === 4;
  const hasWings = level >= 3;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Evolution aura glow */}
      {hasAura && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: level === 4 ? 160 : level === 3 ? 140 : 120,
            height: level === 4 ? 160 : level === 3 ? 140 : 120,
            background: `radial-gradient(circle, ${glowColor}30 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Confetti burst on celebration */}
      <AnimatePresence>{showConfetti && <CelebrationConfetti />}</AnimatePresence>

      {/* Character body */}
      <motion.div
        className="relative flex flex-col items-center"
        variants={characterVariants}
        animate={currentState === "evolving" ? "celebration" : currentState}
      >
        {/* Crown for Legend level */}
        {hasCrown ? (
          <svg
            width="48"
            height="24"
            viewBox="0 0 48 24"
            fill="none"
            className="relative z-10 -mb-2"
          >
            <path d="M4 20 L10 8 L18 14 L24 2 L30 14 L38 8 L44 20 Z" fill="#ffd700" stroke="#e6b800" strokeWidth="1" />
            <circle cx="10" cy="8" r="2.5" fill="#ff4444" />
            <circle cx="24" cy="2" r="2.5" fill="#4488ff" />
            <circle cx="38" cy="8" r="2.5" fill="#44ff44" />
            <rect x="4" y="18" width="40" height="4" rx="1" fill="#ffd700" stroke="#e6b800" strokeWidth="0.5" />
          </svg>
        ) : (
          /* Graduation cap for non-Legend */
          <svg
            width="48"
            height="24"
            viewBox="0 0 48 24"
            fill="none"
            className="relative z-10 -mb-2"
          >
            <polygon points="24,0 48,12 24,18 0,12" fill="#1e293b" />
            <rect x="22" y="0" width="4" height="4" rx="2" fill="#ffd700" />
            <line x1="38" y1="12" x2="40" y2="20" stroke="#ffd700" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="40" cy="21" r="2" fill="#ffd700" />
          </svg>
        )}

        {/* Wings for Master+ */}
        {hasWings && (
          <>
            <motion.div
              className="absolute top-10 -left-6 z-0"
              animate={{ rotate: [-5, 5, -5], y: [-2, 2, -2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
                <path d="M28 20 Q20 5 8 0 Q0 10 4 20 Q0 30 8 40 Q20 35 28 20Z" fill={level === 4 ? '#ffd70060' : '#b388ff40'} stroke={level === 4 ? '#ffd700' : '#b388ff'} strokeWidth="1" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute top-10 -right-6 z-0"
              animate={{ rotate: [5, -5, 5], y: [-2, 2, -2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
                <path d="M0 20 Q8 5 20 0 Q28 10 24 20 Q28 30 20 40 Q8 35 0 20Z" fill={level === 4 ? '#ffd70060' : '#b388ff40'} stroke={level === 4 ? '#ffd700' : '#b388ff'} strokeWidth="1" />
              </svg>
            </motion.div>
          </>
        )}

        {/* Head / body (round character) */}
        <div
          className="relative w-24 h-24 rounded-full shadow-lg flex items-center justify-center"
          style={{
            background: level === 4
              ? 'linear-gradient(135deg, #fff3b0, #ffd700)'
              : level === 3
              ? 'linear-gradient(135deg, #e8d5f5, #d4a8f5)'
              : level === 2
              ? 'linear-gradient(135deg, #d4e8f4, #a8d4f0)'
              : 'linear-gradient(135deg, #ffe0b2, #ffcc80)',
            border: `2px solid ${level === 4 ? '#e6b800' : level === 3 ? '#b388ff' : level === 2 ? '#60a5fa' : '#ffb74d'}`,
            boxShadow: hasAura ? `0 0 20px ${glowColor}40` : undefined,
          }}
        >
          {/* Eyes */}
          <div className="flex gap-3 -mt-1">
            <motion.div
              className="w-3 h-3 rounded-full bg-[#3d2c1e]"
              animate={
                currentState === "studying"
                  ? { scaleY: [1, 0.3, 1], transition: { duration: 2, repeat: Infinity } }
                  : { scaleY: 1 }
              }
            />
            <motion.div
              className="w-3 h-3 rounded-full bg-[#3d2c1e]"
              animate={
                currentState === "studying"
                  ? { scaleY: [1, 0.3, 1], transition: { duration: 2, repeat: Infinity, delay: 0.1 } }
                  : { scaleY: 1 }
              }
            />
          </div>

          {/* Mouth */}
          <div className="absolute bottom-5">
            {currentState === "celebration" || currentState === "evolving" ? (
              <div className="w-5 h-3 rounded-b-full bg-[#e57373] border-t border-[#c62828]" />
            ) : (
              <div className="w-4 h-2 rounded-b-full border-b-2 border-[#5d4037]" />
            )}
          </div>

          {/* Blush */}
          <div className="absolute bottom-7 left-3 w-3 h-2 rounded-full bg-[#ffcdd2] opacity-60" />
          <div className="absolute bottom-7 right-3 w-3 h-2 rounded-full bg-[#ffcdd2] opacity-60" />
        </div>

        {/* Arms */}
        <div className="absolute top-14 w-32 flex justify-between">
          <motion.div
            className="w-4 h-8 rounded-full bg-gradient-to-b from-[#ffe0b2] to-[#ffcc80] border border-[#ffb74d]"
            animate={
              currentState === "studying"
                ? { rotate: [-10, 10, -10], transition: { duration: 1.5, repeat: Infinity } }
                : { rotate: 0 }
            }
            style={{ transformOrigin: "top center" }}
          />
          <motion.div
            className="w-4 h-8 rounded-full bg-gradient-to-b from-[#ffe0b2] to-[#ffcc80] border border-[#ffb74d]"
            animate={
              currentState === "studying"
                ? { rotate: [5, -5, 5], transition: { duration: 1.2, repeat: Infinity } }
                : { rotate: 0 }
            }
            style={{ transformOrigin: "top center" }}
          />
        </div>

        {/* Book (visible during studying) */}
        <AnimatePresence>
          {currentState === "studying" && (
            <motion.div
              className="absolute bottom-0 w-10 h-7 bg-gradient-to-r from-[#7c4dff] to-[#b388ff] rounded-sm shadow-md flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <div className="w-0.5 h-5 bg-white/40" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stars around character during celebration */}
        <AnimatePresence>
          {(currentState === "celebration" || currentState === "evolving") && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute text-lg"
                  style={{
                    top: -10 + i * 10,
                    left: i === 1 ? -20 : i === 0 ? 30 : 40,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], y: -15 }}
                  transition={{ duration: 0.8, delay: i * 0.15 }}
                >
                  ⭐
                </motion.span>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Level badge */}
        <motion.div
          className="absolute -top-1 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md z-20"
          style={{
            backgroundColor: level === 4 ? '#ffd700' : level === 3 ? '#b388ff' : level === 2 ? '#60a5fa' : '#e0e0e0',
            color: level >= 3 ? '#fff' : '#333',
          }}
        >
          {level}
        </motion.div>
      </motion.div>

      {/* State label */}
      <motion.p
        className="absolute -bottom-2 text-xs text-muted-foreground font-medium capitalize"
        key={currentState}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {currentState === "idle" && "Chilling... 📚"}
        {currentState === "studying" && "Studying hard! ✏️"}
        {currentState === "celebration" && "Yay! 🎉"}
        {currentState === "evolving" && "Evolving! ✨"}
      </motion.p>
    </div>
  );
}
