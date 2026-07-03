/**
 * Chat Actions Module
 *
 * Parses AI responses for structured action blocks and executes confirmed actions.
 * Supports: ADD_CLASS, FIND_FREE_TIME, SCHEDULE_EVENT
 */

import type { TimetableClass } from '../types';
import { getClasses, saveClass, deleteClass, getFriends, getFriendTimetable } from './storage';
import { apiClient } from './api-client';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionType = 'ADD_CLASS' | 'FIND_FREE_TIME' | 'SCHEDULE_EVENT' | 'DELETE_CLASS' | 'MOVE_CLASS' | 'EXTEND_CLASS';

export interface ChatAction {
  type: ActionType;
  data: any;
  description: string;
}

export interface ParsedResponse {
  text: string;
  actions: ChatAction[];
}

interface AddClassData {
  title: string;
  moduleCode: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4;
  startTime: string;
  endTime: string;
  location?: string;
}

interface FindFreeTimeData {
  friendNames: string[];
}

interface ScheduleEventData {
  title: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4;
  startTime: string;
  endTime: string;
  friendNames: string[];
  location?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const CLASS_COLORS = [
  '#b8a4d4',
  '#f4b8d0',
  '#d4e8f4',
  '#d4f4e8',
  '#fef4d4',
  '#ffd4c8',
];

// ─── Action Block Regex ──────────────────────────────────────────────────────

const ACTION_REGEX = /\[ACTION:(ADD_CLASS|FIND_FREE_TIME|SCHEDULE_EVENT|DELETE_CLASS|MOVE_CLASS|EXTEND_CLASS)\]([\s\S]*?)\[\/ACTION\]/g;

// ─── Parse Actions ───────────────────────────────────────────────────────────

/**
 * Parses an AI response string for action blocks.
 * Returns the cleaned text (with action blocks removed) and extracted actions.
 */
export function parseActions(aiResponse: string): ParsedResponse {
  const actions: ChatAction[] = [];
  let text = aiResponse;

  let match: RegExpExecArray | null;
  // Reset regex state
  ACTION_REGEX.lastIndex = 0;

  while ((match = ACTION_REGEX.exec(aiResponse)) !== null) {
    const type = match[1] as ActionType;
    const jsonStr = match[2].trim();

    try {
      const data = JSON.parse(jsonStr);
      const description = buildDescription(type, data);
      actions.push({ type, data, description });
    } catch {
      // If JSON parsing fails, skip this action block
      console.warn('[chat-actions] Failed to parse action JSON:', jsonStr);
    }

    // Remove the action block from displayed text
    text = text.replace(match[0], '').trim();
  }

  return { text, actions };
}

// ─── Build Human-Readable Descriptions ───────────────────────────────────────

function buildDescription(type: ActionType, data: any): string {
  switch (type) {
    case 'ADD_CLASS': {
      const d = data as AddClassData;
      const day = DAY_NAMES[d.dayOfWeek] ?? 'Unknown day';
      return `Add "${d.title}" (${d.moduleCode}) on ${day} ${d.startTime}–${d.endTime}${d.location ? ` at ${d.location}` : ''}`;
    }
    case 'DELETE_CLASS': {
      const d = data as { title: string; dayOfWeek: number };
      const day = DAY_NAMES[d.dayOfWeek] ?? 'Unknown day';
      return `Delete "${d.title}" on ${day}`;
    }
    case 'MOVE_CLASS': {
      const d = data as { title: string; fromDay: number; toDay: number; newStartTime: string; newEndTime: string };
      return `Move "${d.title}" from ${DAY_NAMES[d.fromDay]} to ${DAY_NAMES[d.toDay]} ${d.newStartTime}–${d.newEndTime}`;
    }
    case 'EXTEND_CLASS': {
      const d = data as { title: string; dayOfWeek: number; newEndTime: string };
      const day = DAY_NAMES[d.dayOfWeek] ?? 'Unknown day';
      return `Extend "${d.title}" on ${day} until ${d.newEndTime}`;
    }
    case 'FIND_FREE_TIME': {
      const d = data as FindFreeTimeData;
      const names = d.friendNames?.join(', ') || 'friends';
      return `Find mutual free time with ${names}`;
    }
    case 'SCHEDULE_EVENT': {
      const d = data as ScheduleEventData;
      const day = DAY_NAMES[d.dayOfWeek] ?? 'Unknown day';
      const names = d.friendNames?.join(', ') || 'friends';
      return `Schedule "${d.title}" on ${day} ${d.startTime}–${d.endTime} with ${names}`;
    }
    default:
      return 'Perform action';
  }
}

// ─── Execute Actions ─────────────────────────────────────────────────────────

/**
 * Executes a confirmed action and returns a result message.
 */
export async function executeAction(action: ChatAction): Promise<string> {
  switch (action.type) {
    case 'ADD_CLASS':
      return executeAddClass(action.data as AddClassData);
    case 'DELETE_CLASS':
      return executeDeleteClass(action.data);
    case 'MOVE_CLASS':
      return executeMoveClass(action.data);
    case 'EXTEND_CLASS':
      return executeExtendClass(action.data);
    case 'FIND_FREE_TIME':
      return executeFindFreeTime(action.data as FindFreeTimeData);
    case 'SCHEDULE_EVENT':
      return executeScheduleEvent(action.data as ScheduleEventData);
    default:
      return 'Unknown action type.';
  }
}

// ─── ADD_CLASS ───────────────────────────────────────────────────────────────

async function executeAddClass(data: AddClassData): Promise<string> {
  const color = CLASS_COLORS[Math.floor(Math.random() * CLASS_COLORS.length)];

  const newClass: TimetableClass = {
    id: crypto.randomUUID(),
    title: data.title,
    moduleCode: data.moduleCode,
    location: data.location || '',
    dayOfWeek: data.dayOfWeek as 0 | 1 | 2 | 3 | 4,
    startTime: data.startTime,
    endTime: data.endTime,
    color,
    source: 'personal',
  };

  // Save to localStorage
  saveClass(newClass);

  // Sync to backend (fire-and-forget)
  try {
    const allClasses = getClasses();
    await apiClient.put('/timetable', { classes: allClasses });
  } catch {
    // Backend sync is best-effort
  }

  const day = DAY_NAMES[data.dayOfWeek] ?? 'Unknown';
  return `✅ Added "${data.title}" (${data.moduleCode}) to your timetable on ${day} ${data.startTime}–${data.endTime}. Your timetable has been updated!`;
}

// ─── FIND_FREE_TIME ──────────────────────────────────────────────────────────

async function executeFindFreeTime(data: FindFreeTimeData): Promise<string> {
  const friends = getFriends();
  const myClasses = getClasses();

  // Match friend names to stored friends
  const matchedFriends = data.friendNames
    .map((name) => {
      const lower = name.toLowerCase();
      return friends.find(
        (f) =>
          f.displayName.toLowerCase().includes(lower) ||
          lower.includes(f.displayName.toLowerCase())
      );
    })
    .filter(Boolean) as typeof friends;

  if (matchedFriends.length === 0) {
    return `❌ Could not find matching friends for: ${data.friendNames.join(', ')}. Make sure they are in your friends list.`;
  }

  // Gather all timetables
  const allTimetables = [myClasses];
  for (const friend of matchedFriends) {
    const friendTimetable = getFriendTimetable(friend.id);
    allTimetables.push(friendTimetable);
  }

  // Find free slots for each day (8:00 - 22:00 in 30-min blocks)
  const freeSlots: string[] = [];

  for (let day = 0; day < 5; day++) {
    const dayClasses = allTimetables.flatMap((t) =>
      t.filter((c) => c.dayOfWeek === day)
    );

    const busyRanges = dayClasses.map((c) => ({
      start: timeToMinutes(c.startTime),
      end: timeToMinutes(c.endTime),
    }));

    // Find gaps between 8:00 (480) and 22:00 (1320)
    const gaps = findGaps(busyRanges, 480, 1320);

    for (const gap of gaps) {
      if (gap.end - gap.start >= 60) {
        freeSlots.push(
          `  • ${DAY_NAMES[day]}: ${minutesToTime(gap.start)}–${minutesToTime(gap.end)}`
        );
      }
    }
  }

  const friendNamesList = matchedFriends.map((f) => f.displayName).join(', ');

  if (freeSlots.length === 0) {
    return `📅 No mutual free time slots of 1 hour or more found with ${friendNamesList} this week. Consider checking different weeks or shorter meeting durations.`;
  }

  return `📅 Mutual free time with ${friendNamesList}:\n\n${freeSlots.join('\n')}\n\nThese are slots of 1+ hour where everyone is available (8am–10pm).`;
}

// ─── SCHEDULE_EVENT ──────────────────────────────────────────────────────────

async function executeScheduleEvent(data: ScheduleEventData): Promise<string> {
  const color = CLASS_COLORS[Math.floor(Math.random() * CLASS_COLORS.length)];

  // Add to user's own timetable
  const newEvent: TimetableClass = {
    id: crypto.randomUUID(),
    title: data.title,
    moduleCode: 'EVENT',
    location: data.location || '',
    dayOfWeek: data.dayOfWeek as 0 | 1 | 2 | 3 | 4,
    startTime: data.startTime,
    endTime: data.endTime,
    color,
    source: 'personal',
  };

  saveClass(newEvent);

  // Sync to backend (fire-and-forget)
  try {
    const allClasses = getClasses();
    await apiClient.put('/timetable', { classes: allClasses });
  } catch {
    // Best-effort
  }

  // Notify friends (toast-based for demo)
  const friends = getFriends();
  const notifiedNames: string[] = [];

  for (const name of data.friendNames) {
    const lower = name.toLowerCase();
    const friend = friends.find(
      (f) =>
        f.displayName.toLowerCase().includes(lower) ||
        lower.includes(f.displayName.toLowerCase())
    );

    if (friend) {
      notifiedNames.push(friend.displayName);
      toast.success(`Email sent to ${friend.displayName}`, {
        description: `Invitation for "${data.title}" on ${DAY_NAMES[data.dayOfWeek]} ${data.startTime}–${data.endTime}`,
      });
    }
  }

  const day = DAY_NAMES[data.dayOfWeek] ?? 'Unknown';
  const notified =
    notifiedNames.length > 0
      ? `\n📧 Notifications sent to: ${notifiedNames.join(', ')}`
      : '';

  return `✅ Scheduled "${data.title}" on ${day} ${data.startTime}–${data.endTime}.${notified}\n\nThe event has been added to your timetable.`;
}

// ─── Time Utilities ──────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

interface TimeRange {
  start: number;
  end: number;
}

function findGaps(busy: TimeRange[], dayStart: number, dayEnd: number): TimeRange[] {
  if (busy.length === 0) {
    return [{ start: dayStart, end: dayEnd }];
  }

  // Sort by start time
  const sorted = [...busy].sort((a, b) => a.start - b.start);

  const gaps: TimeRange[] = [];
  let current = dayStart;

  for (const range of sorted) {
    if (range.start > current) {
      gaps.push({ start: current, end: range.start });
    }
    current = Math.max(current, range.end);
  }

  if (current < dayEnd) {
    gaps.push({ start: current, end: dayEnd });
  }

  return gaps;
}

// ─── DELETE_CLASS ─────────────────────────────────────────────────────────────

async function executeDeleteClass(data: { title: string; dayOfWeek: number }): Promise<string> {
  const classes = getClasses();
  const match = classes.find(
    (c) =>
      c.title.toLowerCase() === data.title.toLowerCase() &&
      c.dayOfWeek === data.dayOfWeek
  );

  if (!match) {
    return `❌ Could not find "${data.title}" on ${DAY_NAMES[data.dayOfWeek]} in your timetable.`;
  }

  deleteClass(match.id);

  // Sync to backend
  try {
    const allClasses = getClasses();
    await apiClient.put('/timetable', { classes: allClasses });
  } catch {}

  return `✅ Deleted "${data.title}" from ${DAY_NAMES[data.dayOfWeek]}. Your timetable has been updated!`;
}

// ─── MOVE_CLASS ──────────────────────────────────────────────────────────────

async function executeMoveClass(data: {
  title: string;
  fromDay: number;
  toDay: number;
  newStartTime: string;
  newEndTime: string;
}): Promise<string> {
  const classes = getClasses();
  const match = classes.find(
    (c) =>
      c.title.toLowerCase() === data.title.toLowerCase() &&
      c.dayOfWeek === data.fromDay
  );

  if (!match) {
    return `❌ Could not find "${data.title}" on ${DAY_NAMES[data.fromDay]} in your timetable.`;
  }

  // Update the class with new day/time
  const updated: TimetableClass = {
    ...match,
    dayOfWeek: data.toDay as 0 | 1 | 2 | 3 | 4,
    startTime: data.newStartTime,
    endTime: data.newEndTime,
  };

  saveClass(updated);

  // Sync to backend
  try {
    const allClasses = getClasses();
    await apiClient.put('/timetable', { classes: allClasses });
  } catch {}

  return `✅ Moved "${data.title}" from ${DAY_NAMES[data.fromDay]} to ${DAY_NAMES[data.toDay]} ${data.newStartTime}–${data.newEndTime}. Your timetable has been updated!`;
}

// ─── EXTEND_CLASS ────────────────────────────────────────────────────────────

async function executeExtendClass(data: {
  title: string;
  dayOfWeek: number;
  newEndTime: string;
}): Promise<string> {
  const classes = getClasses();
  const match = classes.find(
    (c) =>
      c.title.toLowerCase() === data.title.toLowerCase() &&
      c.dayOfWeek === data.dayOfWeek
  );

  if (!match) {
    return `❌ Could not find "${data.title}" on ${DAY_NAMES[data.dayOfWeek]} in your timetable.`;
  }

  const updated: TimetableClass = {
    ...match,
    endTime: data.newEndTime,
  };

  saveClass(updated);

  // Sync to backend
  try {
    const allClasses = getClasses();
    await apiClient.put('/timetable', { classes: allClasses });
  } catch {}

  return `✅ Extended "${data.title}" on ${DAY_NAMES[data.dayOfWeek]} until ${data.newEndTime}. Your timetable has been updated!`;
}
