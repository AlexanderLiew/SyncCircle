import { motion } from "motion/react";
import { Calendar, Clock, User, Users, Check, X, Loader2 } from "lucide-react";

/** Status of a meeting invitation. */
export type MeetingInvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

/** Meeting invitation record matching backend schema. */
export interface MeetingInvitation {
  invitationId: string;
  planningSessionId: string;
  eventId: string;
  senderUserId: string;
  receiverUserId: string;
  status: MeetingInvitationStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt: string;
}

interface InvitationCardProps {
  invitation: MeetingInvitation;
  /** Event title associated with this invitation */
  eventTitle?: string;
  /** Display name of the user who sent the invitation */
  senderName?: string;
  /** Display names of all participants in the event */
  participants?: string[];
  /** Duration of the event in minutes */
  duration?: number;
  /** Called when the user accepts the invitation */
  onAccept: (invitationId: string) => void;
  /** Called when the user rejects the invitation */
  onReject: (invitationId: string) => void;
  /** Whether an accept/reject action is in progress */
  isLoading?: boolean;
}

/**
 * Displays a meeting invitation with event details and Accept/Reject action buttons.
 * Shows a status badge if the invitation has already been responded to.
 *
 * Validates: Requirements 15.2, 15.3, 15.4
 */
export function InvitationCard({
  invitation,
  eventTitle,
  senderName,
  participants,
  duration,
  onAccept,
  onReject,
  isLoading = false,
}: InvitationCardProps) {
  const isPending = invitation.status === "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      {/* Header: Title + Status badge */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base leading-tight truncate">
          {eventTitle || "Meeting Invitation"}
        </h3>
        {!isPending && <StatusBadge status={invitation.status} />}
      </div>

      {/* Event details */}
      <div className="space-y-1.5 text-sm text-muted-foreground">
        {/* Date/time from the event's creation context */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>{formatDateTime(invitation.createdAt)}</span>
        </div>

        {/* Duration */}
        {duration != null && duration > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatDuration(duration)}</span>
          </div>
        )}

        {/* Sender */}
        {senderName && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 flex-shrink-0" />
            <span>From: {senderName}</span>
          </div>
        )}

        {/* Participants */}
        {participants && participants.length > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {participants.length <= 3
                ? participants.join(", ")
                : `${participants.slice(0, 3).join(", ")} +${participants.length - 3} more`}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons — only shown for pending invitations */}
      {isPending && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onAccept(invitation.invitationId)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Accept invitation"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Accept
          </button>
          <button
            onClick={() => onReject(invitation.invitationId)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors border border-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Reject invitation"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Reject
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MeetingInvitationStatus }) {
  const config: Record<
    Exclude<MeetingInvitationStatus, "pending">,
    { label: string; className: string }
  > = {
    accepted: {
      label: "Accepted",
      className: "bg-green-600/20 text-green-400 border-green-600/30",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-600/20 text-red-400 border-red-600/30",
    },
    expired: {
      label: "Expired",
      className: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  if (status === "pending") return null;

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  );
}

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}
