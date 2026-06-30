import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "motion/react";

export type CharacterState = "idle" | "studying" | "celebration";

interface ProfileCharacterProps {
  state?: CharacterState;
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
  onCelebrationComplete,
}: ProfileCharacterProps) {
  const [currentState, setCurrentState] = useState<CharacterState>(state);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setCurrentState(state);

    if (state === "celebration") {
      setShowConfetti(true);

      const timer = setTimeout(() => {
        setShowConfetti(false);
        setCurrentState("idle");
        onCelebrationComplete?.();
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [state, onCelebrationComplete]);

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Confetti burst on celebration */}
      <AnimatePresence>{showConfetti && <CelebrationConfetti />}</AnimatePresence>

      {/* Character body */}
      <motion.div
        className="relative flex flex-col items-center"
        variants={characterVariants}
        animate={currentState}
      >
        {/* Graduation cap */}
        <svg
          width="48"
          height="24"
          viewBox="0 0 48 24"
          fill="none"
          className="relative z-10 -mb-2"
        >
          <polygon points="24,0 48,12 24,18 0,12" fill="#1e293b" />
          <rect x="22" y="0" width="4" height="4" rx="2" fill="#ffd700" />
          <line
            x1="38"
            y1="12"
            x2="40"
            y2="20"
            stroke="#ffd700"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="40" cy="21" r="2" fill="#ffd700" />
        </svg>

        {/* Head / body (round character) */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#ffe0b2] to-[#ffcc80] shadow-lg border-2 border-[#ffb74d] flex items-center justify-center">
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
            {currentState === "celebration" ? (
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
          {/* Left arm */}
          <motion.div
            className="w-4 h-8 rounded-full bg-gradient-to-b from-[#ffe0b2] to-[#ffcc80] border border-[#ffb74d]"
            animate={
              currentState === "studying"
                ? { rotate: [-10, 10, -10], transition: { duration: 1.5, repeat: Infinity } }
                : { rotate: 0 }
            }
            style={{ transformOrigin: "top center" }}
          />
          {/* Right arm - holds book when studying */}
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
          {currentState === "celebration" && (
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
      </motion.p>
    </div>
  );
}
