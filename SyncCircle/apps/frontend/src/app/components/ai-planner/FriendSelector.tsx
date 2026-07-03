import { motion } from "motion/react";
import { Users, AlertCircle } from "lucide-react";

export interface FriendSelectorFriend {
  friendId: string;
  displayName: string;
}

interface FriendSelectorProps {
  friends: FriendSelectorFriend[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const MAX_SELECTIONS = 10;

/**
 * Checkbox list of active friends for group planning participant selection.
 * Max 10 selections enforced.
 * Validates: Requirements 14.6
 */
export function FriendSelector({
  friends,
  selectedIds,
  onSelectionChange,
}: FriendSelectorProps) {
  const handleToggle = (friendId: string) => {
    if (selectedIds.includes(friendId)) {
      onSelectionChange(selectedIds.filter((id) => id !== friendId));
    } else if (selectedIds.length < MAX_SELECTIONS) {
      onSelectionChange([...selectedIds, friendId]);
    }
  };

  const atLimit = selectedIds.length >= MAX_SELECTIONS;

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Users className="w-8 h-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No friends found. Add friends to plan together.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Select Friends
        </label>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length}/{MAX_SELECTIONS} selected
        </span>
      </div>

      {atLimit && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Maximum {MAX_SELECTIONS} participants reached
        </div>
      )}

      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-accent/20 divide-y divide-border">
        {friends.map((friend) => {
          const isSelected = selectedIds.includes(friend.friendId);
          const isDisabled = !isSelected && atLimit;

          return (
            <motion.label
              key={friend.friendId}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                isSelected
                  ? "bg-primary/10"
                  : isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-accent/50"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => handleToggle(friend.friendId)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-ring/20"
                aria-label={`Select ${friend.displayName}`}
              />
              <span className="text-sm text-foreground">
                {friend.displayName}
              </span>
            </motion.label>
          );
        })}
      </div>
    </div>
  );
}
