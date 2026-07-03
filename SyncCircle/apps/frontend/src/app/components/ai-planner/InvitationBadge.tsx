import { motion } from "motion/react";

interface InvitationBadgeProps {
  count: number;
}

/**
 * Notification badge displaying the count of pending meeting invitations.
 * Hidden when count is 0. Shows "9+" for counts exceeding 9.
 *
 * Validates: Requirements 15.1
 */
export function InvitationBadge({ count }: InvitationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 9 ? "9+" : String(count);

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold leading-none"
      aria-label={`${count} pending invitation${count !== 1 ? "s" : ""}`}
    >
      {displayCount}
    </motion.span>
  );
}
