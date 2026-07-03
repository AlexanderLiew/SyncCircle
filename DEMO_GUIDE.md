# CramCircle / SyncCircle — Demo & Presentation Guide

## Quick Stubs for Demo (Paste in Console Before Presenting)

### Instantly grow character to each stage:
```javascript
// BABY (fresh start)
localStorage.setItem('synccircle_pomodoro_stats', JSON.stringify({totalSessions:0, totalMinutes:0, todaySessions:0, lastSessionDate:''}));
location.reload();

// KID (60 min studied)
localStorage.setItem('synccircle_pomodoro_stats', JSON.stringify({totalSessions:5, totalMinutes:60, todaySessions:2, lastSessionDate:'2026-07-03'}));
location.reload();

// TEEN (300 min studied)
localStorage.setItem('synccircle_pomodoro_stats', JSON.stringify({totalSessions:20, totalMinutes:300, todaySessions:3, lastSessionDate:'2026-07-03'}));
location.reload();

// SCHOLAR (1000 min studied — max evolution)
localStorage.setItem('synccircle_pomodoro_stats', JSON.stringify({totalSessions:50, totalMinutes:1000, todaySessions:5, lastSessionDate:'2026-07-03'}));
location.reload();
```

### Simulate study log for Study Hours graph:
```javascript
const log = [];
for (let i = 0; i < 7; i++) {
  const d = new Date(); d.setDate(d.getDate() - i);
  log.push({ date: d.toISOString().slice(0,10), minutes: Math.round(30 + Math.random() * 180) });
}
localStorage.setItem('synccircle_study_log', JSON.stringify(log));
location.reload();
```

### Seed friends + classes (if starting fresh):
```javascript
localStorage.removeItem('synccircle_classes');
localStorage.removeItem('synccircle_friends');
location.reload();
// Seed auto-loads on refresh
```

### Quick end a focus session (for demo):
Start the timer on Dashboard, wait 5 sec, click End → confirm "End Anyway" → session logged.

---

## Demo Flow & Script

### Opening (30 sec)
> "CramCircle is a student study companion that syncs your academic schedule, connects you with study buddies, and gamifies your focus time — all while integrating with Google Calendar so everything stays in sync across your devices."

---

### 1. Dashboard — Focus Timer (1 min)
**Show:** Dashboard with the Study Buddy character + Focus Timer

**Say:**
> "When you log in, you're greeted by your Study Buddy and the Focus Timer. Pick how long you want to study — 15, 25, 30, 45, or 60 minutes — and hit Start."

**Do:**
- Click 30m → Start → show character animating (studying state)
- Pause → End → show confirmation message ("You're X min away!")
- Click "End Anyway" → show celebration + "Session complete" toast

> "Every session grows your buddy and contributes to your study stats. The character evolves from a Baby → Kid → Teen → Scholar as you accumulate study hours."

**Do:** (Pre-stubbed to Scholar) Show the evolved character.

---

### 2. Timetable — Google Calendar Sync (1.5 min)
**Show:** Timetable page

**Say:**
> "The timetable lets you manage your class schedule. You can add classes manually, import a .ics file from your school portal, or connect your Google Calendar directly."

**Do:**
- Click "Connect Google Calendar" → OAuth popup → connect
- Show classes appearing
- Click "Sync All" → show sync success
- Click "Pull from Google" → import events

> "Every change automatically syncs to your Google Calendar — so your schedule shows up on your phone, laptop, anywhere."

---

### 3. Timetable — Friend Overlay (1 min)
**Show:** Filter View popover

**Say:**
> "The real power is collaboration. Click Filter View and check your friends' names to overlay their schedules on your grid."

**Do:**
- Toggle a friend → show colored overlay cards
- Point out green highlighted slots

> "Green slots show when everyone is free — perfect for scheduling study sessions together. Friends must be connected in the app for this to work."

---

### 4. Friends — Discovery & Connection (45 sec)
**Show:** Friends page

**Say:**
> "Adding friends is simple — search the user directory, click Add Friend, and once they accept, you can see each other's timetables."

**Do:**
- Show friend list
- Show incoming request → accept it

---

