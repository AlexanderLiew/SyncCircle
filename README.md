# SyncCircle

AWS Kiro BuildFest 2026 Hackathon.

## What is SyncCircle?

SyncCircle is a student collaboration web app built for the AWS Kiro BuildFest 2026 hackathon. It helps university students sync timetables, share notes, manage tasks, and study together with real-time friend connections.

## Architecture

```
Frontend (React + Vite)  →  API Gateway  →  Lambda (Node.js 20)  →  DynamoDB
                              ↓
                        Cognito Auth
                              ↓
                        SES (emails)
```

## Key Integrations

| Integration | Status |
|---|---|
| AWS Cognito | ✅ Real user authentication (signup, login, email verification) |
| AWS DynamoDB | ✅ UserProfiles, FriendRequests, Friendships, UserTimetables + 4 AI Planner tables |
| AWS Lambda | ✅ 28 serverless functions (friends API + timetable sync + AI planner) |
| AWS API Gateway | ✅ REST API with Cognito authorizer + CORS |
| AWS SES | ⚠️ Configured but in sandbox mode (set EMAIL_ADAPTER=local) |
| AWS CDK | ✅ Full Infrastructure as Code |
| Google Calendar API | ✅ Direct OAuth2 integration — sync & pull events |
| .ics Import | ✅ Upload school timetable files directly |
| Groq AI (Llama 3.3) | ✅ Conversational AI chatbot with timetable actions |
| AI Planner | ✅ Actionable scheduling assistant with conflict detection |

## AI Study Planner (Chatbot)

The AI Planner page features a conversational chatbot powered by Groq (Llama 3.3 70B) that can read and modify your timetable with permission-based actions.

### What it can do

| Feature | How to use |
|---|---|
| **Add a class** | "Add Machine Learning on Monday 2pm to 4pm" |
| **Conflict detection** | AI warns if a slot is busy and suggests alternatives |
| **Delete a class** | "Remove Data Structures from Monday" |
| **Move a class** | "Move Algorithms from Tuesday to Thursday same time" |
| **Extend a class** | "Extend my Monday class until 11am" |
| **Find free time with friends** | "When are me and Alice Tan free this week?" |
| **Schedule group events** | "Schedule a study session with Alice on Thursday 4pm to 6pm" |
| **Email notifications** | Group events trigger email notifications to friends |

### How it works

1. **Context-aware** — the AI sees your full timetable + friends' timetables + free slots
2. **Conflict detection** — checks for time overlaps before proposing any action
3. **Confirmation required** — shows a "Confirm" button; nothing changes without your approval
4. **Real modifications** — confirmed actions update localStorage + sync to DynamoDB backend
5. **Friend availability** — cross-references both schedules for accurate mutual free time

### Architecture

```
User message → Groq API (Llama 3.3 70B) → AI response with [ACTION] blocks
                                                    ↓
                                          Frontend parses action
                                                    ↓
                                          Shows "Confirm" button
                                                    ↓ (user clicks)
                                          Executes: saveClass() / deleteClass()
                                                    ↓
                                          localStorage + backend sync
```

### Setup

Add to `apps/frontend/.env`:
```env
VITE_GROQ_API_KEY=gsk_your_key_here
```

