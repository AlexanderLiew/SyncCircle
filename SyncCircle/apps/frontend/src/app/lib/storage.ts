import {
  STORAGE_KEYS,
  type TimetableClass,
  type Task,
  type Note,
  type Folder,
  type Friend,
  type StudyGroup,
  type GroupFolder,
  type GroupNote,
  type ChatMessage,
  type UserSettings,
  type User,
} from '../types';

// --- Default Settings ---

const DEFAULT_SETTINGS: UserSettings = {
  appearance: {
    theme: 'darker-purple',
    fontSize: 'medium',
  },
  notifications: {
    push: true,
    email: false,
  },
  privacy: {
    profileVisibility: 'friends',
    dataSharing: false,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
  },
  profile: {
    displayName: '',
    avatar: '',
    course: '',
  },
  aiPreferences: {
    responseStyle: 'balanced',
    planningAggressiveness: 'moderate',
  },
};

// --- Generic Helpers ---

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function upsert<T extends { id: string }>(key: string, item: T): void {
  const items = readArray<T>(key);
  const index = items.findIndex((i) => i.id === item.id);
  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }
  writeArray(key, items);
}

function removeById<T extends { id: string }>(key: string, id: string): void {
  const items = readArray<T>(key);
  writeArray(key, items.filter((i) => i.id !== id));
}

// --- Classes ---

export function getClasses(): TimetableClass[] {
  return readArray<TimetableClass>(STORAGE_KEYS.CLASSES);
}

export function saveClass(cls: TimetableClass): void {
  upsert(STORAGE_KEYS.CLASSES, cls);
}

export function deleteClass(id: string): void {
  removeById<TimetableClass>(STORAGE_KEYS.CLASSES, id);
}

// --- Tasks (user-scoped) ---

function getTasksKey(): string {
  try {
    const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user.id) return `synccircle_tasks_${user.id}`;
    }
  } catch {}
  return STORAGE_KEYS.TASKS;
}

export function getTasks(): Task[] {
  return readArray<Task>(getTasksKey());
}

export function saveTask(task: Task): void {
  upsert(getTasksKey(), task);
}

export function deleteTask(id: string): void {
  removeById<Task>(getTasksKey(), id);
}

// --- Notes ---

export function getNotes(): Note[] {
  return readArray<Note>(STORAGE_KEYS.NOTES);
}

export function saveNote(note: Note): void {
  upsert(STORAGE_KEYS.NOTES, note);
}

export function deleteNote(id: string): void {
  removeById<Note>(STORAGE_KEYS.NOTES, id);
}

// --- Folders ---

export function getFolders(): Folder[] {
  return readArray<Folder>(STORAGE_KEYS.FOLDERS);
}

export function saveFolder(folder: Folder): void {
  upsert(STORAGE_KEYS.FOLDERS, folder);
}

export function deleteFolder(id: string): void {
  removeById<Folder>(STORAGE_KEYS.FOLDERS, id);
}

// --- Friends ---

export function getFriends(): Friend[] {
  return readArray<Friend>(STORAGE_KEYS.FRIENDS);
}

export function saveFriend(friend: Friend): void {
  upsert(STORAGE_KEYS.FRIENDS, friend);
}

export function removeFriend(id: string): void {
  removeById<Friend>(STORAGE_KEYS.FRIENDS, id);
}

/**
 * Update a friend's shared timetable data.
 * Used when a friend shares their timetable (via .ics import or manual entry).
 */
export function updateFriendTimetable(friendId: string, timetable: TimetableClass[]): void {
  const friends = getFriends();
  const friend = friends.find((f) => f.id === friendId);
  if (friend) {
    friend.timetable = timetable;
    writeArray(STORAGE_KEYS.FRIENDS, friends);
  }
}

/**
 * Get a friend's shared timetable.
 */
export function getFriendTimetable(friendId: string): TimetableClass[] {
  const friends = getFriends();
  const friend = friends.find((f) => f.id === friendId);
  return friend?.timetable ?? [];
}

/**
 * Share your own timetable with all friends (updates their view of your classes).
 * In a real app this would be a backend operation; here we store it locally
 * as if the friend had shared it.
 */
export function shareMyTimetableWithFriend(friendId: string, myClasses: TimetableClass[]): void {
  updateFriendTimetable(friendId, myClasses);
}

// --- Settings ---

export function getSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return JSON.parse(raw) as UserSettings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: UserSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Study Groups ---

export function getGroups(): StudyGroup[] {
  return readArray<StudyGroup>(STORAGE_KEYS.GROUPS);
}

export function saveGroup(group: StudyGroup): void {
  upsert(STORAGE_KEYS.GROUPS, group);
}

export function deleteGroup(id: string): void {
  removeById<StudyGroup>(STORAGE_KEYS.GROUPS, id);
}

export function joinGroup(group: StudyGroup): void {
  upsert(STORAGE_KEYS.GROUPS, group);
}

// --- Group Folders ---

export function getGroupFolders(groupId?: string): GroupFolder[] {
  const all = readArray<GroupFolder>(STORAGE_KEYS.GROUP_FOLDERS);
  return groupId ? all.filter((f) => f.groupId === groupId) : all;
}

export function saveGroupFolder(folder: GroupFolder): void {
  upsert(STORAGE_KEYS.GROUP_FOLDERS, folder);
}

export function deleteGroupFolder(id: string): void {
  // Also delete notes in this folder
  const notes = readArray<GroupNote>(STORAGE_KEYS.GROUP_NOTES);
  const remaining = notes.filter((n) => n.folderId !== id);
  writeArray(STORAGE_KEYS.GROUP_NOTES, remaining);
  removeById<GroupFolder>(STORAGE_KEYS.GROUP_FOLDERS, id);
}

// --- Group Notes ---

export function getGroupNotes(groupId?: string, folderId?: string): GroupNote[] {
  const all = readArray<GroupNote>(STORAGE_KEYS.GROUP_NOTES);
  let filtered = all;
  if (groupId) filtered = filtered.filter((n) => n.groupId === groupId);
  if (folderId) filtered = filtered.filter((n) => n.folderId === folderId);
  return filtered;
}

export function saveGroupNote(note: GroupNote): void {
  upsert(STORAGE_KEYS.GROUP_NOTES, note);
}

export function deleteGroupNote(id: string): void {
  removeById<GroupNote>(STORAGE_KEYS.GROUP_NOTES, id);
}

// --- Messages ---

export function getMessages(): ChatMessage[] {
  return readArray<ChatMessage>(STORAGE_KEYS.MESSAGES);
}

export function saveMessage(message: ChatMessage): void {
  const messages = readArray<ChatMessage>(STORAGE_KEYS.MESSAGES);
  const index = messages.findIndex((m) => m.id === message.id);
  if (index >= 0) {
    messages[index] = message;
  } else {
    messages.push(message);
  }
  writeArray(STORAGE_KEYS.MESSAGES, messages);
}

// --- User ---

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}
