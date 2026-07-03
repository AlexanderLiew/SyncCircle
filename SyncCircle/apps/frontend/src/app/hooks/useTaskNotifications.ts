import { useEffect, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { getTasks, getUser } from '../lib/storage';
import {
  NOTIFIED_TASKS_KEY,
} from '../lib/workato-client';
import { notifyTaskDueTomorrow } from '../lib/task-notify-client';
import type { Task } from '../types';

// ============================================================
// useTaskNotifications
//
// Three notification paths:
//
// A) ON-SAVE EMAIL — call fireDeadlineEmailIfTomorrow(task) after saveTask()
//    Fires immediately when a task is created with tomorrow's due date.
//
// B) ON-DAY TOAST — polling every 60s while app is open
//    No dueTime → toast at 15:00 SGT on due date
//    Has dueTime → toast 30 min before dueTime on due date
//
// C) STARTUP BANNER — once per calendar day on app load
//    Due today   → warning toast
//    Due tomorrow → info toast + email (safety net for missed on-save)
// ============================================================

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 60_000;
const DEFAULT_NOTIFY_HOUR = 15;
const DEFAULT_NOTIFY_MINUTE = 0;
const EARLY_MINUTES = 30;

// ---- SGT helpers ----

function nowSGT(): { dateStr: string; hours: number; minutes: number } {
  const sgt = new Date(Date.now() + SGT_OFFSET_MS);
  const yyyy = sgt.getUTCFullYear();
  const mm   = String(sgt.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(sgt.getUTCDate()).padStart(2, '0');
  return { dateStr: `${yyyy}-${mm}-${dd}`, hours: sgt.getUTCHours(), minutes: sgt.getUTCMinutes() };
}

function tomorrowSGT(): string {
  const sgt = new Date(Date.now() + SGT_OFFSET_MS + 24 * 60 * 60 * 1000);
  return `${sgt.getUTCFullYear()}-${String(sgt.getUTCMonth() + 1).padStart(2, '0')}-${String(sgt.getUTCDate()).padStart(2, '0')}`;
}

function notifyTimeFor(task: Task): { hours: number; minutes: number } {
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    const clamped = Math.max(0, h * 60 + m - EARLY_MINUTES);
    return { hours: Math.floor(clamped / 60), minutes: clamped % 60 };
  }
  return { hours: DEFAULT_NOTIFY_HOUR, minutes: DEFAULT_NOTIFY_MINUTE };
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

// ---- Dedup helpers ----

function getNotifiedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_TASKS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function markNotified(key: string): void {
  const keys = getNotifiedKeys();
  keys.add(key);
  localStorage.setItem(NOTIFIED_TASKS_KEY, JSON.stringify([...keys]));
}

// ---- Path A: on-save email ----

/**
 * Call this immediately after saveTask() in TaskList and Timetable.
 * If the task is due tomorrow it fires the backend notification endpoint
 * and shows a confirmation toast — no page reload needed.
 * Email failures are silently swallowed (fire-and-forget) and do NOT
 * affect the toast or task save UX.
 */
export async function fireDeadlineEmailIfTomorrow(task: Task): Promise<void> {
  if (!task.dueDate || task.dueDate !== tomorrowSGT()) return;

  const user = getUser();
  if (!user?.email) return;

  const emailKey = `${task.id}:email:${task.dueDate}`;
  const notified = getNotifiedKeys();
  if (notified.has(emailKey)) return;
  markNotified(emailKey);

  // Fire-and-forget: send notification via backend (errors silently swallowed)
  notifyTaskDueTomorrow({ title: task.title, dueDate: task.dueDate });

  toast.success('📧 Reminder email scheduled', {
    description: `You'll receive an email reminder for "${task.title}" tomorrow.`,
    duration: 6_000,
  });
}

// ---- Path B: timed polling ----

async function checkTimedNotifications(): Promise<void> {
  const user = getUser();
  if (!user?.email) return;

  const tasks    = getTasks();
  const notified = getNotifiedKeys();
  const { dateStr: todayStr, hours: nowH, minutes: nowM } = nowSGT();

  for (const task of tasks) {
    if (task.completed || !task.dueDate) continue;
    if (task.dueDate !== todayStr) continue;

    const key = `${task.id}:timed:${task.dueDate}`;
    if (notified.has(key)) continue;

    const { hours: targetH, minutes: targetM } = notifyTimeFor(task);
    if (nowH * 60 + nowM < targetH * 60 + targetM) continue;

    markNotified(key);

    const desc = task.dueTime
      ? `Due at ${formatTime12h(task.dueTime)} — 30 min warning! 🚨`
      : `Deadline reminder — due today at 3:00 PM SGT`;

    toast.warning(`⏰ Task due: "${task.title}"`, { description: desc, duration: 12_000 });
  }
}

// ---- Path C: startup banner ----

async function checkStartupBanners(): Promise<void> {
  const user     = getUser();
  const tasks    = getTasks();
  const notified = getNotifiedKeys();
  const { dateStr: todayStr } = nowSGT();
  const tomorrowStr = tomorrowSGT();

  for (const task of tasks) {
    if (task.completed || !task.dueDate) continue;

    const isToday    = task.dueDate === todayStr;
    const isTomorrow = task.dueDate === tomorrowStr;
    if (!isToday && !isTomorrow) continue;

    const bannerKey = `${task.id}:banner:${task.dueDate}`;
    if (notified.has(bannerKey)) continue;
    markNotified(bannerKey);

    if (isToday) {
      const timeHint = task.dueTime
        ? ` at ${formatTime12h(task.dueTime)}`
        : ' — reminder at 3:00 PM SGT';
      toast.warning(`⏰ Due today: "${task.title}"`, {
        description: `This task is due today${timeHint}. Get it done! 💪`,
        duration: 10_000,
      });
    } else {
      toast.info(`📅 Due tomorrow: "${task.title}"`, {
        description: user?.email
          ? 'A reminder email has been sent to your inbox.'
          : 'Add your email in Profile to receive email reminders.',
        duration: 10_000,
      });

      if (user?.email) {
        const emailKey = `${task.id}:email:${task.dueDate}`;
        if (!notified.has(emailKey)) {
          markNotified(emailKey);
          notifyTaskDueTomorrow({ title: task.title, dueDate: task.dueDate });
        }
      }
    }
  }
}

// ---- Hook ----

export interface UseTaskNotificationsReturn {
  pendingCount: number;
  checkNow: () => void;
}

export function useTaskNotifications(): UseTaskNotificationsReturn {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(() => {
    const tasks = getTasks();
    const { dateStr: todayStr } = nowSGT();
    const tomorrowStr = tomorrowSGT();
    const count = tasks.filter(t =>
      !t.completed && t.dueDate &&
      (t.dueDate === todayStr || t.dueDate === tomorrowStr)
    ).length;
    setPendingCount(count);
  }, []);

  useEffect(() => {
    checkStartupBanners().then(refreshCount);

    const id = setInterval(() => {
      checkTimedNotifications();
      refreshCount();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [refreshCount]);

  const checkNow = useCallback(() => {
    checkStartupBanners().then(refreshCount);
    checkTimedNotifications();
  }, [refreshCount]);

  return { pendingCount, checkNow };
}

export function clearNotifiedTasks(): void {
  localStorage.removeItem(NOTIFIED_TASKS_KEY);
}
