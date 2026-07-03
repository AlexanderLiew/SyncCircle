# Implementation Plan: AI Planner Integration

## Overview

This plan implements a conversational AI chatbot for SyncCircle that can read and modify the user's timetable with explicit confirmation. The chatbot uses Groq (Llama 3.3 70B) called directly from the frontend, with structured action blocks for timetable operations.

## Tasks

- [x] 1. Set up Groq AI integration in frontend
  - [x] 1.1 Configure Groq API in useKiroAPI hook
    - Add `VITE_GROQ_API_KEY` environment variable support
    - Implement `callGroqChat()` function with OpenAI-compatible format
    - Set up 15-second timeout with AbortController
    - Use `llama-3.3-70b-versatile` model
    - _Requirements: 8.1_

  - [x] 1.2 Build context-rich system prompt
    - Include full timetable with day/time/location per class
    - Compute and include free time slots per day (08:00–22:00)
    - Include all friends and their timetable data
    - Add action instructions with JSON format examples
    - Add conflict detection rules and formula
    - Add rescheduling rules (move/keep both/extend)
    - Add friend availability cross-checking rules
    - _Requirements: 2.1, 2.5, 8.1, 8.2, 8.3, 8.4_

- [x] 2. Implement chat actions module
  - [x] 2.1 Create chat-actions.ts with action parsing
    - Implement regex parser for `[ACTION:TYPE]{json}[/ACTION]` blocks
    - Define action types: ADD_CLASS, DELETE_CLASS, MOVE_CLASS, EXTEND_CLASS, FIND_FREE_TIME, SCHEDULE_EVENT
    - Build human-readable description for each action type
    - Return clean text (action blocks stripped) + actions array
    - _Requirements: 9.1, 9.2_

  - [x] 2.2 Implement ADD_CLASS execution
    - Generate UUID for class ID
    - Assign random color from palette
    - Save to localStorage via `saveClass()`
    - Sync to backend via `apiClient.put('/timetable', { classes })`
    - Return success message with class details
    - _Requirements: 1.3, 1.5_

  - [x] 2.3 Implement DELETE_CLASS execution
    - Match class by title + dayOfWeek (case-insensitive)
    - Remove from localStorage via `deleteClass()`
    - Sync to backend
    - Handle "not found" case
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 2.4 Implement MOVE_CLASS execution
    - Find class by title + fromDay
    - Update dayOfWeek, startTime, endTime
    - Save updated class via `saveClass()`
    - Sync to backend
    - _Requirements: 4.2, 4.3_

  - [x] 2.5 Implement EXTEND_CLASS execution
    - Find class by title + dayOfWeek
    - Update endTime
    - Save via `saveClass()`
    - Sync to backend
    - _Requirements: 5.2_

  - [x] 2.6 Implement FIND_FREE_TIME execution
    - Match friend names to stored friends (fuzzy match)
    - Get user's classes + each friend's timetable from localStorage
    - Compute busy ranges per day for all users
    - Find gaps (free slots ≥ 60min) between 08:00–22:00
    - Return formatted mutual free slots per day
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.7 Implement SCHEDULE_EVENT execution
    - Create TimetableClass with moduleCode "EVENT"
    - Save to user's localStorage
    - Sync to backend
    - Show toast notification "Email sent to [friend name]" per friend
    - _Requirements: 7.2, 7.3_

- [x] 3. Build AI Planner chat page
  - [x] 3.1 Create clean chat-only AIPlanner.tsx page
    - Header with "AI Study Planner" branding and gradient
    - Full-height chat message area with auto-scroll
    - User messages (right) and AI messages (left) with timestamps
    - Input field with Send button and Enter-to-send
    - Loading dots indicator during API call
    - Error display with Retry button
    - Clear Chat button
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 3.2 Integrate action confirmation UI
    - After receiving AI response, call `parseActions()`
    - Store pending actions keyed by message ID
    - Render action card below AI message with description + "Confirm" button
    - On Confirm click: call `executeAction()`, append result as new AI message
    - Remove pending action after execution
    - Handle execution errors gracefully
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 3.3 Implement chat persistence
    - Save messages to localStorage on every change
    - Restore chat history on page load
    - Clear button removes all messages + pending actions
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4. Fix pre-existing frontend issues
  - [x] 4.1 Fix Settings.tsx duplicate renderProfile declaration
  - [x] 4.2 Fix Profile.tsx missing useNavigate and Edit imports
  - [x] 4.3 Verify zero TypeScript errors across frontend

## Notes

- AI provider: Groq (Llama 3.3 70B) — free tier, 30 requests/minute, 14,400/day
- All timetable modifications are frontend-only (localStorage) with best-effort backend sync
- The chatbot is the sole interface for AI planning — no separate form needed
- Friend timetable data comes from localStorage (populated when friends share their schedule)
- Backend infrastructure (Lambda + DynamoDB) for the full planning session workflow is built but requires `cdk deploy` to activate — not needed for the chatbot demo
- 157 backend unit tests pass covering the planning session services

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] }
  ]
}
```
