/**
 * Seed data for testing the timetable friend overlay feature.
 * Call seedTestData() on app startup to populate localStorage
 * with sample friends and their timetables.
 *
 * Only seeds if no friends exist yet (won't overwrite real data).
 */

import type { TimetableClass, Friend } from '../types';
import { STORAGE_KEYS } from '../types';

const SEED_FRIENDS: Friend[] = [
  {
    id: 'seed-friend-alice',
    userId: 'current-user',
    friendId: 'alice-001',
    displayName: 'Alice Tan',
    status: 'online',
    timetable: [
      {
        id: 'alice-cls-1',
        title: 'Machine Learning',
        moduleCode: 'CS3244',
        location: 'COM1-B103',
        dayOfWeek: 0, // Monday
        startTime: '10:00',
        endTime: '12:00',
        color: '#3b82f6',
        source: 'personal',
      },
      {
        id: 'alice-cls-2',
        title: 'Database Systems',
        moduleCode: 'CS2102',
        location: 'LT15',
        dayOfWeek: 2, // Wednesday
        startTime: '14:00',
        endTime: '16:00',
        color: '#f59e0b',
        source: 'personal',
      },
      {
        id: 'alice-cls-3',
        title: 'Software Engineering',
        moduleCode: 'CS2103',
        location: 'COM2-0108',
        dayOfWeek: 1, // Tuesday
        startTime: '09:00',
        endTime: '11:00',
        color: '#10b981',
        source: 'personal',
      },
      {
        id: 'alice-cls-4',
        title: 'Computer Networks',
        moduleCode: 'CS2105',
        location: 'LT19',
        dayOfWeek: 3, // Thursday
        startTime: '13:00',
        endTime: '15:00',
        color: '#ec4899',
        source: 'personal',
      },
    ],
  },
  {
    id: 'seed-friend-bob',
    userId: 'current-user',
    friendId: 'bob-002',
    displayName: 'Bob Lim',
    status: 'studying',
    timetable: [
      {
        id: 'bob-cls-1',
        title: 'Data Structures',
        moduleCode: 'CS2040',
        location: 'LT27',
        dayOfWeek: 0, // Monday
        startTime: '09:00',
        endTime: '11:00',
        color: '#6366f1',
        source: 'personal',
      },
      {
        id: 'bob-cls-2',
        title: 'Machine Learning',
        moduleCode: 'CS3244',
        location: 'COM1-B103',
        dayOfWeek: 0, // Monday
        startTime: '10:00',
        endTime: '12:00',
        color: '#3b82f6',
        source: 'personal',
      },
      {
        id: 'bob-cls-3',
        title: 'Operating Systems',
        moduleCode: 'CS2106',
        location: 'COM1-0212',
        dayOfWeek: 2, // Wednesday
        startTime: '10:00',
        endTime: '12:00',
        color: '#f43f5e',
        source: 'personal',
      },
      {
        id: 'bob-cls-4',
        title: 'Computer Networks',
        moduleCode: 'CS2105',
        location: 'LT19',
        dayOfWeek: 3, // Thursday
        startTime: '13:00',
        endTime: '15:00',
        color: '#ec4899',
        source: 'personal',
      },
      {
        id: 'bob-cls-5',
        title: 'Linear Algebra',
        moduleCode: 'MA2001',
        location: 'LT31',
        dayOfWeek: 4, // Friday
        startTime: '08:00',
        endTime: '10:00',
        color: '#eab308',
        source: 'personal',
      },
    ],
  },
  {
    id: 'seed-friend-charlie',
    userId: 'current-user',
    friendId: 'charlie-003',
    displayName: 'Charlie Wong',
    status: 'offline',
    timetable: [
      {
        id: 'charlie-cls-1',
        title: 'Software Engineering',
        moduleCode: 'CS2103',
        location: 'COM2-0108',
        dayOfWeek: 1, // Tuesday
        startTime: '09:00',
        endTime: '11:00',
        color: '#10b981',
        source: 'personal',
      },
      {
        id: 'charlie-cls-2',
        title: 'Artificial Intelligence',
        moduleCode: 'CS3243',
        location: 'COM1-0201',
        dayOfWeek: 3, // Thursday
        startTime: '10:00',
        endTime: '12:00',
        color: '#14b8a6',
        source: 'personal',
      },
      {
        id: 'charlie-cls-3',
        title: 'Database Systems',
        moduleCode: 'CS2102',
        location: 'LT15',
        dayOfWeek: 4, // Friday
        startTime: '14:00',
        endTime: '16:00',
        color: '#f59e0b',
        source: 'personal',
      },
    ],
  },
];

