# Design Document: AI Planner Integration

## Overview

The AI Planner is a conversational chatbot on the AI Planner page that allows students to manage their timetable and coordinate with friends through natural language. It uses Groq's Llama 3.3 70B model (free tier) called directly from the frontend browser, with structured action blocks for timetable modifications that require explicit user confirmation.

### Key Design Decisions

1. **Frontend-direct AI calls** — The chatbot calls Groq API directly from the browser (no backend Lambda required), enabling instant setup with just an API key.
2. **Structured action blocks** — The AI outputs `[ACTION:TYPE]{json}[/ACTION]` blocks that the frontend parses into confirmable actions, separating AI reasoning from system execution.
3. **Explicit confirmation model** — No timetable modification happens without the user clicking "Confirm", preventing accidental changes.
4. **Context-rich system prompt** — Every request includes the full timetable, pre-computed free slots, and all friends' timetables so the AI can make accurate scheduling decisions.
5. **Conflict detection via AI** — The system prompt instructs the AI to check for time overlaps before proposing any action, with the conflict formula embedded in the prompt.

## Architecture

```
User types message
       ↓
Frontend builds context (timetable + friends + free slots)
       ↓
Groq API (Llama 3.3 70B) — OpenAI-compatible endpoint
       ↓
AI response (text + optional [ACTION] block)
       ↓
Frontend parses response:
  - Displays text in chat bubble
  - If [ACTION] found → shows "Confirm" button
       ↓ (user clicks Confirm)
executeAction() → modifies localStorage → syncs to backend
       ↓
Success/error message shown in chat
```

## Components and Interfaces

### 1. useKiroAPI Hook (`hooks/useKiroAPI.ts`)

Manages the Groq API communication:
- Builds the system prompt with full timetable context, free slots, and friend data
- Calls `https://api.groq.com/openai/v1/chat/completions` with Bearer auth
- Uses `llama-3.3-70b-versatile` model
- 15-second timeout with error handling

**System Prompt includes:**
- User's current timetable (all classes with day/time/location)
- Pre-computed free time slots per day (08:00–22:00)
- All friends and their timetable data
- Action instructions (ADD_CLASS, DELETE_CLASS, MOVE_CLASS, EXTEND_CLASS, FIND_FREE_TIME, SCHEDULE_EVENT)
- Conflict detection rules
- Rescheduling rules (move vs keep both vs extend)
- Friend availability cross-checking rules

### 2. Chat Actions Module (`lib/chat-actions.ts`)

Handles action parsing and execution:

**Action Types:**
| Type | Data Fields | What it does |
|------|-------------|--------------|
| `ADD_CLASS` | title, moduleCode, dayOfWeek, startTime, endTime, location | Saves new class to localStorage |
| `DELETE_CLASS` | title, dayOfWeek | Removes class from localStorage |
| `MOVE_CLASS` | title, fromDay, toDay, newStartTime, newEndTime | Updates class day/time |
| `EXTEND_CLASS` | title, dayOfWeek, newEndTime | Updates class endTime |
| `FIND_FREE_TIME` | friendNames[] | Computes mutual free slots |
| `SCHEDULE_EVENT` | title, dayOfWeek, startTime, endTime, friendNames[], location | Adds event + notifies friends |

**Key Functions:**
- `parseActions(aiResponse)` — regex extracts `[ACTION:TYPE]{json}[/ACTION]` blocks, returns clean text + actions
- `executeAction(action)` — dispatches to type-specific handler
- Each handler: modifies localStorage → syncs to backend via `apiClient.put('/timetable', { classes })`

### 3. AI Planner Page (`pages/AIPlanner.tsx`)

A clean chat-only interface:
- Header with "AI Study Planner" branding
- Full-height chat message area with auto-scroll
- Message bubbles (user right, AI left) with timestamps
- Pending action cards below AI messages with "Confirm" button
- Loading indicator (typing dots)
- Error display with Retry button
- Clear chat button
- Chat persistence via localStorage

## Data Models

### TimetableClass (localStorage)

```typescript
interface TimetableClass {
  id: string;              // UUID
  title: string;           // e.g., "Machine Learning"
  moduleCode: string;      // e.g., "CS3244" or "EVENT"
  location: string;        // e.g., "COM1-0212"
  dayOfWeek: 0|1|2|3|4;   // Monday=0, Tuesday=1, ..., Friday=4
  startTime: string;       // "HH:mm" (24h)
  endTime: string;         // "HH:mm" (24h)
  color: string;           // hex color for UI
  source: 'personal' | 'imported';
}
```

