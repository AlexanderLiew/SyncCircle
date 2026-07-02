import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Search, UserPlus, Check, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useUsersDiscovery } from "../hooks/useUsersDiscovery";
import { useAuth } from "../hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiscoveryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  friendIds: Set<string>;
  pendingRequestUserIds: Set<string>;
  onSendRequest: (userId: string, displayName: string, email: string) => Promise<void>;
}

// ─── Helper: Derive button state ─────────────────────────────────────────────

export type ButtonState = "friends" | "pending" | "default";

export function deriveButtonState(
  userId: string,
  friendIds: Set<string>,
  pendingRequestUserIds: Set<string>
): ButtonState {
  if (friendIds.has(userId)) return "friends";
  if (pendingRequestUserIds.has(userId)) return "pending";
  return "default";
}

// ─── Helper: Filter users by search query ────────────────────────────────────

export function filterUsersBySearch<T extends { displayName: string }>(
  users: T[],
  query: string
): T[] {
  if (!query.trim()) return users;
  const lowerQuery = query.toLowerCase();
  return users.filter((user) =>
    user.displayName.toLowerCase().includes(lowerQuery)
  );
}

// ─── Helper: Exclude current user ───────────────────────────────────────────

export function excludeCurrentUser<T extends { userId: string }>(
  users: T[],
  currentUserId: string
): T[] {
  return users.filter((user) => user.userId !== currentUserId);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DiscoveryPopup({
  isOpen,
  onClose,
  friendIds,
  pendingRequestUserIds,
  onSendRequest,
}: DiscoveryPopupProps) {
  const { users, isLoading, error } = useUsersDiscovery();
  const { user: currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [localPendingIds, setLocalPendingIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setLocalPendingIds(new Set());
    }
  }, [isOpen]);

  // Auto-focus search input when popup opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start before focusing
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter out current user and apply search
  // Filter out current user, existing friends, and apply search
  const currentUserId = currentUser?.userId ?? "";
  const filteredUsers = filterUsersBySearch(
    excludeCurrentUser(users, currentUserId).filter(
      (user) => !friendIds.has(user.userId)
    ),
    searchQuery
  );

  // Combine props pending IDs with locally tracked ones
  const allPendingIds = new Set([...pendingRequestUserIds, ...localPendingIds]);

  // Handle send request
  const handleSendRequest = async (
    userId: string,
    displayName: string,
    email: string
  ) => {
    setSendingIds((prev) => new Set([...prev, userId]));
    try {
      await onSendRequest(userId, displayName, email);
      setLocalPendingIds((prev) => new Set([...prev, userId]));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send friend request"
      );
    } finally {
      setSendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Get initials helper
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 flex flex-col"
            style={{ maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Discover Friends
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Loading users...
                  </span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No users match your search"
                      : "No registered users found"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => {
                    const buttonState = deriveButtonState(
                      user.userId,
                      friendIds,
                      allPendingIds
                    );
                    const isSending = sendingIds.has(user.userId);

                    return (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-semibold text-sm text-primary">
                            {getInitials(user.displayName)}
                          </div>
                          <span className="font-medium text-sm">
                            {user.displayName}
                          </span>
                        </div>

                        {/* Action Button */}
                        {buttonState === "friends" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
                            <Check className="w-3 h-3" />
                            Friends
                          </span>
                        ) : buttonState === "pending" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                            Request Sent
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              handleSendRequest(
                                user.userId,
                                user.displayName,
                                user.email
                              )
                            }
                            disabled={isSending}
                            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <UserPlus className="w-3 h-3" />
                            )}
                            Add Friend
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
