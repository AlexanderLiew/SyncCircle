# Implementation Plan: CramCircle

## Overview

This plan makes the existing Vite React prototype functional by adding a shared data layer (TypeScript types, localStorage helpers, validators), connecting each page to real CRUD operations, integrating Kiro API for AI features, wiring Workato webhooks for Google sync, implementing the theme system, and adding the animated Profile Character. All tasks build incrementally on the existing `SyncCircle/apps/frontend/` codebase.

## Tasks

- [x] 1. Create shared data layer (types, localStorage helpers, validators)
  - [x] 1.1 Create TypeScript interfaces and types
    - Create `src/app/types/index.ts` with all entity interfaces: User, TimetableClass, Task, Note, Folder, StudyGroup, Friend, ChatMessage, UserSettings, ThemeName, ThemeDefinition
    - Define the localStorage key constants as an enum or const object
    - _Requirements: 4.2, 6.4, 7.2, 9.3, 12.1, 14.1, 15.1_

  - [x] 1.2 Create localStorage CRUD helpers
    - Create `src/app/lib/storage.ts` implementing the StorageLayer interface
    - Implement getClasses, saveClass, deleteClass, getTasks, saveTask, deleteTask, getNotes, saveNote, getFolders, saveFolder, getFriends, saveFriend, removeFriend, getSettings, saveSettings, getGroups, joinGroup, getMessages, saveMessage, getUser, saveUser
    - Each function reads/writes JSON to localStorage using the key constants
    - _Requirements: 4.2, 6.4, 7.2, 7.4, 9.3, 12.1, 15.2_

  - [x] 1.3 Create form validators
    - Create `src/app/lib/validators.ts` with pure validation functions
    - Implement: validateEmail, validatePassword (min 8 chars), validateClassForm (all required fields + endTime > startTime), validateTaskForm (non-empty title), validateGroupJoin (non-empty name + exactly 4 numeric digits)
    - Return structured error objects with field-level messages
    - _Requirements: 2.4, 2.5, 4.5, 6.4, 9.2_

  - [x] 1.4 Create useLocalStorage generic hook
    - Create `src/app/hooks/useLocalStorage.ts` — a generic React hook for reading and writing typed values to localStorage with automatic re-render on change
    - _Requirements: 4.2, 6.4, 7.2, 15.2_

  - [x]* 1.5 Write property tests for validators
    - **Property 1: Registration validation rejects invalid inputs**
    - **Property 5: Invalid class data is rejected**
    - **Validates: Requirements 2.4, 2.5, 4.5**

  - [x]* 1.6 Write property tests for localStorage CRUD
    - **Property 4: Valid class creation persists and displays**
    - **Property 6: Class and task deletion removes entity**
    - **Property 9: Task creation persists with all fields**
    - **Property 10: Task completion is a one-way state transition**
    - **Property 22: Settings persistence round-trip**
    - **Validates: Requirements 4.2, 4.4, 6.4, 6.5, 6.6, 15.2**

- [x] 2. Implement the Theme System
  - [x] 2.1 Create theme configuration and definitions
    - Create `src/app/lib/theme-config.ts` with 5 theme definitions: 'darker-purple' (default), 'ocean-blue', 'forest-green', 'sunset-warm', 'midnight-dark'
    - Each theme is a Record of CSS custom property names to values (background, foreground, primary, secondary, accent, card, border, etc.)
    - _Requirements: 14.1, 14.2_

  - [x] 2.2 Create ThemeProvider component and useTheme hook
    - Create `src/app/components/ThemeProvider.tsx` — wraps the app, reads persisted theme on mount, applies CSS variables to document.documentElement
    - Create `src/app/hooks/useTheme.ts` — exposes currentTheme, applyTheme(), getAvailableThemes()
    - On theme change, iterate CSS variable map and call `document.documentElement.style.setProperty()` for each
    - Persist selected theme to `synccircle_theme` in localStorage
    - _Requirements: 14.3, 14.4_

  - [x] 2.3 Integrate ThemeProvider into the app root
    - Wrap the app in `ThemeProvider` in `src/main.tsx` or `src/app/App.tsx`
    - Ensure default darker-purple theme is applied on first load
    - _Requirements: 14.1, 14.4_

  - [x]* 2.4 Write property tests for theme system
    - **Property 20: Theme application updates CSS variables**
    - **Property 21: Theme persistence round-trip**
    - **Validates: Requirements 14.3, 14.4**

