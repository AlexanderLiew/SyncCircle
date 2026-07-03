import { motion } from "motion/react";

interface SyncCircleLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export function SyncCircleLogo({ className = "", size = 24, animate = true }: SyncCircleLogoProps) {
  const Wrapper = animate ? motion.svg : "svg";
  const Circle = animate ? motion.circle : "circle";

  return (
    <Wrapper
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      {...(animate && {
        whileHover: { rotate: 15 },
        transition: { type: "spring", stiffness: 200 },
      })}
    >
      {/* Purple circle (left) */}
      <Circle
        cx="38"
        cy="50"
        r="28"
        fill="none"
        stroke="#9b7bc8"
        strokeWidth="7"
        strokeLinecap="round"
        {...(animate && {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 0.8, ease: "easeOut" },
        })}
      />
      {/* Pink circle (right, overlapping) */}
      <Circle
        cx="62"
        cy="50"
        r="24"
        fill="none"
        stroke="#e87ba8"
        strokeWidth="6"
        strokeLinecap="round"
        {...(animate && {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 0.8, delay: 0.2, ease: "easeOut" },
        })}
      />
      {/* Soft glow in overlap area */}
      <ellipse
        cx="50"
        cy="50"
        rx="10"
        ry="20"
        fill="url(#overlapGradient)"
        opacity="0.3"
      />
      {/* Accent dots that float */}
      <Circle
        cx="56"
        cy="18"
        r="3"
        fill="#b8a4d4"
        opacity="0.7"
        {...(animate && {
          animate: { y: [0, -2, 0], opacity: [0.7, 1, 0.7] },
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        })}
      />
      <Circle
        cx="64"
        cy="24"
        r="4.5"
        fill="#f4b8d0"
        opacity="0.6"
        {...(animate && {
          animate: { y: [0, -3, 0], opacity: [0.6, 0.9, 0.6] },
          transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
        })}
      />
      {/* Gradient definition */}
      <defs>
        <radialGradient id="overlapGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4a0c8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#d4a0c8" stopOpacity="0" />
        </radialGradient>
      </defs>
    </Wrapper>
  );
}
