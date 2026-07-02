import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  X,
  Trash2,
  Check,
  XCircle,
  Clock,
  Mail,
  Loader2,
  AlertCircle,
  Inbox,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useFriends } from "../hooks/useFriendsApi";
import { useFriendRequests } from "../hooks/useFriendRequests";
import { useUsersDiscovery } from "../hooks/useUsersDiscovery";
import { DiscoveryPopup } from "../components/DiscoveryPopup";

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    expired: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? colors.pending}`}>
      {status}
    </span>
  );
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-8 gap-3">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Friends() {
  const { friends, isLoading: friendsLoading, error: friendsError, removeFriend } = useFriends();
  const {
    incoming,
    outgoing,
    isLoading: requestsLoading,
    error: requestsError,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
  } = useFriendRequests();
  const { users: discoveryUsers } = useUsersDiscovery();

  // Discovery popup state
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Remove friend confirmation state
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const isLoading = friendsLoading || requestsLoading;

  // Build friendIds set by matching friend displayNames against discovery users
  const friendIdsSet = useMemo(() => {
    const friendNames = new Set(friends.map((f) => f.displayName.toLowerCase()));
    const ids = new Set<string>();
    for (const user of discoveryUsers) {
      if (friendNames.has(user.displayName.toLowerCase())) {
        ids.add(user.userId);
      }
    }
    return ids;
  }, [friends, discoveryUsers]);

  // Build pendingRequestUserIds by matching outgoing recipientEmail against discovery user emails
  const pendingUserIdsSet = useMemo(() => {
    const pendingEmails = new Set(
      outgoing.filter((r) => r.status === "pending").map((r) => r.recipientEmail)
    );
    const ids = new Set<string>();
    for (const user of discoveryUsers) {
      if (pendingEmails.has(user.email)) {
        ids.add(user.userId);
      }
    }
    return ids;
  }, [outgoing, discoveryUsers]);

  // Handler for DiscoveryPopup onSendRequest
  const handleDiscoverySend = async (_userId: string, displayName: string, email: string) => {
    await sendRequest(email, displayName);
    toast.success("Friend request sent successfully!");
  };

  const handleRemoveFriend = async (friendId: string) => {
    setIsRemoving(true);
    try {
      await removeFriend(friendId);
      toast.success("Friend removed");
      setConfirmRemoveId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove friend");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await acceptRequest(requestId);
      toast.success("Friend request accepted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await rejectRequest(requestId);
      toast.success("Friend request rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await cancelRequest(requestId);
      toast.success("Friend request cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request");
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── Utility ─────────────────────────────────────────────────────────────────

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  // Global loading state
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Study Friends</h1>
          <p className="text-muted-foreground">Connect and collaborate with your study buddies</p>
        </motion.div>
        <LoadingSpinner message="Loading your friends..." />
      </div>
    );
  }

  // Global error state
  const globalError = friendsError || requestsError;
  if (globalError && friends.length === 0 && incoming.length === 0 && outgoing.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Study Friends</h1>
          <p className="text-muted-foreground">Connect and collaborate with your study buddies</p>
        </motion.div>
        <div className="bg-card rounded-2xl border border-red-200 dark:border-red-900/50 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">{globalError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Study Friends</h1>
          <p className="text-muted-foreground">
            Connect and collaborate with your study buddies
          </p>
        </div>

        <button
          onClick={() => setShowDiscovery(true)}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
      </motion.div>

      {/* ─── Discovery Popup ───────────────────────────────────────────────── */}
      <DiscoveryPopup
        isOpen={showDiscovery}
        onClose={() => setShowDiscovery(false)}
        friendIds={friendIdsSet}
        pendingRequestUserIds={pendingUserIdsSet}
        onSendRequest={handleDiscoverySend}
      />

      {/* ─── Incoming Requests ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-[#b8a4d4]/10 to-[#f4b8d0]/10 rounded-2xl border border-[#b8a4d4]/30 p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" />
          Incoming Requests
        </h2>

        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending incoming requests</p>
        ) : (
          <div className="space-y-3">
            {incoming.map((req) => (
              <div
                key={req.requestId}
                className="flex items-center justify-between bg-card/60 rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-sm text-primary">
                    {getInitials(req.senderDisplayName)}
                  </div>
                  <div>
                    <p className="font-medium">{req.senderDisplayName}</p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(req.requestId)}
                    disabled={actionLoadingId === req.requestId}
                    className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                    title="Accept"
                  >
                    {actionLoadingId === req.requestId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(req.requestId)}
                    disabled={actionLoadingId === req.requestId}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Sent Requests ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Sent Requests
        </h2>

        {outgoing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sent requests</p>
        ) : (
          <div className="space-y-3">
            {outgoing.map((req) => (
              <div
                key={req.requestId}
                className="flex items-center justify-between bg-background/50 rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{req.recipientEmail}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={req.status} />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                {req.status === "pending" && (
                  <button
                    onClick={() => handleCancel(req.requestId)}
                    disabled={actionLoadingId === req.requestId}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {actionLoadingId === req.requestId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <X className="w-3 h-3" />
                    )}
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Current Friends ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Current Friends
          {friends.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({friends.length})</span>
          )}
        </h2>

        {friends.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No friends yet</h3>
            <p className="text-muted-foreground mb-6">
              Send a friend request to start studying together!
            </p>
            <button
              onClick={() => setShowDiscovery(true)}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add your first friend
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend, index) => (
              <motion.div
                key={friend.friendId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                className="bg-card rounded-2xl border border-border p-6 hover:shadow-xl hover:shadow-primary/5 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-sm text-primary">
                      {getInitials(friend.displayName)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{friend.displayName}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmRemoveId(friend.friendId)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Remove friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ─── Remove Confirmation Dialog ─────────────────────────────────────── */}
      <AnimatePresence>
        {confirmRemoveId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setConfirmRemoveId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full mx-4 shadow-xl"
            >
              <h3 className="text-lg font-semibold mb-2">Remove Friend</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to remove this friend? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmRemoveId(null)}
                  disabled={isRemoving}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveFriend(confirmRemoveId)}
                  disabled={isRemoving}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isRemoving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Remove
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