- [x] 3. Make Auth Page functional
  - [x] 3.1 Implement registration and login logic
    - Update `src/app/pages/Auth.tsx` to use validators for email/password
    - On valid registration: create User object, save to localStorage, set `synccircle_auth` flag, redirect to Dashboard
    - On valid login: check credentials against stored user, set auth flag, redirect
    - Display inline field-level validation errors for invalid registration inputs
    - Display generic "Invalid credentials" message for failed login (never reveal which field)
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x]* 3.2 Write property test for login failure message
    - **Property 2: Login failure message is generic**
    - **Validates: Requirements 2.5**

- [x] 4. Checkpoint - Core data layer and auth
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Make Dashboard Page functional
  - [x] 5.1 Connect Dashboard to localStorage data
    - Update `src/app/pages/Dashboard.tsx` to read tasks, classes, and groups from localStorage using the storage helpers
    - Display upcoming tasks (sorted by due date, incomplete only)
    - Display today's schedule highlights (classes for the current day of week)
    - Display recent collaboration activity (latest group messages or shared notes)
    - Make scheduled class items clickable to navigate to Timetable page
    - _Requirements: 3.1, 3.2, 3.3_

  - [x]* 5.2 Write property test for Dashboard rendering
    - **Property 3: Dashboard renders all data sections**
    - **Validates: Requirements 3.1**

- [x] 6. Make Timetable Page functional
  - [x] 6.1 Implement Calendar/Task tab toggle
    - Update `src/app/pages/Timetable.tsx` to use Radix UI Tabs for Your_Calendar_Tab and Your_Task_Tab
    - Calendar tab shows weekly grid view with classes positioned by day/time
    - Task tab shows active tasks list and completed tasks section
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 6.2 Implement Add Class form with validation
    - Add an "Add Class" button that opens a dialog/form
    - Form fields: title, moduleCode, location, dayOfWeek (Mon-Fri dropdown), startTime, endTime
    - Validate using `validateClassForm`, show inline errors on failure
    - On success: persist via storage.saveClass(), display on calendar grid, trigger Workato sync
    - Support edit and delete operations on existing classes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.3 Implement Task CRUD in Task tab
    - Add task creation form: title (required), due date (optional), priority dropdown (High/Medium/Low, optional)
    - Persist tasks via storage helpers
    - Implement mark-as-complete (moves to completed section, sets completed flag + timestamp)
    - Implement task deletion
    - _Requirements: 6.4, 6.5, 6.6_

  - [x] 6.4 Implement Friend Availability Dropdown and overlay
    - Add a "Friend Availability" dropdown button above the calendar
    - Dropdown shows checkboxes for each friend (from localStorage)
    - When friends are selected, overlay their timetable blocks on the calendar with distinct colors per friend
    - When deselected, remove that friend's overlay
    - Highlight time slots where user + all selected friends are simultaneously free
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x]* 6.5 Write property tests for Timetable features
    - **Property 7: Friend overlay round-trip**
    - **Property 8: Free slot computation correctness**
    - **Property 24: Friend availability dropdown renders all friends**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [x] 7. Checkpoint - Timetable fully functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Make Notes Page functional
  - [x] 8.1 Implement User Notes tab with folders
    - Update `src/app/pages/Notes.tsx` to use Radix Tabs for "User's Notes" and "Shared Notes"
    - User's Notes tab: display notes grouped by folders, allow folder creation (name input), allow note creation assigned to a folder
    - Note CRUD: create, edit, delete notes with title and content
    - Ensure no react/emote icons are shown on note items
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_

  - [x] 8.2 Implement Shared Notes tab with group filtering
    - Shared Notes tab: display only notes from Study_Groups the user belongs to
    - Organize shared notes in folders named after each group
    - Display "Join Group" button
    - _Requirements: 7.5, 7.6_

  - [x] 8.3 Implement Join Group form
    - "Join Group" button opens a form: group name input + 4-digit numeric password input
    - Validate with `validateGroupJoin`
    - On valid submission: check group exists and password matches, add user to group members, display group's shared notes
    - On failure: show generic "Invalid credentials" error (don't reveal which field)
    - If already a member: show "Already a member" message
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 8.4 Implement AI Summarize button
    - Add "AI Summarize" button on each note view
    - On click: call Kiro API with note content, display loading state
    - On success: display summary within the note view, persist to note.summary
    - On timeout (30s): show timeout error with retry option
    - On API error: show user-friendly error with retry button
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x]* 8.5 Write property tests for Notes features
    - **Property 11: Notes display under assigned folders**
    - **Property 12: Shared notes filtered by group membership**
    - **Property 13: AI summary display**
    - **Property 14: Group join with valid credentials succeeds**
    - **Property 15: Group join error is generic**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 8.3, 9.3, 9.4**