### ChatAction (parsed from AI response)

```typescript
interface ChatAction {
  type: 'ADD_CLASS' | 'DELETE_CLASS' | 'MOVE_CLASS' | 'EXTEND_CLASS' | 'FIND_FREE_TIME' | 'SCHEDULE_EVENT';
  data: any;               // type-specific JSON payload
  description: string;     // human-readable summary for Confirm button
}
```

### Friend (localStorage)

```typescript
interface Friend {
  id: string;
  userId: string;
  friendId: string;
  displayName: string;
  status: 'online' | 'offline' | 'studying';
  timetable: TimetableClass[];  // friend's classes for availability overlay
}
```

### ChatMessage (localStorage)

```typescript
interface ChatMessage {
  id: string;
  groupId: string;
  senderId: 'user' | 'ai';
  senderName: string;
  content: string;
  timestamp: string;       // ISO 8601
}
```

## Data Flow

### Adding a Class

```
User: "Add ML on Tuesday 10-12"
       ↓
System prompt includes current timetable → AI sees Tuesday schedule
       ↓
AI checks: Is Tuesday 10-12 free? (using free slots in context)
       ↓
If free: "I'll add ML on Tuesday 10:00-12:00. [ACTION:ADD_CLASS]{...}[/ACTION]"
If conflict: "⚠️ You have OS at that time. Free slots: 08-10, 12-22. Want one of those?"
       ↓
Frontend shows Confirm button (if action block present)
       ↓
User clicks Confirm → executeAddClass() → saveClass() → backend sync
       ↓
"✅ Added ML to your timetable!"
```

### Finding Free Time with Friends

```
User: "When are me and Alice free?"
       ↓
System prompt includes Alice's timetable from localStorage
       ↓
AI compares both schedules → lists mutual free slots per day
       ↓
AI response: "Monday: 12:00-22:00, Tuesday: 11:00-14:00, ..."
       ↓
User: "Schedule study on Monday 2-4pm"
       ↓
AI checks both are free → [ACTION:SCHEDULE_EVENT]{...}[/ACTION]
       ↓
Confirm → adds to timetable + toast "Email sent to Alice"
```

## Environment Configuration

```env
# Required for AI chat
VITE_GROQ_API_KEY=gsk_...   # From console.groq.com

# Required for backend sync (already deployed)
VITE_API_BASE_URL=https://951chm3o9k.execute-api.ap-southeast-1.amazonaws.com/prod
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Groq API key missing | Shows "Groq API key not configured" error |
| Groq API timeout (>15s) | Shows "Request timed out" with Retry button |
| Groq rate limit (429) | Shows "AI service error (429)" with Retry |
| Class not found for delete/move | Shows "❌ Could not find [class] on [day]" |
| Action execution failure | Shows error in chat, pending action removed |
| Network disconnected | Shows "Unable to connect" with Retry |

## Correctness Properties

### Property 1: No modification without confirmation

For any timetable action proposed by the AI, the system SHALL NOT execute it until the user clicks "Confirm".

### Property 2: Conflict detection accuracy

For any two time ranges on the same day, the AI SHALL correctly identify overlap using: startA < endB AND startB < endA.

### Property 3: Context freshness

Every AI request SHALL include the current state of the timetable from localStorage (not stale cached data).

### Property 4: Action block integrity

The `parseActions()` function SHALL correctly extract all `[ACTION:TYPE]{json}[/ACTION]` blocks and return clean text with blocks removed.

### Property 5: Friend availability correctness

The FIND_FREE_TIME action SHALL compute mutual free time by checking all users' classes for each day, returning only slots where NO user has a class.

## Testing Strategy

### Unit Tests (Backend — 157 passing)
```bash
cd SyncCircle/apps/backend && npx vitest run
```
- Availability calculator (merge, compute, intersect free periods)
- Planning session service (validation, status transitions, cancellation cascade)
- Meeting invitation lifecycle (accept, reject, expiry, rollup)
- Privacy enforcement (no timetable leakage)
- Rate limiter

### Type Checking (Frontend)
```bash
cd SyncCircle/apps/frontend && npx tsc --noEmit  # 0 errors
```

### Manual QA (15 scenarios)
See `QA-TEST-AI-PLANNER.md` covering:
- Add/delete/move/extend classes
- Conflict detection + override
- Friend availability cross-check
- Group scheduling with email notification
- Chat persistence and error handling
