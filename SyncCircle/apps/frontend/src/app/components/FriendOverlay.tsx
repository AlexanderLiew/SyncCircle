import { useState, useEffect, useCallback } from "react";
import { Users } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { getFriends } from "../lib/storage";
import type { Friend, TimetableClass } from "../types";

// Distinct overlay colors for friends
const FRIEND_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export interface FreeSlot {
  dayOfWeek: number;
  hour: number;
}

export interface FriendOverlayData {
  friend: Friend;
  color: string;
}

interface FriendOverlayProps {
  userClasses: TimetableClass[];
  onOverlayChange?: (selectedFriends: Friend[]) => void;
}

/**
 * Compute time slots (by hour, Mon-Fri 8-18) where the user AND all selected
 * friends have no classes.
 */
export function computeFreeSlots(
  userClasses: TimetableClass[],
  selectedFriendsTimetables: TimetableClass[][]
): FreeSlot[] {
  const freeSlots: FreeSlot[] = [];

  for (let day = 0; day <= 4; day++) {
    for (let hour = 8; hour <= 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;
      const isUserBusy = isOccupied(userClasses, day, timeStr);
      if (isUserBusy) continue;

      const anyFriendBusy = selectedFriendsTimetables.some((timetable) =>
        isOccupied(timetable, day, timeStr)
      );
      if (anyFriendBusy) continue;

      freeSlots.push({ dayOfWeek: day, hour });
    }
  }

  return freeSlots;
}

/**
 * Check if a given time slot is occupied by any class in the list.
 */
function isOccupied(
  classes: TimetableClass[],
  day: number,
  timeStr: string
): boolean {
  const slotMinutes = parseTime(timeStr);
  return classes.some((cls) => {
    if (cls.dayOfWeek !== day) return false;
    const start = parseTime(cls.startTime);
    const end = parseTime(cls.endTime);
    // The slot hour is occupied if it overlaps [start, end)
    return slotMinutes >= start && slotMinutes < end;
  });
}

/**
 * Parse "HH:mm" to total minutes.
 */
function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Get the assigned overlay color for a friend based on their index.
 */
export function getFriendColor(index: number): string {
  return FRIEND_COLORS[index % FRIEND_COLORS.length];
}

export function FriendOverlay({ userClasses, onOverlayChange }: FriendOverlayProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFriends(getFriends());
  }, []);

  const handleToggle = useCallback(
    (friendId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(friendId)) {
          next.delete(friendId);
        } else {
          next.add(friendId);
        }

        // Notify parent of selection change
        const selected = friends.filter((f) => next.has(f.id));
        onOverlayChange?.(selected);

        return next;
      });
    },
    [friends, onOverlayChange]
  );

  const selectedFriends = friends.filter((f) => selectedIds.has(f.id));
  const selectedTimetables = selectedFriends.map((f) => f.timetable);
  const freeSlots = computeFreeSlots(userClasses, selectedTimetables);

  // Build overlay data for parent consumption
  const overlayData: FriendOverlayData[] = selectedFriends.map((friend, idx) => ({
    friend,
    color: getFriendColor(friends.indexOf(friend)),
  }));

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="px-4 py-2 rounded-xl bg-card border border-border hover:bg-accent transition-all flex items-center gap-2"
            aria-label="Friend Availability"
          >
            <Users className="w-4 h-4" />
            Friend Availability
            {selectedIds.size > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                {selectedIds.size}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <div className="space-y-1">
            <h4 className="font-medium text-sm mb-3">Select Friends</h4>
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No friends added yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map((friend, idx) => (
                  <label
                    key={friend.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(friend.id)}
                      onCheckedChange={() => handleToggle(friend.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getFriendColor(idx) }}
                    />
                    <span className="text-sm truncate">{friend.displayName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {freeSlots.length} free slot{freeSlots.length !== 1 ? "s" : ""} in
                common
              </p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Legend for selected friends */}
      {selectedFriends.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {overlayData.map(({ friend, color }) => (
            <div
              key={friend.id}
              className="flex items-center gap-1.5 text-xs bg-card border border-border rounded-full px-2 py-1"
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{friend.displayName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { FRIEND_COLORS };
export type { FriendOverlayProps };
