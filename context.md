# SyncCircle / CramCircle — Project Context

## Latest Update: 2 July 2026 (Thu, ~3:40 AM SGT)

---

## Today's Changes (2 Jul 2026)

### What was built
| Feature | Description |
|---------|-------------|
| **Google Calendar API integration** | Replaced Workato webhook with direct Google Calendar API v3 calls from the browser. OAuth2 popup flow, token stored in localStorage. |
| **Import .ics** | Users can upload `.ics` files (from school portal, Outlook, etc.) to bulk-import classes into the timetable. |
| **Pull from Google Calendar** | One-click import of this week's events from your connected Google Calendar. |
| **Friend timetable overlay** | Filter View popover with checkboxes — toggle your own classes and each friend's timetable on/off. Friend classes render as colored bordered cards on the grid. Green slots = common free time. |
| **Sync to Google Calendar** | Pushes all your timetable classes as real events to your Google Calendar (only shows when connected). |
| **Dev auth bypass** | `VITE_DEV_BYPASS_AUTH=true` in `.env` skips Cognito login for local testing. |
| **Seed data** | Auto-loads 3 test friends (Alice, Bob, Charlie) with timetables + 5 sample classes on first run. |
| **Fixed `@synccircle/shared` Vite error** | Removed `.js` extensions from shared package imports so Vite can resolve them. |
| **Fixed pnpm workspace linking** | Ran `corepack pnpm install` to set up symlinks for `@synccircle/shared`. |

### New files created
| File | Purpose |
|------|---------|
| `apps/frontend/src/app/lib/google-calendar.ts` | Google Calendar API client (OAuth2 + CRUD via REST) |
| `apps/frontend/src/app/lib/ics-parser.ts` | .ics file parser → TimetableClass[] |
| `apps/frontend/src/app/lib/seed-data.ts` | Auto-seeds test friends + classes if localStorage is empty |
| `apps/frontend/src/app/hooks/useGoogleCalendar.ts` | React hook wrapping Google Calendar client |

### Modified files
| File | What changed |
|------|--------------|
| `apps/frontend/src/app/pages/Timetable.tsx` | Replaced Workato with Google Calendar API, added .ics import button, Filter View popover with friend checkboxes, friend overlay rendering on grid, Google connect/disconnect buttons |
| `apps/frontend/src/app/lib/storage.ts` | Added `updateFriendTimetable()`, `getFriendTimetable()`, `shareMyTimetableWithFriend()` |
| `apps/frontend/src/app/hooks/useAuth.ts` | Added dev bypass mode (`VITE_DEV_BYPASS_AUTH=true`) |
| `apps/frontend/src/main.tsx` | Calls `seedTestData()` on startup |
| `apps/frontend/.env` | Added `VITE_DEV_BYPASS_AUTH=true` |
| `apps/frontend/.env.example` | Added `VITE_GOOGLE_CLIENT_ID` |
| `packages/shared/src/index.ts` | Removed `.js` extensions from imports (Vite fix) |

---

## .env Setup Status

| Variable | Status | Notes |
|----------|--------|-------|
| `VITE_API_BASE_URL` | ✅ Done | Points to deployed API Gateway |
| `VITE_COGNITO_USER_POOL_ID` | ✅ Done | |
| `VITE_COGNITO_CLIENT_ID` | ✅ Done | |
| `VITE_GOOGLE_CLIENT_ID` | ✅ Done | Created via Google Cloud Console |
| `VITE_DEV_BYPASS_AUTH` | ✅ Done | Set to `true` — skips Cognito login for local dev |
| `VITE_KIRO_API_URL` | ❌ Not set | Only needed if using AI note summarization / planner chat |
| `VITE_WORKATO_WEBHOOK_URL` | ⏭️ Removed | Legacy. Google Calendar API replaced it entirely |

---

## How to Run

```powershell
cd "C:\Users\Harry\Desktop\SIT\AWS KIRO\Actl proj\CramCircle\SyncCircle"
corepack pnpm install   # first time only (sets up workspace links)
corepack pnpm dev       # starts Vite on http://localhost:5173
```

- With `VITE_DEV_BYPASS_AUTH=true`, you skip login and go straight to the app.
- Seed data auto-loads on first run (3 friends + 5 classes). It won't overwrite if data exists.
- To re-seed: clear `synccircle_classes` and `synccircle_friends` from localStorage, then refresh.

---

## Google Calendar Integration

### What it does
- Lets users connect their Google Calendar via an OAuth2 popup
- Sync pushes your timetable classes as real events to your Google Calendar
- Pull imports events from your Google Calendar into the app
- Each user syncs to **their own** calendar (not a shared one)