// Sample classes for the current user (so the grid isn't empty)
const SEED_MY_CLASSES: TimetableClass[] = [
  {
    id: 'my-cls-1',
    title: 'Data Structures',
    moduleCode: 'CS2040',
    location: 'LT27',
    dayOfWeek: 0, // Monday
    startTime: '09:00',
    endTime: '11:00',
    color: '#6366f1',
    source: 'personal',
  },
  {
    id: 'my-cls-2',
    title: 'Algorithms',
    moduleCode: 'CS3230',
    location: 'COM1-0217',
    dayOfWeek: 1, // Tuesday
    startTime: '14:00',
    endTime: '16:00',
    color: '#8b5cf6',
    source: 'personal',
  },
  {
    id: 'my-cls-3',
    title: 'Computer Networks',
    moduleCode: 'CS2105',
    location: 'LT19',
    dayOfWeek: 3, // Thursday
    startTime: '13:00',
    endTime: '15:00',
    color: '#ec4899',
    source: 'personal',
  },
  {
    id: 'my-cls-4',
    title: 'Operating Systems',
    moduleCode: 'CS2106',
    location: 'COM1-0212',
    dayOfWeek: 2, // Wednesday
    startTime: '10:00',
    endTime: '12:00',
    color: '#f43f5e',
    source: 'personal',
  },
  {
    id: 'my-cls-5',
    title: 'Linear Algebra',
    moduleCode: 'MA2001',
    location: 'LT31',
    dayOfWeek: 4, // Friday
    startTime: '08:00',
    endTime: '10:00',
    color: '#eab308',
    source: 'personal',
  },
];

/**
 * Seeds localStorage with test friends and classes if none exist yet.
 * Safe to call multiple times — won't overwrite existing data.
 */
export function seedTestData(): void {
  // Seed friends
  const existingFriends = localStorage.getItem(STORAGE_KEYS.FRIENDS);
  if (!existingFriends || existingFriends === '[]') {
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(SEED_FRIENDS));
    console.log('[Seed] Loaded 3 test friends (Alice, Bob, Charlie) with timetables');
  }

  // Seed my classes
  const existingClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
  if (!existingClasses || existingClasses === '[]') {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(SEED_MY_CLASSES));
    console.log('[Seed] Loaded 5 sample classes for your timetable');
  }

  // Seed tasks (for AI Planner context)
  const existingTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
  if (!existingTasks || existingTasks === '[]') {
    const today = new Date();
    const tasks = [
      { id: 'task-1', title: 'CS2040 Assignment 3 - Binary Trees', dueDate: new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10), priority: 'High', completed: false },
      { id: 'task-2', title: 'CS3230 Problem Set 5', dueDate: new Date(today.getTime() + 5 * 86400000).toISOString().slice(0, 10), priority: 'Medium', completed: false },
      { id: 'task-3', title: 'MA2001 Quiz Revision', dueDate: new Date(today.getTime() + 1 * 86400000).toISOString().slice(0, 10), priority: 'High', completed: false },
      { id: 'task-4', title: 'CS2106 Lab Report', dueDate: new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10), priority: 'Low', completed: false },
      { id: 'task-5', title: 'CS2105 Tutorial Prep', dueDate: today.toISOString().slice(0, 10), priority: 'Medium', completed: true },
    ];
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    console.log('[Seed] Loaded 5 sample tasks with due dates');
  }

  // Seed study stats (for character evolution + Profile page)
  if (!localStorage.getItem('synccircle_pomodoro_stats')) {
    localStorage.setItem('synccircle_pomodoro_stats', JSON.stringify({
      totalSessions: 25,
      totalMinutes: 450,
      todaySessions: 2,
      lastSessionDate: today().toISOString().slice(0, 10),
    }));
    console.log('[Seed] Loaded pomodoro stats (Teen level character)');
  }

  // Seed study log (for Profile study hours graph)
  if (!localStorage.getItem('synccircle_study_log')) {
    const log = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      log.push({ date: d.toISOString().slice(0, 10), minutes: Math.round(30 + Math.random() * 120) });
    }
    localStorage.setItem('synccircle_study_log', JSON.stringify(log));
    console.log('[Seed] Loaded 7-day study log');
  }
}

function today(): Date {
  return new Date();
}