- [x] 9. Make AI Planner Page functional
  - [x] 9.1 Create useKiroAPI hook
    - Create `src/app/hooks/useKiroAPI.ts` implementing the KiroAPIClient interface
    - `summarizeNote(content)`: POST to Kiro API summarize endpoint with 30s timeout
    - `chatMessage(message, history, context)`: POST to Kiro API chat endpoint with 10s timeout
    - Use AbortController for timeout, return `{ data, error }` pattern
    - Include user context (timetable, tasks, settings.aiPreferences) in chat requests
    - _Requirements: 8.2, 11.1, 11.2, 11.3_

  - [x] 9.2 Implement AI Planner chatbot interface
    - Update `src/app/pages/AIPlanner.tsx` to render a conversational chat UI
    - Display message thread with user messages and AI responses
    - Text input with send button at the bottom
    - On send: call useKiroAPI.chatMessage with message, full conversation history, and user context
    - Display AI response in the thread
    - Maintain conversation history in localStorage (`synccircle_chat_history`)
    - Show loading indicator while waiting for response
    - On error/timeout: show error message with retry button
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x]* 9.3 Write property test for chat history
    - **Property 16: Chat conversation history accumulates**
    - **Validates: Requirements 11.2, 11.6**

- [x] 10. Make Friends Page functional
  - [x] 10.1 Implement Friends list and management
    - Update `src/app/pages/Friends.tsx` to read friends from localStorage
    - Display friend list with display name and online status
    - Implement friend search (filter by name or email, case-insensitive substring match)
    - Implement send friend request, accept request, remove friend
    - Friendship is bidirectional (add to both users' lists)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x]* 10.2 Write property tests for Friends features
    - **Property 17: Friend list renders all friends with required data**
    - **Property 18: Friendship is bidirectional**
    - **Property 19: Friend search returns matching users**
    - **Validates: Requirements 12.1, 12.3, 12.4, 12.5**

- [x] 11. Checkpoint - Notes, AI Planner, and Friends functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Make Settings Page fully functional
  - [x] 12.1 Implement all 6 Settings sections
    - Update `src/app/pages/Settings.tsx` to implement functional controls for all sections:
    - **Appearance**: Theme selector (5 themes via useTheme hook), font size preference (small/medium/large)
    - **Notifications**: Toggle push notifications, toggle email notifications
    - **Privacy & Security**: Profile visibility dropdown (public/friends/private), data sharing toggle
    - **Accessibility**: High contrast toggle, reduced motion toggle
    - **Profile**: Display name input, avatar upload/selection, course/program input
    - **AI Preferences**: Response style selector (concise/detailed/balanced), planning aggressiveness (relaxed/moderate/intensive)
    - All changes persist to localStorage via storage.saveSettings() and apply immediately
    - Reduced motion: disable Motion animations globally when enabled
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 13. Implement animated Profile Character
  - [x] 13.1 Create ProfileCharacter component with Motion animations
    - Create `src/app/components/ProfileCharacter.tsx`
    - Use Motion's `variants` API with three states: idle (breathing/floating), studying (head-bob), celebration (confetti + jump)
    - idle: subtle scale oscillation + gentle Y translation loop
    - studying: rotation keyframes simulating writing motion
    - celebration: use `canvas-confetti` + Motion spring for jump animation
    - Default to idle state, transition to celebration on task completion trigger
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 13.2 Integrate ProfileCharacter into Profile page
    - Update `src/app/pages/Profile.tsx` to render ProfileCharacter component
    - Wire task completion events to trigger celebration state
    - Display user profile info (name, course, avatar) from localStorage alongside the character
    - _Requirements: 16.1, 16.3_

- [x] 14. Wire Workato webhooks for Google sync
  - [x] 14.1 Create Workato client and useWorkato hook
    - Create `src/app/lib/workato-client.ts` with webhook URL configuration
    - Create `src/app/hooks/useWorkato.ts` implementing the WorkatoClient interface
    - `syncClass(action, classData)`: POST to Workato webhook with class data + action type
    - `syncNote(action, noteData)`: POST to Workato webhook with note data
    - `connectGoogleCalendar(userId)` / `disconnectGoogleCalendar(userId)`: trigger connection webhooks
    - `connectGoogleNotes(userId)`: trigger Google Notes connection
    - Fire-and-forget with toast notification on failure
    - Store failed syncs in `synccircle_pending_syncs` for retry on next load
    - _Requirements: 4.6, 10.1, 10.2, 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 14.2 Integrate Workato sync into Timetable and Notes pages
    - After class add/edit/delete in Timetable: call useWorkato.syncClass()
    - After note create/update in Notes: call useWorkato.syncNote()
    - Show toast on sync failure: "Sync to Google Calendar/Notes failed. Changes saved locally."
    - Add Google Calendar connect/disconnect controls in Settings page
    - On app load: retry any pending syncs from `synccircle_pending_syncs`
    - _Requirements: 4.6, 10.1, 10.3, 17.2, 17.4_

  - [x]* 14.3 Write property test for Workato field mapping
    - **Property 23: Workato class field mapping**
    - **Validates: Requirements 17.3**

- [x] 15. Implement Group Chat page and SyncCircle icon navigation
  - [x] 15.1 Make Group Chat functional
    - Update `src/app/pages/GroupChat.tsx` to display group chat threads
    - Show message history from localStorage when opening a chat
    - Implement message sending: persist to localStorage, display in thread
    - Show sender name and timestamp for each message
    - If group chat feature is disabled in settings, hide from nav menu
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 15.2 Ensure SyncCircle icon navigates to Dashboard
    - Update `src/app/components/Layout.tsx` to ensure the SyncCircle logo/icon in the sidebar navigates to the Dashboard page on click
    - Verify the icon is visible and clickable on all authenticated pages
    - _Requirements: 1.1, 1.2, 1.3_

  - [x]* 15.3 Write property test for Group Chat
    - **Property 25: Group chat messages display for all members**
    - **Validates: Requirements 13.2, 13.3**

- [x] 16. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing prototype pages are updated in-place — no new pages need to be created from scratch
- localStorage is the persistence layer for the hackathon MVP; no traditional backend server is needed
- Workato webhooks are fire-and-forget; the frontend always persists locally first (optimistic updates)
- Kiro API endpoints and Workato webhook URLs should be configured via environment variables

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6", "2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "3.1"] },
    { "id": 4, "tasks": ["3.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1", "6.3", "9.1"] },
    { "id": 6, "tasks": ["6.2", "6.4", "8.1", "10.1"] },
    { "id": 7, "tasks": ["6.5", "8.2", "8.3", "10.2"] },
    { "id": 8, "tasks": ["8.4", "8.5", "9.2"] },
    { "id": 9, "tasks": ["9.3", "12.1", "14.1"] },
    { "id": 10, "tasks": ["13.1", "14.2", "15.1", "15.2"] },
    { "id": 11, "tasks": ["13.2", "14.3", "15.3"] }
  ]
}
```
