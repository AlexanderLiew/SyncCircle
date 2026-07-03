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

### 7. AI Study Planner (1.5 min)
**Show:** AI Planner page (chat interface)

**Say:**
> "The AI Planner is a smart scheduling assistant. It can read your timetable, detect conflicts, find free time with friends, and add or move classes — all through natural conversation."

**Do: (a) Ask about schedule**
- Type: "What's my schedule this week?"
- AI lists all your classes by day

**Do: (b) Add a class with conflict**
- Type: "Add Machine Learning on Wednesday 10am to 12pm"
- AI warns: "You have Operating Systems at that time" + suggests free slots

**Do: (c) Add a class to a free slot**
- Type: "Add it on Monday 2pm to 4pm instead"
- AI shows Confirm button → click Confirm
- Switch to Timetable → show "Machine Learning" now on Monday 2-4pm

**Do: (d) Find free time with friend**
- Type: "When are me and Alice Tan free this week?"
- AI shows mutual free slots by day

**Do: (e) Schedule with friend**
- Type: "Schedule a study session with Alice on Thursday 4pm to 6pm"
- AI checks both schedules → shows Confirm button → click Confirm
- Toast: "Email sent to Alice Tan" appears

> "Everything is permission-based — the AI always asks before making changes, and your friends get notified by email when you schedule group events."

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

## AI Planner — Demo Setup

The AI Planner is fully built and uses Groq (Llama 3.3 70B). To demo:

1. Make sure `VITE_GROQ_API_KEY` is set in `.env`
2. Make sure `VITE_DEV_BYPASS_AUTH=true` (loads seed data with 3 friends + 5 classes)
3. Run `npm run dev` from `apps/frontend`
4. Go to AI Planner page and follow the demo script above

**What works in demo:**
- Add/delete/move/extend classes via chat
- Conflict detection with alternative suggestions
- Friend availability cross-check (uses seed data timetables)
- Group event scheduling with email notification toast
- Chat persistence across page navigation

**Quick demo seed (paste in console if needed):**
```javascript
// Ensure seed data is loaded with friends + timetable
localStorage.removeItem('synccircle_classes');
localStorage.removeItem('synccircle_friends');
localStorage.removeItem('synccircle_chat_history');
location.reload();
// Seed auto-loads on refresh when dev bypass is on
```

---

## Technical Notes

- App runs on `http://localhost:5173`
- Run: `cd SyncCircle && corepack pnpm dev`
- Dev bypass (`VITE_DEV_BYPASS_AUTH=true`) skips login — use for demo prep
- Set bypass to `false` for live multi-user demo with real accounts
- Google Calendar works on localhost (OAuth origin configured)
- Backend deploy needed for friend timetable sharing across users: `corepack pnpm exec cdk deploy --require-approval never` from `apps/backend`
