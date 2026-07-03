# SyncCircle

SyncCircle is a hackathon web app workspace for a student collaboration app. The frontend is a working React prototype while the team shapes backend features and Kiro tasks.

## Branch Info

This branch (`aest-workato`) is a continuation of `workato-google-calendar-sync`.

Changes introduced in this branch:
- Task deadline email notifications via **Workato → AWS SES** (sends to each user's registered email)
- In-app notification system (toast + bell icon panel) for tasks due today/tomorrow
- `useTaskNotifications` hook with three notification paths (on-save, timed polling, startup banner)
- Optional `dueTime` field on tasks — triggers 30-min early in-app warning
- Add Task dialog on the Timetable page (Tasks tab) with date + time picker
- Calendar header buttons hidden when Tasks tab is active
- `<Toaster>` mounted globally in `App.tsx` for all toast notifications
- Auth-to-localStorage sync — Cognito user data (email, displayName) auto-syncs on login
- Kiro steering file: `.kiro/steering/workato-amazon-sns.md`

## Project Layout

```text
apps/
  frontend/      Vite React frontend app
  backend/       Backend placeholder for future API/service work
packages/
  shared/        Shared types, constants, and validation helpers
docs/
  requirements.md          Product requirements for Kiro/team planning
  design.md                Architecture and UI design notes
  kiro-context.md          Short handoff context for Kiro and teammates
  WORKATO_SNS_SETUP.md     Step-by-step AWS SES + Workato recipe setup guide
tests/
  e2e/           Future browser/user-flow tests
  integration/   Future API and cross-service tests
infra/           Future deployment/IaC notes
```

## Running The Frontend

Install dependencies from the repository root:

```bash
corepack pnpm install
```

Start the frontend:

```bash
corepack pnpm dev
```

Or run it directly:

```bash
cd apps/frontend
corepack pnpm dev
```

---

## Feature: Task Deadline Email Notifications

When a task is created with a due date of **tomorrow**, the app automatically fires
a POST to Workato, which triggers AWS SES to send a reminder email directly to the
user's registered account email address.

Each user receives notifications at the email they used to sign up — no shared inbox
or fixed subscriber list.

### How it works

1. User creates a task with tomorrow's due date
2. Frontend builds a payload with the user's Cognito account email (synced to localStorage on login)
3. Payload is POSTed to a Workato webhook
4. Workato calls AWS SES `SendEmail` with the user's email as the "To" address
5. User receives the reminder at their own inbox

### Notification behaviour

| Trigger | What happens |
|---|---|
| Task created with tomorrow's due date | Email sent immediately via Workato → SES to user's account email |
| App loads, task due today | In-app warning toast |
| App loads, task due tomorrow | In-app info toast + email (safety net) |
| Due date arrives, no `dueTime` set | In-app toast fires at **3:00 PM SGT** |
| Due date arrives, `dueTime` set | In-app toast fires **30 min before** `dueTime` |

### Environment variables

Create `apps/frontend/.env.local` and set both webhook URLs:

```env
VITE_WORKATO_WEBHOOK_URL=https://webhooks.trial.workato.com/webhooks/rest/a6158446-0e94-4d56-805f-a9b744af435e/synccircle-google-calendar
VITE_WORKATO_TASK_WEBHOOK_URL=https://webhooks.trial.workato.com/webhooks/rest/a6158446-0e94-4d56-805f-a9b744af435e/synccircledeadline
```

### For Teammates: Receiving Email Notifications

To receive task deadline email notifications at your own email address:

1. **Register a SyncCircle account** using your email (Cognito signup with email verification)
2. **Verify your email in AWS SES** (required while SES is in sandbox mode):
   - Go to AWS Console → SES → region **us-east-1** → Verified identities
   - Click "Create identity" → choose "Email address" → enter the same email you registered with
   - Check your inbox and click the AWS verification link
3. **Log in to SyncCircle** — your Cognito email is automatically synced to localStorage
4. **Create a task** with a due date of tomorrow — you'll receive the reminder email

> **Note:** SES sandbox mode requires every recipient email to be verified.
> Each team member must verify their email once in SES (us-east-1).
> This is a one-time setup per person.

### Webhook payload schema

The frontend sends this JSON to the Workato webhook:

```json
{
  "event": "task-deadline-alert",
  "task": {
    "id": "string",
    "title": "string",
    "dueDate": "YYYY-MM-DD",
    "priority": "High | Medium | Low"
  },
  "recipient": {
    "email": "user's registered email",
    "displayName": "user's display name"
  },
  "daysUntilDue": 1,
  "notifiedAt": "ISO timestamp"
}
```

Workato maps `recipient.email` to the SES "To" field, so each user gets their own email.

### Full setup guide

See `docs/WORKATO_SNS_SETUP.md` for the Workato recipe setup guide covering:
- Creating the IAM user with SES permissions (`ses:SendEmail`, `ses:SendRawEmail`, `ses:GetAccount`)
- Verifying sender and recipient email identities in SES (us-east-1)
- Connecting Workato to AWS SES
- Building the Workato recipe (webhook trigger → SES SendEmail action)
- Testing the end-to-end flow

For Kiro context on this integration see `.kiro/steering/workato-amazon-sns.md`.

---

## Feature: Google Calendar Sync

The timetable page has a **Sync to Google Calendar** button that sends all classes
to a Workato webhook, which creates events in Google Calendar.

### 1. Configure your Google Calendar timezone

Settings → General → Time zone → **Asia/Singapore (+08:00)**

### 2. Workato recipe settings

| Setting | Value |
|---|---|
| Trigger | HTTP Webhook (`synccircle-google-calendar`) |
| Displayed time zone | `Etc/UTC` — do not change |
| Step | Repeat for each → `events` array → Google Calendar: Create event |
| Start date time | `events[].startDateTime` |
| End date time | `events[].endDateTime` |

For full details see `.kiro/steering/workato-google-calendar.md`.

---

## Current State

| Area | Status |
|---|---|
| Frontend | ✅ Working React app with real auth |
| Auth (Cognito) | ✅ Real signup, login, email verification, JWT tokens |
| Friends Backend | ✅ Full CRUD — search, send/accept/reject/cancel requests, list/remove friends |
| DynamoDB | ✅ 3 tables deployed (UserProfiles, FriendRequests, Friendships) |
| API Gateway | ✅ 11 endpoints with Cognito authorizer + CORS |
| Relationship Query | ✅ `GET /friends/{userId}/relationship` for downstream features |
| Timetable → Google Calendar | ✅ Workato integration working |
| Task deadline → Email via SES | ✅ Workato + AWS SES integration working (per-user email) |
| In-app notifications | ✅ Toast + bell panel working |
| Invitation emails (SES) | ⚠️ In local-log mode (SES sandbox — needs verification for real emails) |
| Timetable friend sync | ⬜ Ready to build — use relationship endpoint |
| AI Planner friend feature | ⬜ Ready to build — use friends list endpoint |

## Team Notes

### For Timetable Friend Sync Team

The relationship API is live. To check if two users are friends before showing shared timetable:

```typescript
import { apiClient } from '../lib/api-client';
import type { FriendshipAccessResult } from '@synccircle/shared';

const result = await apiClient.get<FriendshipAccessResult>(`/friends/${targetUserId}/relationship`);
if (result.isActiveFriend) {
  // Allow timetable sharing
}
```

### For AI Planner Friend Feature Team

Get the current user's friends list:

```typescript
import { apiClient } from '../lib/api-client';
import { API_PATHS, type FriendsListResponse } from '@synccircle/shared';

const { friends } = await apiClient.get<FriendsListResponse>(API_PATHS.FRIENDS);
// friends = [{ friendId, displayName, createdAt }]
```

### Shared Types

All API types are in `packages/shared/` — import from `@synccircle/shared`:
- `FriendsListResponse`, `FriendshipAccessResult`, `SearchResponse`
- `API_PATHS` constants for all endpoint URLs
- `ERROR_CODES` for error handling

### Auth Integration

The `useAuth()` hook provides: `user`, `isAuthenticated`, `login`, `register`, `logout`, `getToken`.
The `apiClient` automatically attaches the JWT token to all requests.

Use `docs/kiro-context.md` first when handing this to Kiro or a teammate. It explains
what is real today, what is placeholder-only, and where future backend/API work should attach.

Steering files for Kiro:
- `.kiro/steering/workato-google-calendar.md` — Google Calendar sync
- `.kiro/steering/workato-amazon-sns.md` — Task deadline email via SES
