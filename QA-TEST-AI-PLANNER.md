# QA Test Plan — AI Planner Feature

## Prerequisites

- [ ] Frontend running (`cd SyncCircle/apps/frontend && npm run dev`)
- [ ] `VITE_GROQ_API_KEY` set in `.env` (Groq free tier key)
- [ ] Logged in (or `VITE_DEV_BYPASS_AUTH=true` for dev mode)
- [ ] At least 1 class in Timetable page
- [ ] At least 1 friend in Friends page (dev mode has Alice Tan, Bob Lim, Charlie Wong)

---

## Test 1: AI Chat Responds

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to AI Planner page | Page loads with header, mode selector, form, and chat section |
| 2 | Type "hi" in chat and send | AI responds with a greeting (no error) |
| 3 | Check console (F12) | No 429 or 400 errors |

**Result:** ☐ Pass ☐ Fail

---

## Test 2: Add Class (Free Slot)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "Add Machine Learning on Monday 2pm to 4pm" | AI confirms the slot is free and shows a **Confirm** button |
| 2 | Click **Confirm** | Success message "✅ Added Machine Learning..." appears |
| 3 | Go to Timetable page | "Machine Learning" appears on Monday 14:00-16:00 |

**Result:** ☐ Pass ☐ Fail

---

## Test 3: Add Class (Conflict Detection)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Note an existing class (e.g., OS on Wednesday 10:00-12:00) | |
| 2 | Type: "Add a class on Wednesday 10am to 12pm" | AI warns about conflict with OS |
| 3 | AI suggests alternative free times on Wednesday | Shows times like "08:00-10:00, 12:00-17:00" |
| 4 | NO Confirm button appears (because it's a conflict) | Action block not shown |

**Result:** ☐ Pass ☐ Fail

---

## Test 4: Add Class Despite Conflict

| Step | Action | Expected |
|------|--------|----------|
| 1 | After Test 3, type: "Add it anyway" | AI shows Confirm button for the conflicting slot |
| 2 | Click **Confirm** | Class is added (overlapping is allowed when user insists) |
| 3 | Go to Timetable page | Both classes visible in the same slot |

**Result:** ☐ Pass ☐ Fail

---

## Test 5: Delete a Class

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "Remove Machine Learning from Monday" | AI confirms and shows **Confirm** button |
| 2 | Click **Confirm** | Success message "✅ Deleted Machine Learning..." |
| 3 | Go to Timetable page | Machine Learning no longer on Monday |

**Result:** ☐ Pass ☐ Fail

---

## Test 6: Move a Class

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "Move Data Structures from Monday to Thursday 9am to 11am" | AI asks: move it (delete old + add new)? |
| 2 | Type: "Yes move it" | AI shows Confirm button with MOVE_CLASS action |
| 3 | Click **Confirm** | Success message "✅ Moved Data Structures..." |
| 4 | Go to Timetable page | Data Structures now on Thursday 9-11, gone from Monday |

**Result:** ☐ Pass ☐ Fail

---

## Test 7: Find Free Time with Friend

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "When are me and Alice Tan free this week?" | AI shows both schedules and lists mutual free slots |
| 2 | Check AI lists specific days and times | Not generic — actual times like "Monday: 12:00-22:00" |
| 3 | Free slots don't overlap with either person's classes | AI cross-referenced correctly |

**Result:** ☐ Pass ☐ Fail

---

## Test 8: Schedule Group Event

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "Schedule a study session with Alice on Thursday 4pm to 6pm" | AI checks both schedules, confirms both are free |
| 2 | **Confirm** button appears | Shows "Schedule Study Session on Thursday 16:00-18:00 with Alice Tan" |
| 3 | Click **Confirm** | Success message + toast "Email sent to Alice Tan" |
| 4 | Go to Timetable page | "Study Session" appears on Thursday 16:00-18:00 |

**Result:** ☐ Pass ☐ Fail

---

## Test 9: Schedule with Conflict (Friend Busy)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Check Alice's schedule (she has Computer Networks Thu 13:00-15:00) | |
| 2 | Type: "Schedule study with Alice on Thursday 2pm to 4pm" | AI warns Alice has Computer Networks 13:00-15:00 that conflicts |
| 3 | AI suggests alternative times when both are free | No Confirm button for conflicting slot |

**Result:** ☐ Pass ☐ Fail

---

## Test 10: Extend a Class

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "Extend my Data Structures class on Monday until 12pm" | AI confirms and shows **Confirm** button |
| 2 | Click **Confirm** | Success message "✅ Extended Data Structures..." |
| 3 | Go to Timetable page | Data Structures now shows 09:00-12:00 (was 09:00-11:00) |

**Result:** ☐ Pass ☐ Fail

---

## Test 11: UI Components Render

| Step | Action | Expected |
|------|--------|----------|
| 1 | AI Planner page loads | Mode selector shows "Personal" / "Plan with Friends" |
| 2 | Click "Plan with Friends" | Friend selector appears in the form |
| 3 | Fill out form (Activity, Duration, Dates) | "Find Times" button is enabled |
| 4 | Invitations section exists | "Invitations" button in header (badge shows 0) |

**Result:** ☐ Pass ☐ Fail

---

## Test 12: Chat Persistence

| Step | Action | Expected |
|------|--------|----------|
| 1 | Send a few messages in chat | Messages appear |
| 2 | Navigate to another page (e.g., Timetable) | |
| 3 | Come back to AI Planner | Chat history is preserved |
| 4 | Click "Clear" | All messages gone |

**Result:** ☐ Pass ☐ Fail

---

## Test 13: Context Awareness

| Step | Action | Expected |
|------|--------|----------|
| 1 | Type: "What classes do I have?" | AI lists your actual timetable classes correctly |
| 2 | Type: "What's my schedule on Monday?" | AI shows only Monday classes |
| 3 | Type: "When am I free on Wednesday?" | AI shows free slots around existing classes |

**Result:** ☐ Pass ☐ Fail

---

## Test 14: Error Handling

| Step | Action | Expected |
|------|--------|----------|
| 1 | Remove `VITE_GROQ_API_KEY` from .env, restart dev server | |
| 2 | Send a message | Error message: "Groq API key not configured..." |
| 3 | Restore the key, restart | Chat works again |

**Result:** ☐ Pass ☐ Fail

---

## Test 15: Backend Tests Pass

| Step | Action | Expected |
|------|--------|----------|
| 1 | Run: `cd SyncCircle/apps/backend && npx vitest run` | All 157 tests pass |
| 2 | Run: `cd SyncCircle/apps/frontend && npx tsc --noEmit` | Zero TypeScript errors |

**Result:** ☐ Pass ☐ Fail

---

## Summary

| Test | Feature | Status |
|------|---------|--------|
| 1 | Chat responds | ☐ |
| 2 | Add class (free) | ☐ |
| 3 | Conflict detection | ☐ |
| 4 | Override conflict | ☐ |
| 5 | Delete class | ☐ |
| 6 | Move class | ☐ |
| 7 | Friend availability | ☐ |
| 8 | Group scheduling | ☐ |
| 9 | Friend conflict | ☐ |
| 10 | Extend class | ☐ |
| 11 | UI components | ☐ |
| 12 | Chat persistence | ☐ |
| 13 | Context awareness | ☐ |
| 14 | Error handling | ☐ |
| 15 | Backend tests | ☐ |

**Total: 15 tests | Pass: ___ | Fail: ___**
