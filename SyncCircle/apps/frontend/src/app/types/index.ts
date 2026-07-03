// ============================================================
// CramCircle — Core Entity Types & localStorage Key Constants
// ============================================================

// --- Theme Types ---

export type ThemeName =
  | 'darker-purple'
  | 'ocean-blue'
  | 'forest-green'
  | 'sunset-warm'
  | 'midnight-dark';

export interface ThemeDefinition {
  name: ThemeName;
  label: string;
  variables: Record<string, string>; // CSS variable name -> value
}

// --- User ---

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  course?: string;
  createdAt: string;
}

// --- Timetable ---

export interface TimetableClass {
  id: string;
  title: string;
  moduleCode: string;
  location: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4; // Mon-Fri
  startTime: string; // "HH:mm" format
  endTime: string;   // "HH:mm" format
  color: string;
  source: 'personal' | 'imported';
}

// --- Tasks ---

export interface Task {
  id: string;
  title: string;
  dueDate?: string;        // ISO date string "YYYY-MM-DD"
  dueTime?: string;        // optional time "HH:mm" (24h, SGT)
                           // If set: in-app toast fires 30 min before dueTime on dueDate
                           // If not set: in-app toast fires at 15:00 SGT on dueDate
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

// --- Notes ---

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  ownerId: string;
  sharedGroupIds: string[];
  summary?: string;
  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string; // base64 data URL for download
  };
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  ownerId: string;
  type: 'personal' | 'group';
  groupId?: string;
}

// --- Study Groups ---

export interface StudyGroup {
  id: string;
  name: string;
  tag: string;             // short tag for discovery e.g. "CS2040-S1"
  creatorId: string;       // userId of the group creator
  members: string[];       // accepted member userIds
  pendingMembers: string[]; // userIds awaiting approval
  createdAt: string;
}

export interface GroupFolder {
  id: string;
  groupId: string;
  name: string;
  color: string;
  createdBy: string;       // userId
  createdAt: string;
}

export interface GroupNote {
  id: string;
  groupId: string;
  folderId: string;
  title: string;
  content: string;
  createdBy: string;       // userId
  createdByName: string;   // display name for UI
  attachment?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string; // base64 data URL for download
  };
  createdAt: string;
  updatedAt: string;
}

// --- Friends ---

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  displayName: string;
  status: 'online' | 'offline' | 'studying';
  timetable: TimetableClass[]; // for availability overlay
}

// --- Chat ---

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

// --- User Settings ---

export interface UserSettings {
  appearance: {
    theme: ThemeName;
    fontSize: 'small' | 'medium' | 'large';
  };
  notifications: {
    push: boolean;
    email: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    dataSharing: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
  };
  profile: {
    displayName: string;
    avatar: string;
    course: string;
  };
  aiPreferences: {
    responseStyle: 'concise' | 'detailed' | 'balanced';
    planningAggressiveness: 'relaxed' | 'moderate' | 'intensive';
  };
}

// ============================================================
// localStorage Key Constants
// ============================================================

export const STORAGE_KEYS = {
  AUTH: 'synccircle_auth',
  USER: 'synccircle_user',
  CLASSES: 'synccircle_classes',
  TASKS: 'synccircle_tasks',
  NOTES: 'synccircle_notes',
  FOLDERS: 'synccircle_folders',
  FRIENDS: 'synccircle_friends',
  GROUPS: 'synccircle_groups',
  GROUP_FOLDERS: 'synccircle_group_folders',
  GROUP_NOTES: 'synccircle_group_notes',
  MESSAGES: 'synccircle_messages',
  SETTINGS: 'synccircle_settings',
  THEME: 'synccircle_theme',
  CHAT_HISTORY: 'synccircle_chat_history',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