### 5. Notes — Group Collaboration (1 min)
**Show:** Notes → Shared Notes tab

**Say:**
> "For group study, create a Study Group. Anyone can find your group by name or tag and request to join. As the creator, you approve members."

**Do:**
- Create a group (e.g. "CS2040 Finals Prep", tag: "cs2040")
- Add a folder ("Week 12 Topics")
- Add a note inside

> "Once inside, all members share the same folders and notes — create study materials together in one place."

---

### 6. Profile — Gamification (45 sec)
**Show:** Profile page

**Say:**
> "Your Profile tracks everything — study hours, streaks, achievements. The Study Buddy grows as you study more. You can customize its color, and it reflects everywhere in the app."

**Do:**
- Show the character at current level
- Change color → show it update in header
- Show Study Hours graph
- Show achievements (some unlocked)

---

### 7. AI Study Planner (Teammate adds this)
**Say:**
> "The AI Planner uses your timetable, tasks, and study patterns to suggest optimal study schedules — powered by the Kiro API."

*(Teammate demos this section)*

---

### Closing (20 sec)
> "CramCircle brings everything together — your schedule, your friends, your study time, and your motivation — in one app that actually syncs with your real calendar. Built for students, by students."

---

## Conditions That Need to Work for Demo

| Feature | Requires | Fallback if not working |
|---------|----------|------------------------|
| Google Calendar sync | Google OAuth test user added | Show the connect flow, explain it works |
| Friend timetable overlay | `cdk deploy` done + real auth | Use dev bypass with seed data |
| Focus Timer → Profile stats | Just use the app normally | Pre-stub via console |
| Character growth | Study minutes accumulated | Pre-stub via console |
| Notes group sharing | Just localStorage | Works locally, explain backend-ready |
| AI Planner | Teammate's feature | They demo their part |

---

## For the AI Planner Teammate

### What's already built that you can use:

**Available data (from localStorage):**
```typescript
import { getClasses, getTasks, getUser, getSettings } from '../lib/storage';

// User's class schedule
const classes = getClasses(); // TimetableClass[] — title, dayOfWeek, startTime, endTime

// User's tasks
const tasks = getTasks(); // Task[] — title, dueDate, priority, completed

// User info
const user = getUser(); // User — displayName, email

// Study preferences
const settings = getSettings(); // UserSettings — aiPreferences.responseStyle, planningAggressiveness
```

**Pomodoro / study stats:**
```typescript
const POMODORO_STORAGE_KEY = 'synccircle_pomodoro_stats';
const STUDY_LOG_KEY = 'synccircle_study_log';
// Read with: JSON.parse(localStorage.getItem(key))
```

**Friends' timetables (if connected):**
```typescript
import { apiClient } from '../lib/api-client';
// GET /friends → list of friends
// GET /friends/:friendId/timetable → their classes
```

**What the AI Planner should do:**
1. Read the user's classes + tasks + study log
2. Find free slots in their timetable
3. Suggest study blocks based on task deadlines and priorities
4. Optionally suggest group study times (from friend free slots)
5. Chat interface (already scaffolded in `pages/AIPlanner.tsx`)

**Hook to use for Kiro API:**
```typescript
import { useKiroAPI } from '../hooks/useKiroAPI';
// Already exists — sends messages to VITE_KIRO_API_URL
```

**Env var needed:**
```
VITE_KIRO_API_URL=https://your-kiro-api-endpoint
```

### Your workflow:
1. Create a new branch from `3july-harry-mergefix`
2. Implement the AI chat logic in `pages/AIPlanner.tsx`
3. Read user data from the helpers above and include in the AI prompt context
4. Use `MERGE_CHECKLIST.md` to verify you haven't broken any of Harry's features
5. Push and PR

---

## Technical Notes

- App runs on `http://localhost:5173`
- Run: `cd SyncCircle && corepack pnpm dev`
- Dev bypass (`VITE_DEV_BYPASS_AUTH=true`) skips login — use for demo prep
- Set bypass to `false` for live multi-user demo with real accounts
- Google Calendar works on localhost (OAuth origin configured)
- Backend deploy needed for friend timetable sharing across users: `corepack pnpm exec cdk deploy --require-approval never` from `apps/backend`
