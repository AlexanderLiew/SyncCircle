import { useState, useCallback } from 'react';
import type { ChatMessage, TimetableClass, Task, UserSettings, Friend } from '../types';
import { getClasses, getTasks, getSettings, getFriends, getFriendTimetable } from '../lib/storage';

// --- Types ---

export interface UserContext {
  timetable: TimetableClass[];
  tasks: Task[];
  aiPreferences: UserSettings['aiPreferences'];
  friends: Friend[];
}

interface APIResult<T> {
  data?: T;
  error?: string;
}

export interface UseKiroAPIReturn {
  summarizeNote: (content: string) => Promise<APIResult<{ summary: string }>>;
  chatMessage: (
    message: string,
    history: ChatMessage[],
    context: UserContext
  ) => Promise<APIResult<{ response: string }>>;
  isLoading: boolean;
  error: string | null;
}

// --- API Base URL ---

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_KIRO_API_URL) ||
  '';

/** Groq API key from environment (for AI chatbot). */
const GROQ_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GROQ_API_KEY) ||
  '';

const GROQ_MODEL = 'llama-3.3-70b-versatile';

// --- Core fetch wrapper with AbortController timeout ---

async function callKiroAPI<T>(
  endpoint: string,
  payload: unknown,
  timeoutMs: number
): Promise<APIResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { error: 'Something went wrong. Please try again.' };
    }
    return { data: await res.json() };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }
    return { error: 'Unable to connect. Please check your connection.' };
  }
}

/**
 * Calls Groq API for chat (OpenAI-compatible format).
 */
