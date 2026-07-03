# Merge Safety Checklist — Do NOT Overwrite These

Use this file when merging into Harry's branch. Feed this to Kiro and it will verify nothing critical was lost.

---

## How to Use

1. After merging, paste this file into Kiro CLI
2. Ask: "Check that all the files and features listed here still exist and haven't been overwritten or broken"
3. Kiro will verify each item

---

## Critical Files — Must Exist and Not Be Emptied

### Google Calendar Integration
- [ ] `apps/frontend/src/app/lib/google-calendar.ts` — OAuth2 + Calendar API client
- [ ] `apps/frontend/src/app/lib/ics-parser.ts` — .ics file parser
- [ ] `apps/frontend/src/app/hooks/useGoogleCalendar.ts` — React hook wrapping Google Calendar

### Timetable Backend
- [ ] `apps/backend/src/handlers/timetable/put.ts` — PUT /timetable Lambda
- [ ] `apps/backend/src/handlers/timetable/get-friend.ts` — GET /friends/:friendId/timetable Lambda
- [ ] `apps/backend/cdk/lib/dynamodb-construct.ts` — must contain `UserTimetables` table

### Focus Timer
- [ ] `apps/frontend/src/app/components/FocusTimerWidget.tsx` — Dashboard focus timer

### Character System
- [ ] `apps/frontend/src/app/components/ProfileCharacter.tsx` — must have `BabyStage`, `KidStage`, `TeenStage`, `ScholarStage` functions + `CHARACTER_COLORS` + `getEvolutionFromMinutes`

### Seed Data
- [ ] `apps/frontend/src/app/lib/seed-data.ts` — test data auto-loader

### Storage
- [ ] `apps/frontend/src/app/lib/storage.ts` — must contain `getGroupFolders`, `saveGroupFolder`, `getGroupNotes`, `saveGroupNote`, `updateFriendTimetable`

### Types
- [ ] `apps/frontend/src/app/types/index.ts` — must contain `GroupFolder`, `GroupNote`, `StudyGroup` (with `tag`, `creatorId`, `pendingMembers`)

### Shared Package
- [ ] `packages/shared/src/types/api.ts` — must contain `TIMETABLE` and `FRIENDS_TIMETABLE` in API_PATHS
- [ ] `packages/shared/src/index.ts` — imports must NOT have `.js` extensions

---

## Critical Features in Timetable.tsx — Verify These Exist

- [ ] `import { useGoogleCalendar }` (NOT useWorkato)
- [ ] `import { parseICSFromFile }`
- [ ] `import { apiClient }`
- [ ] `handleSyncToGoogleCalendar` function defined
- [ ] `handleImportFromGoogle` function with `weekOffset` parameter
- [ ] `handleICSImport` function
- [ ] `syncTimetableToBackend` function (calls `apiClient.put('/timetable', ...)`)
- [ ] `handleToggleFriend` fetches from `/friends/${friendId}/timetable`
- [ ] Filter View Popover with checkboxes (showMyClasses + friends)
- [ ] "Pull from Google" button in JSX
- [ ] "Sync All" button in JSX
- [ ] "Import .ics" button in JSX
- [ ] "Connect Google Calendar" / "Disconnect Google" buttons
- [ ] Week navigation (prev/next buttons with `weekOffset` state)
- [ ] Friend class overlay rendering on grid (colored bordered cards)
- [ ] Green highlighted free slots
- [ ] Friends loaded from API when `VITE_DEV_BYPASS_AUTH=false`

---

## Critical Features in Dashboard.tsx

- [ ] `FocusTimerWidget` imported and rendered (replaces old "Recent Activity" section)
- [ ] Focus timer shows `ProfileCharacter` with `size="md"`

---

## Critical Features in Profile.tsx

- [ ] `ProfileCharacter` in header avatar with `size="sm"`
- [ ] `CHARACTER_COLORS` color picker (10 pastel colors)
- [ ] `getEvolutionFromMinutes(pomodoroStats.totalMinutes)` — NOT streak-based
- [ ] Study Hours graph reads from `studyLog` (live data, NOT static `weeklyData`)
- [ ] `radarData` computed from real metrics (useMemo)
- [ ] `favoriteModules` computed from `getClasses()`
- [ ] `recentActivity` computed from real tasks/notes
- [ ] Per-user storage keys via `userKey()` function
- [ ] `useEffect` with `window.addEventListener('focus', handleFocus)` for re-syncing stats
- [ ] Module grades BarChart with `angle={-35}` on XAxis

---

## Critical Features in Notes.tsx (Shared Notes Tab)

- [ ] "Create Group" button + modal (name + tag)
- [ ] "Find Groups" button + modal (searchable list, "Request to Join")
- [ ] Pending member approval (creator accepts/rejects)
- [ ] Group folders within each group
- [ ] Group notes within folders (with author name)
- [ ] Group note edit modal

---

## CDK Stack — Verify in lambda-construct.ts

- [ ] `putTimetableHandler` defined
- [ ] `getFriendTimetableHandler` defined
- [ ] `getUsersHandler` defined (Alex's addition)
- [ ] `userTimetablesTable` in props and commonEnv
- [ ] `depsLockFilePath` pointing to `package-lock.json`

## CDK Stack — Verify in api-construct.ts

- [ ] `PUT /timetable` route
- [ ] `GET /friends/{friendId}/timetable` route
- [ ] `GET /users` route (Alex's addition)

---

## .env Settings (Do NOT commit .env, but verify .env.example)

- [ ] `VITE_GOOGLE_CLIENT_ID` placeholder exists in `.env.example`
- [ ] `VITE_DEV_BYPASS_AUTH` mentioned somewhere (env.example or README)

---

## Auth Bypass — Verify in useAuth.ts

- [ ] `VITE_DEV_BYPASS_AUTH` check at top of `AuthProvider`
- [ ] Returns mock `devUser` when bypass is true
- [ ] Does NOT break real Cognito flow when bypass is false

---

## If Any Item Fails

DO NOT proceed with the merge. Flag the issue and restore the missing code from branch `3july-harry-mergefix`.