Get a free key from [console.groq.com](https://console.groq.com) (30 req/min, 14,400/day free tier).

---



### How it works
- **Add classes** manually, via `.ics` file import, or by pulling from Google Calendar
- **Sync to Google Calendar** — pushes your classes to your personal Google Calendar (OAuth2 popup)
- **Friend timetable overlay** — Filter View lets you check friends' names to overlay their schedule on your grid
- **Free slot detection** — green highlighted cells show times everyone selected is free
- **Backend sync** — class changes auto-save to DynamoDB so friends see your latest timetable

### Google Calendar Setup (already done)
- OAuth Client ID created in Google Cloud Console
- Authorized origin: `http://localhost:5173`
- Calendar API enabled
- Publishing status: Testing (teammates need to be added as test users)

### Dev Bypass Mode
Set `VITE_DEV_BYPASS_AUTH=true` in `.env` to skip Cognito login. Seed data (3 friends + 5 classes) auto-loads on first run.

## Quick Start

```bash
cd SyncCircle
pnpm install
```

### Frontend

```bash
cd apps/frontend
pnpm dev
```

Open `http://localhost:5173` — register with a real email to get started.

### Backend (deploy)

```bash
cd apps/backend
npx cdk deploy --require-approval never
```

Requires AWS credentials configured at `~/.aws/credentials`.

## Environment Variables

### Frontend (`apps/frontend/.env`)

```env
VITE_API_BASE_URL=https://951chm3o9k.execute-api.ap-southeast-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_pTCWS6fRL
VITE_COGNITO_CLIENT_ID=djuh7mtqdl2hudmmdk1veigsq
```

### Backend (configured via CDK env vars on Lambda)

- `USER_PROFILES_TABLE` — DynamoDB table name
- `FRIEND_REQUESTS_TABLE` — DynamoDB table name
- `FRIENDSHIPS_TABLE` — DynamoDB table name
- `SES_SENDER_EMAIL` — Verified SES sender
- `FRONTEND_BASE_URL` — For invitation email links
- `EMAIL_ADAPTER` — Set to "local" to skip SES (logs email instead)

## Deployed Resources (ap-southeast-1)

| Resource | Value |
|---|---|
| API URL | `https://951chm3o9k.execute-api.ap-southeast-1.amazonaws.com/prod/` |
| AWS Account | 368082409177 |
| Region | ap-southeast-1 |
| Stack | FriendsStack |
| Cognito User Pool | ap-southeast-1_pTCWS6fRL |

## API Endpoints

### Friends & Timetable

| Method | Path | Description |
|---|---|---|
| POST | /friends/search | Search for a user by email + name |
| POST | /friend-requests | Send a friend request |
| POST | /friend-requests/{id}/accept | Accept a request |
| POST | /friend-requests/{id}/reject | Reject a request |
| POST | /friend-requests/{id}/cancel | Cancel a sent request |
| GET | /friend-requests/incoming | List pending incoming requests |
| GET | /friend-requests/outgoing | List sent requests |
| GET | /friend-requests/invite/{token} | Validate invitation token |
| GET | /friends | List active friends |
| DELETE | /friends/{friendId} | Remove a friend |
| GET | /friends/{userId}/relationship | Check relationship status |
| PUT | /timetable | Save user's timetable classes to DynamoDB |
| GET | /friends/{friendId}/timetable | Fetch a friend's timetable (must be friends) |

### AI Planner (requires CDK deploy)

| Method | Path | Description |
|---|---|---|
| POST | /ai-planner/personal | Create personal planning session |
| POST | /ai-planner/group | Create group planning session |
| GET | /planning-sessions | List user's planning sessions |
| GET | /planning-sessions/{id} | Get session details |
| POST | /planning-sessions/{id}/accept-option | Accept a time slot |
| POST | /planning-sessions/{id}/reject-option | Reject a time slot |
| POST | /planning-sessions/{id}/next-option | Get new suggestions |
| POST | /planning-sessions/{id}/cancel | Cancel a session |
| GET | /meeting-invitations | List pending invitations |
| GET | /meeting-invitations/{id} | Get invitation details |
| POST | /meeting-invitations/{id}/accept | Accept invitation |
| POST | /meeting-invitations/{id}/reject | Reject invitation |
| PUT | /timetable/privacy | Update timetable privacy setting |
| GET | /timetable/privacy | Get timetable privacy setting |

All endpoints require `Authorization: Bearer {id_token}` (Cognito ID token).

## Project Structure

```
SyncCircle/
├── apps/
│   ├── frontend/          React + Vite + TailwindCSS
│   │   └── src/app/
│   │       ├── hooks/     useAuth, useFriends, useFriendRequests, useGoogleCalendar
│   │       ├── pages/     Auth, Friends, Invitation, Dashboard, Timetable, etc.
│   │       └── lib/       api-client, google-calendar, ics-parser, sgt, storage, seed-data
│   └── backend/           AWS CDK + Lambda handlers
│       ├── src/
│       │   ├── handlers/  Lambda function handlers (friend-requests/, friends/, timetable/, triggers/)
│       │   ├── services/  validation, token, email services
│       │   ├── repositories/  DynamoDB data access layer
│       │   └── utils/     response helpers, logger, canonical pair
│       └── cdk/           CDK infrastructure code
│           └── lib/       Stack + constructs (DynamoDB, Cognito, Lambda, API, SES)
└── packages/
    └── shared/            TypeScript interfaces, API types, error codes
```

## Team Handover — Next Features

### 1. Timetable Friend Sync ✅ DONE

Backend built and wired into CDK. Needs `cdk deploy` to go live.

- `PUT /timetable` — saves your classes to `UserTimetables` DynamoDB table
- `GET /friends/{friendId}/timetable` — fetches a friend's timetable (checks friendship first)
- Frontend auto-PUTs on every class change (when real auth is active)
- Filter View fetches from API when toggling friends

**To deploy:** run `corepack pnpm exec cdk deploy --require-approval never` from `apps/backend` with AWS credentials configured.

### 2. AI Planner Feature ✅ DONE

Full conversational AI chatbot with timetable actions:

- **Groq API** (Llama 3.3 70B) — free tier, 30 req/min
- **Actionable chat** — add, delete, move, extend classes with confirmation
- **Conflict detection** — warns about time overlaps, suggests free alternatives
- **Friend availability** — cross-checks both timetables for mutual free slots
- **Group scheduling** — creates events + sends email notifications
- **Backend infrastructure** — 14 new Lambda handlers, 4 DynamoDB tables, CDK construct (ready to deploy)
- **157 passing tests** — availability calculator, planning service, privacy enforcement

**To use:** Add `VITE_GROQ_API_KEY` to frontend `.env` and run `npm run dev`.

### 3. SES Email (optional)

To enable real invitation emails:
1. Verify sender email in SES console (or request production access)
2. Change `EMAIL_ADAPTER` from `'local'` to `''` in `cdk/lib/lambda-construct.ts`
3. Redeploy

## Branches

| Branch | Description |
|---|---|
| `main` | Stable base |
| `alex-frontend-fixes` | Initial frontend fixes |
| `workato-google-calendar-sync` | Google Calendar integration |
| `aest-workato` | Task deadline email via AWS SNS |
| `3-jul-Andre-AI-Planner` | AI Planner integration with actionable chatbot ← current |

## Useful Commands

```bash
# Deploy backend changes
cd apps/backend && npx cdk deploy --require-approval never

# Run frontend
cd apps/frontend && pnpm dev

# Type check everything
cd apps/backend && npx tsc --noEmit
cd apps/frontend && npx tsc --noEmit

# Run backend tests
cd apps/backend && npx vitest run

# CDK synth (preview CloudFormation without deploying)
cd apps/backend && npx cdk synth
```