async function callGroqChat(
  message: string,
  history: ChatMessage[],
  context: UserContext,
  timeoutMs: number
): Promise<APIResult<{ response: string }>> {
  if (!GROQ_API_KEY) {
    return { error: 'Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Build context-aware system instruction
  const timetableInfo = context.timetable.length > 0
    ? `User's current timetable:\n${context.timetable.map(c => `- ${c.title} (${c.moduleCode}) on ${['Monday','Tuesday','Wednesday','Thursday','Friday'][c.dayOfWeek]} ${c.startTime}-${c.endTime}${c.location ? ' at ' + c.location : ''}`).join('\n')}`
    : 'User has no timetable classes set up.';

  // Build friends' timetable info
  const DAY_NAMES_SYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let friendsInfo = '';
  if (context.friends && context.friends.length > 0) {
    const friendEntries: string[] = [];
    for (const friend of context.friends) {
      const friendTimetable = friend.timetable ?? getFriendTimetable(friend.id);
      if (friendTimetable.length > 0) {
        const classes = friendTimetable.map(c => 
          `    - ${c.title} (${c.moduleCode}) on ${DAY_NAMES_SYS[c.dayOfWeek]} ${c.startTime}-${c.endTime}`
        ).join('\n');
        friendEntries.push(`  ${friend.displayName} (ID: ${friend.id}):\n${classes}`);
      } else {
        friendEntries.push(`  ${friend.displayName} (ID: ${friend.id}): No timetable data available`);
      }
    }
    friendsInfo = `\nFriends and their timetables:\n${friendEntries.join('\n')}`;
  } else {
    friendsInfo = '\nUser has no friends added yet.';
  }
  let freeTimeInfo = '';
  if (context.timetable.length > 0) {
    const freeSlots: string[] = [];
    for (let day = 0; day < 5; day++) {
      const dayClasses = context.timetable
        .filter(c => c.dayOfWeek === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      const busy = dayClasses.map(c => ({
        start: c.startTime,
        end: c.endTime,
        title: c.title,
      }));

      // Find gaps between 08:00 and 22:00
      const gaps: string[] = [];
      let cursor = '08:00';
      for (const slot of busy) {
        if (slot.start > cursor) {
          gaps.push(`${cursor}-${slot.start}`);
        }
        if (slot.end > cursor) cursor = slot.end;
      }
      if (cursor < '22:00') gaps.push(`${cursor}-22:00`);

      if (gaps.length > 0) {
        freeSlots.push(`  ${DAY_NAMES_SYS[day]}: ${gaps.join(', ')}`);
      } else {
        freeSlots.push(`  ${DAY_NAMES_SYS[day]}: Fully booked`);
      }
    }
    freeTimeInfo = `\nUser's FREE time slots (available hours 08:00-22:00):\n${freeSlots.join('\n')}`;
  }

  const taskInfo = context.tasks.length > 0
    ? `User's tasks: ${context.tasks.slice(0, 10).map(t => t.title).join(', ')}`
    : 'User has no tasks.';

  const systemMessage = [
    'You are an AI study planner assistant for SyncCircle, a student scheduling app.',
    'Help users with scheduling, study plans, time management, and break suggestions.',
    'Be concise, friendly, and practical.',
    '',
    '── CONFLICT DETECTION (CRITICAL) ──',
    'You MUST check the user\'s timetable before proposing to add any class or event.',
    'If the requested time slot OVERLAPS with an existing class (even partially), you MUST:',
    '1. WARN the user about the conflict (e.g. "⚠️ You already have [Class] on [Day] [Time] which conflicts with this.")',
    '2. DO NOT output an [ACTION] block for conflicting slots',
    '3. SUGGEST alternative free slots from the same day or nearby days',
    '4. Ask "Would you like one of these times instead?" or "Do you still want to add it despite the conflict?"',
    '',
    'Two time ranges conflict if: startA < endB AND startB < endA',
    'Example: If user has "OS 10:00-12:00 on Wed" and asks to add something at "10:30-11:30 on Wed" → CONFLICT.',
    '',
    'Only output the [ACTION] block if:',
    '- The time slot is FREE (no overlap with existing classes), OR',
    '- The user explicitly says "add it anyway" despite the conflict',
    '',
    '── ACTIONS ──',
    'You can perform actions on the user\'s timetable. When the user wants to:',
    '1. ADD A CLASS: Check for conflicts first! If clear, confirm and output:',
    '   [ACTION:ADD_CLASS]{"title":"...","moduleCode":"...","dayOfWeek":N,"startTime":"HH:mm","endTime":"HH:mm","location":""}[/ACTION]',
    '',
    '2. DELETE A CLASS: When user wants to remove a class, confirm which one and output:',
    '   [ACTION:DELETE_CLASS]{"title":"...","dayOfWeek":N}[/ACTION]',
    '',
    '3. MOVE A CLASS: When user wants to reschedule/move a class to a different time, output:',
    '   [ACTION:MOVE_CLASS]{"title":"...","fromDay":N,"toDay":N,"newStartTime":"HH:mm","newEndTime":"HH:mm"}[/ACTION]',
    '   This deletes from old slot and adds to new slot.',
    '',
    '4. EXTEND A CLASS: When user wants to make a class longer (change end time), output:',
    '   [ACTION:EXTEND_CLASS]{"title":"...","dayOfWeek":N,"newEndTime":"HH:mm"}[/ACTION]',
    '',
    '5. FIND FREE TIME WITH FRIENDS: When user asks about mutual availability, output:',
    '   [ACTION:FIND_FREE_TIME]{"friendNames":["Alice","Bob"]}[/ACTION]',
    '',
    '6. SCHEDULE A GROUP EVENT: Check for conflicts (for user AND friends) first! If clear, output:',
    '   [ACTION:SCHEDULE_EVENT]{"title":"...","dayOfWeek":N,"startTime":"HH:mm","endTime":"HH:mm","friendNames":["..."],"location":""}[/ACTION]',
    '',
    '── RESCHEDULING RULES ──',
    'When a user says "move X to Y" or "change X from this time to that time":',
    '- Ask: "Would you like me to move it (delete old + add new) or keep both?"',
    '- If they say move: use MOVE_CLASS action',
    '- If they say keep both: use ADD_CLASS for the new slot',
    '- If they say extend: use EXTEND_CLASS to change the end time',
    '- Always check the NEW time slot for conflicts before proposing the action',
    '',
    'Day mapping: Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4',
    'Time format: 24-hour "HH:mm" (e.g. "09:00", "14:30")',
    '',
    'RULES FOR ACTIONS:',
    '- ALWAYS check for time conflicts before proposing an action.',
    '- If conflicting, suggest alternative free times from the user\'s free slots.',
    '- Ask clarifying questions if information is missing (day? time? which friend?).',
    '- Only include the [ACTION:...][/ACTION] block when the slot is verified free and the user\'s intent is clear.',
    '- Before outputting an action, briefly confirm what you\'re about to do.',
    '- Place the action block at the END of your response, after your conversational text.',
    '- You may include at most ONE action block per response.',
    '',
    '── CONTEXT ──',
    timetableInfo,
    freeTimeInfo,
    friendsInfo,
    '',
    '── FRIEND AVAILABILITY RULES ──',
    'When the user asks about availability with a friend (e.g. "when are me and Alice free?"):',
    '- Look at BOTH the user\'s timetable AND the friend\'s timetable listed above.',
    '- Find time slots where NEITHER person has a class.',
    '- Only suggest times between 08:00-22:00.',
    '- Be specific: list the exact free slots per day.',
    '- If you cannot find the friend in the list above, say you don\'t have their timetable data.',
    '',
    'When scheduling a group event:',
    '- Verify the time is free for BOTH the user AND all mentioned friends.',
    '- If a friend has a conflict, warn about it and suggest alternatives.',
    '- After confirming, output the SCHEDULE_EVENT action — this will add it to the user\'s timetable AND send an email notification to the friend(s).',
    '',
    taskInfo,
  ].join('\n');

  // Build conversation history for OpenAI format
  const messages = [
    { role: 'system', content: systemMessage },
    ...history.slice(-10).map(msg => ({
      role: msg.senderId === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[Groq] Error:', res.status, errText);
      return { error: `AI service error (${res.status}). Please try again.` };
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const responseText = data.choices?.[0]?.message?.content;
    if (!responseText) {
      return { error: 'AI returned an empty response. Please try again.' };
    }

    return { data: { response: responseText } };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }
    return { error: 'Unable to connect to AI service. Please check your connection.' };
  }
}

// --- Hook ---

/**
 * Custom hook for interacting with the Kiro API.
 *
 * Provides methods for note summarization and AI chat,
 * along with shared loading and error state.
 */
export function useKiroAPI(): UseKiroAPIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarizeNote = useCallback(
    async (content: string): Promise<APIResult<{ summary: string }>> => {
      setIsLoading(true);
      setError(null);

      const result = await callKiroAPI<{ summary: string }>(
        `${API_BASE_URL}/api/summarize`,
        { content },
        30_000 // 30s timeout
      );

      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  const chatMessage = useCallback(
    async (
      message: string,
      history: ChatMessage[],
      context: UserContext
    ): Promise<APIResult<{ response: string }>> => {
      setIsLoading(true);
      setError(null);

      // Use Groq directly if API key is configured, otherwise fall back to backend
      let result: APIResult<{ response: string }>;

      if (GROQ_API_KEY) {
        result = await callGroqChat(message, history, context, 15_000);
      } else if (API_BASE_URL) {
        result = await callKiroAPI<{ response: string }>(
          `${API_BASE_URL}/api/chat`,
          {
            message,
            history,
            context: {
              timetable: context.timetable,
              tasks: context.tasks,
              aiPreferences: context.aiPreferences,
            },
          },
          10_000
        );
      } else {
        result = { error: 'No AI provider configured. Add VITE_GROQ_API_KEY to your .env file.' };
      }

      setIsLoading(false);
      if (result.error) {
        setError(result.error);
      }
      return result;
    },
    []
  );

  return { summarizeNote, chatMessage, isLoading, error };
}

/**
 * Helper to build UserContext from current localStorage state.
 * Useful for callers who want a quick way to assemble context.
 */
export function buildUserContext(): UserContext {
  const settings = getSettings();
  return {
    timetable: getClasses(),
    tasks: getTasks(),
    aiPreferences: settings.aiPreferences,
    friends: getFriends(),
  };
}