### Setup (already done)
1. Created OAuth Client ID in Google Cloud Console (Google Auth Platform)
2. Application type: Web application
3. Authorized JavaScript origins: `http://localhost:5173`
4. Authorized redirect URIs: `http://localhost:5173`
5. Added the scope: `Google Calendar API → calendar.events`
6. **Enabled Google Calendar API** in the project: [APIs & Services → Library → Google Calendar API → Enable](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
7. Publishing status: **Testing** (not published)

### Key info
- The Client ID is **safe to share** — it's public by design (embedded in frontend code)
- While in Testing mode, only emails added as **test users** can use the OAuth flow
- Test user tokens expire every 7 days (they just re-authorize)
- Max 100 test users allowed
- Google Calendar API is **free** (generous quota)

### When we deploy
- Add the production URL to Authorized JavaScript origins + redirect URIs in Google Cloud Console
- Keep `localhost:5173` so local dev still works
- The Client ID stays the same

---

## How the Timetable Works

### Adding classes (3 ways)
1. **Manually** — click "Add Class", fill the form
2. **Import .ics** — upload a `.ics` file from school portal (e.g. STARS/ModReg)
3. **Pull from Google Calendar** — fetches your current week's events

### Data storage
- Timetable classes are stored in **localStorage** (browser only, not in DynamoDB)
- Friends list comes from the backend (API Gateway → Lambda → DynamoDB)
- Friend timetable sharing is currently **simulated locally** (localStorage via seed data)

### Google Calendar sync flow
- **"Connect Google Calendar"** → OAuth2 popup → token saved in localStorage
- **"Sync to Google"** → pushes all local classes as Google Calendar events
- **"Pull from Google"** → imports this week's events from Google Calendar into local timetable
- **"Import .ics"** → file picker → parses VEVENT entries → saves to localStorage
- Works on `localhost` — the OAuth flow is browser ↔ Google directly, no backend needed

### Friend filter / free slots
- **Filter View** popover: check/uncheck "My Classes" + individual friends
- Friend classes show as colored bordered cards on the grid
- **Green highlighted slots** = times where everyone selected is free
- Currently uses seed data; when backend friend timetable sharing is wired up, it'll pull real data

---

## Workflow & Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Vite React SPA)                               │
│                                                         │
│  Timetable Page                                         │
│  ├── Add Class manually                                 │
│  ├── Import .ics file (parsed client-side)              │
│  ├── Pull from Google Calendar (REST API)               │
│  ├── Sync to Google Calendar (REST API)                 │
│  ├── Filter View (checkboxes for self + friends)        │
│  └── Friend overlays + free slot highlighting           │
│                                                         │
│  Data: localStorage (classes, friends, tasks, settings) │
│  Auth: Cognito (or dev bypass for testing)              │
│  Google: OAuth2 popup → token in localStorage → REST    │
└─────────────────────────────────────────────────────────┘
         │                              │
         │ Friends API                  │ Google Calendar API v3
         ▼                              ▼
  ┌──────────────┐           ┌─────────────────────┐
  │ API Gateway  │           │ googleapis.com      │
  │ → Lambda     │           │ /calendar/v3/...    │
  │ → DynamoDB   │           │ (direct from browser│
  │ → SES        │           │  with OAuth token)  │
  └──────────────┘           └─────────────────────┘
```

---

## For Teammates

### To run the project
```powershell
git pull
cd CramCircle/SyncCircle
corepack pnpm install
corepack pnpm dev
```
Open `http://localhost:5173/timetable`. No login needed (dev bypass is on).

### What you need to do

1. **Give Harry your Gmail address** — he'll add you as a test user in Google Cloud Console so you can use the Google Calendar sync feature.

2. **When running the app locally**, click "Connect Google Calendar" → sign in with the Gmail you gave Harry.

3. **Your calendar is yours** — syncing pushes events to YOUR Google Calendar only. Nobody else can see or modify your calendar through the app.

4. **If you get "This app isn't verified"** — click "Advanced" → "Go to SyncCircle (unsafe)". It's safe, it just means the app is in testing mode. If your email wasn't added as a test user, let Harry know.

5. **Token expires every 7 days** — if sync stops working, click "Connect Google Calendar" again. Normal in Testing mode.

6. **To reset test data** — open browser console and run:
   ```javascript
   localStorage.removeItem('synccircle_classes');
   localStorage.removeItem('synccircle_friends');
   location.reload();
   ```

### What changed from before
- **Workato is gone** — we no longer use the Workato webhook for Google Calendar sync. It's all direct API now (simpler, no middleman, bidirectional).
- **Timetable now syncs to DynamoDB** — when logged in with real Cognito, class changes auto-save to backend so friends can see your timetable.
- **Friend timetable comparison works** — use Filter View to overlay friends' schedules and find common free time. In dev mode uses seed data; with real auth it fetches from backend.
- **Week navigation** — prev/next buttons on timetable, Pull from Google uses the selected week.

### What NOT to worry about
- You don't need your own Google Cloud project
- You don't need to create your own Client ID
- The app won't charge you anything or access anything beyond your calendar events
- You can revoke access anytime from Google Account → Security → Third-party apps

---

## For the AWS Person (Backend Deployment)

### What was added (not yet deployed — needs `cdk deploy`)

| Resource | Description |
|----------|-------------|
| **`UserTimetables` DynamoDB table** | Stores each user's timetable classes, keyed by `userId`. PAY_PER_REQUEST (free when idle). |
| **`SyncCircle-Timetable-Put` Lambda** | `PUT /timetable` — saves user's classes to DynamoDB. Called automatically by frontend on every add/edit/delete. |
| **`SyncCircle-Timetable-GetFriend` Lambda** | `GET /friends/{friendId}/timetable` — returns a friend's timetable. Checks Friendships table first → 403 if not friends. |
| **2 API Gateway routes** | Wired to above Lambdas, Cognito JWT auth required. |

### How it works
```
User adds class → localStorage + PUT /timetable → DynamoDB
Friend opens Filter View → GET /friends/{userId}/timetable → checks friendship → returns classes
```

### Backend files changed
| File | What |
|------|------|
| `apps/backend/cdk/lib/dynamodb-construct.ts` | Added `UserTimetables` table |
| `apps/backend/cdk/lib/lambda-construct.ts` | Added 2 new Lambdas, `userTimetablesTable` prop, npm lockfile fix |
| `apps/backend/cdk/lib/api-construct.ts` | Added `PUT /timetable` + `GET /friends/{friendId}/timetable` routes |
| `apps/backend/cdk/lib/friends-stack.ts` | Passes new table + handlers through |
| `apps/backend/src/handlers/timetable/put.ts` | New handler — validates & saves classes |
| `apps/backend/src/handlers/timetable/get-friend.ts` | New handler — friendship check + fetch |
| `apps/backend/package-lock.json` | Created so CDK uses npx (pnpm.cmd not on Windows PATH) |
| `packages/shared/src/types/api.ts` | Added `TIMETABLE` + `FRIENDS_TIMETABLE` to `API_PATHS` |

### Deploy commands

```powershell
# 1. Set up AWS credentials (one time)
aws configure
# Access Key ID: <your-key>
# Secret Access Key: <your-secret>
# Region: ap-southeast-1
# Output: json

# 2. Deploy
cd "C:\Users\Harry\Desktop\SIT\AWS KIRO\Actl proj\CramCircle\SyncCircle\apps\backend"
corepack pnpm exec cdk deploy --require-approval never
```

### What the deploy does
- Creates `UserTimetables` DynamoDB table
- Deploys 2 new Lambda functions
- Adds 2 routes to existing API Gateway
- **Does NOT touch** existing tables, Lambdas, Cognito, or anything else

### After deploy
- Set `VITE_DEV_BYPASS_AUTH=false` in `apps/frontend/.env`
- Log in with real Cognito credentials
- Timetable changes will now sync to DynamoDB
- Friends can see each other's timetables in Filter View (live from backend)

### If deploy fails with "pnpm.cmd not found"
Already fixed — `package-lock.json` was added to backend folder. Just make sure you run from `apps/backend` using `corepack pnpm exec cdk deploy`.

### New API Endpoints
| Method | Path | Auth | Body / Response |
|--------|------|------|-----------------|
| PUT | `/timetable` | Cognito JWT | Body: `{ "classes": [...] }` → Response: `{ "message": "Timetable saved", "classCount": 5 }` |
| GET | `/friends/{friendId}/timetable` | Cognito JWT | Response: `{ "classes": [...], "updatedAt": "2026-07-02T..." }` or 403 if not friends |

---

## Known Limitations / TODO

- [x] ~~Friend timetable sharing is simulated~~ → Backend built, just needs deploy
- [x] ~~Google Calendar pull only gets current week~~ → Week navigation added
- [ ] No recurring event creation in Google Calendar (each sync creates one-off events for this week)
- [ ] `VITE_DEV_BYPASS_AUTH=true` must be set to `false` before production/demo deployment
- [ ] AI Planner and Note Summarization require `VITE_KIRO_API_URL` to be configured
- [ ] Backend deploy pending (needs AWS credentials from team)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Sync failed — some classes failed to sync" | Open F12 Console → look for `[GoogleCalendar] createEvent failed (403)`. Go to Google Cloud Console → APIs & Services → Library → search "Google Calendar API" → **Enable**. Refresh app, try again. |
| "This app isn't verified" on Google sign-in | Click "Advanced" → "Go to SyncCircle (unsafe)". Or ask Harry to add your Gmail as a test user. |
| Token expired / sync suddenly stops working | Click "Disconnect Google" then "Connect Google Calendar" again. Normal in Testing mode (7-day token). |
| `@synccircle/shared` module not found | Run `corepack pnpm install` from the `SyncCircle/` root to set up workspace symlinks. |
| Login page shows even with dev bypass | Make sure `.env` has `VITE_DEV_BYPASS_AUTH=true`. Restart Vite after changing `.env`. |
| Seed data not appearing | Check localStorage isn't already populated. Clear `synccircle_classes` and `synccircle_friends`, then refresh. |
| CDK deploy: "pnpm.cmd not found" | Already fixed. Run from `apps/backend` using `corepack pnpm exec cdk deploy`. |
| CDK deploy: "no credentials configured" | Run `aws configure` first with your IAM user keys + region `ap-southeast-1`. |
