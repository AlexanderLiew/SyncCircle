# Implementation Plan: Task Email Reminders

## Overview

This plan implements an AWS-native email reminder system for tasks due tomorrow. A single new Lambda handler (`notifyTaskHandler`) is added to the existing CDK infrastructure, wired via API Gateway at `POST /tasks/notify`. The frontend calls this endpoint on task save when the due date is tomorrow. The Lambda looks up the user's email from DynamoDB and sends a reminder via SES. Failures are silently swallowed on the frontend — email is best-effort.

## Tasks

- [x] 1. Add shared types and Lambda handler
  - [x] 1.1 Add NotifyTask types to shared package
    - Add `TASKS_NOTIFY: '/tasks/notify'` to `API_PATHS` in `packages/shared/src/types/api.ts`
    - Add `NotifyTaskRequest` interface with `taskTitle: string` and `dueDate: string` (YYYY-MM-DD)
    - Add `NotifyTaskResponse` interface with `message: string`
    - _Requirements: 2.2_

  - [x] 1.2 Implement the notifyTaskHandler Lambda
    - Create `apps/backend/src/handlers/tasks/notify.ts`
    - Parse and validate request body: reject if `taskTitle` is empty or >200 chars, reject if `dueDate` doesn't match YYYY-MM-DD with valid calendar values
    - Extract `userId` from `event.requestContext.authorizer.claims.sub`
    - Query UserProfiles table by userId using `dynamodb:GetItem`
    - If user not found, return 404 with `"User profile not found"`
    - Compose email: subject = `Reminder: "{taskTitle}" is due on {formattedDate}`, body = friendly reminder with title and date
    - Send via SES from `noreply@synccircle.com` to user's email
    - On success return 200 with `{ message: "Reminder email sent successfully" }`
    - On SES failure return 500 with `"Failed to send reminder email"`
    - Use existing `success()`/`error()` response utilities from `src/utils/response.ts`
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 1.3 Write property test for request body validation (Property 2)
    - **Property 2: Request Body Validation**
    - Generate random objects and verify validator accepts iff `taskTitle` is non-empty string ≤200 chars AND `dueDate` matches YYYY-MM-DD with valid month/day
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 1.4 Write property test for email composition (Property 3)
    - **Property 3: Email Composition Contains Required Fields**
    - Generate random non-empty taskTitle strings and valid date strings
    - Assert composed subject and body both contain the taskTitle and formatted dueDate
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 4.2, 4.3**

- [x] 2. Wire CDK infrastructure
  - [x] 2.1 Add notifyTaskHandler to Lambda construct
    - In `apps/backend/cdk/lib/lambda-construct.ts`:
    - Add public property `notifyTaskHandler: nodejs.NodejsFunction`
    - Create the NodejsFunction with entry `handlers/tasks/notify.ts`, Node.js 20 runtime, esbuild bundling
    - Set environment: `USER_PROFILES_TABLE`, `SES_SENDER_EMAIL`, `EMAIL_ADAPTER: ''` (empty string for real SES)
    - Grant `dynamodb:GetItem` on userProfilesTable
    - Grant `ses:SendEmail` restricted to sender address `noreply@synccircle.com`
    - _Requirements: 7.1, 7.2, 7.3, 5.3_

  - [x] 2.2 Add POST /tasks/notify route to API construct
    - In `apps/backend/cdk/lib/api-construct.ts`:
    - Add `notifyTaskHandler` to `ApiConstructProps`
    - Create `/tasks/notify` resource and add POST method with Cognito authorizer
    - Add request validation model requiring `taskTitle` (string, non-empty) and `dueDate` (string)
    - _Requirements: 2.1, 7.4_

  - [x] 2.3 Wire notifyTaskHandler in FriendsStack
    - In `apps/backend/cdk/lib/friends-stack.ts`:
    - Pass `lambdas.notifyTaskHandler` to the API construct props
    - _Requirements: 7.4_

- [x] 3. Checkpoint - Ensure CDK synths and backend compiles
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Frontend integration
  - [x] 4.1 Create task notification client
    - Create `apps/frontend/src/app/lib/task-notify-client.ts`
    - Implement `notifyTaskDueTomorrow(task: { title: string; dueDate: string })` function
    - Determine if `dueDate` equals tomorrow in user's local timezone
    - If yes, send authenticated POST to `/tasks/notify` with `{ taskTitle, dueDate }`
    - Wrap in try/catch — silently swallow all errors (fire-and-forget)
    - Use existing API client pattern for auth header
    - _Requirements: 1.1, 1.2, 1.3, 6.3_

  - [x] 4.2 Integrate notification trigger into task save flow
    - In the existing task save logic (where `useTaskNotifications` fires), call `notifyTaskDueTomorrow` after saving
    - Ensure existing in-app toast notifications continue independently
    - Email request failure must NOT affect toast or task save UX
    - _Requirements: 1.1, 6.1, 6.2, 6.3_

  - [ ]* 4.3 Write property test for tomorrow detection (Property 1)
    - **Property 1: Tomorrow Detection Biconditional**
    - Generate random Date pairs (currentDate, dueDate)
    - Assert the trigger function returns true iff dueDate is exactly one calendar day after currentDate in local timezone
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 1.1, 1.2**

- [x] 5. Final checkpoint - Ensure all tests pass and CDK synths cleanly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The project uses TypeScript throughout (CDK, Lambda, React frontend)
- Existing patterns: response utilities in `src/utils/response.ts`, Lambda construct in `cdk/lib/lambda-construct.ts`, API construct in `cdk/lib/api-construct.ts`
- `EMAIL_ADAPTER: ''` is intentionally empty to enable real SES sending (other Lambdas use `'local'`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2", "4.3"] }
  ]
}
```
