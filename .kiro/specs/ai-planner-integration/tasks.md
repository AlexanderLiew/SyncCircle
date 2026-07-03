# Implementation Plan: AI Planner Integration

## Overview

This plan implements intelligent scheduling capabilities for SyncCircle through a conversational AI chat interface. The implementation follows a bottom-up approach: data models and infrastructure first, then core computation services, then Lambda handlers, and finally frontend components. TypeScript is used throughout for both backend (CDK + Lambda) and frontend (React/Vite).

## Tasks

- [x] 1. Set up data models, types, and DynamoDB infrastructure
  - [x] 1.1 Create AI Planner TypeScript interfaces and types
    - Create `src/types/ai-planner.types.ts` with all interfaces: `TimeSlot`, `FreePeriod`, `AvailabilityInput`, `AIRankingRequest`, `AIRankedOption`, `AIRankingResponse`, `ProposedTimeOption`, `PlanningSession`, `CalendarEvent`, `MeetingInvitation`, `TimetablePrivacySetting`
    - Include request/response types for all endpoints: `CreatePersonalSessionRequest`, `CreateGroupSessionRequest`, `AcceptOptionRequest`, etc.
    - Define status enums/unions for session, invitation, and event statuses
    - _Requirements: 1.1, 2.1, 3.5, 5.1, 8.1, 9.2_

  - [x] 1.2 Create DynamoDB table definitions in CDK
    - Create `cdk/lib/ai-planner-dynamodb-construct.ts` defining four new tables: PlanningSessions, CalendarEvents, MeetingInvitations, TimetablePrivacySettings
    - Include GSIs: `creatorUserId-createdAt-index` on PlanningSessions, `eventId-index` on CalendarEvents, `receiverUserId-createdAt-index` and `planningSessionId-index` on MeetingInvitations
    - Follow existing `dynamodb-construct.ts` patterns for table creation
    - _Requirements: 9.1, 9.2_

  - [x] 1.3 Create repository classes for new tables
    - Create `src/repositories/planning-session.repo.ts` with CRUD operations, query by creatorUserId
    - Create `src/repositories/calendar-event.repo.ts` with CRUD, range queries by userId+startDateTime, lookup by eventId via GSI
    - Create `src/repositories/meeting-invitation.repo.ts` with CRUD, query by receiverUserId, query by planningSessionId
    - Create `src/repositories/timetable-privacy.repo.ts` with get/put operations
    - Follow existing repository patterns (e.g., `friendship.repo.ts`)
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 2. Implement Availability Calculator service
  - [x] 2.1 Implement the core AvailabilityCalculator module
    - Create `src/services/availability-calculator.ts` as a pure computation module with no external I/O
    - Implement `mergeBusyPeriods(slots: TimeSlot[]): TimeSlot[]` — merge overlapping/adjacent busy periods into sorted non-overlapping list
    - Implement `computeFreePeriods(input: AvailabilityInput): FreePeriod[]` — compute free periods by subtracting busy times from 08:00–23:00 windows across the date range
    - Implement `intersectFreePeriods(periodsPerUser: FreePeriod[][]): FreePeriod[]` — compute intersection of multiple users' free periods for group planning
    - Handle recurring TimetableClass mapping to specific dates by dayOfWeek matching
    - Filter resulting free slots by minimum duration requirement
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 2.2 Write property test: merged busy periods produce non-overlapping sorted output
    - **Property 2: Merged busy periods produce non-overlapping sorted output**
    - Use fast-check to generate arbitrary lists of possibly-overlapping TimeSlots
    - Assert output is sorted by start time and no two intervals overlap or are adjacent
    - **Validates: Requirements 10.5**

  - [ ]* 2.3 Write property test: free periods fall within available hours
    - **Property 3: Free periods fall within available hours**
    - Use fast-check to generate valid AvailabilityInput with random timetable classes and events
    - Assert every returned FreePeriod starts and ends within 08:00–23:00 local time on its date
    - **Validates: Requirements 10.3**

  - [ ]* 2.4 Write property test: free period round-trip consistency
    - **Property 1: Free period computation round-trip consistency**
    - Use fast-check to generate a schedule, compute free periods, pick a random free period, add an event there, recompute, and assert the slot is no longer free
    - **Validates: Requirements 10.4**

  - [ ]* 2.5 Write property test: group intersection is subset of individual availability
    - **Property 4: Group intersection is subset of individual availability**
    - Use fast-check to generate multiple users' free period lists
    - Assert the intersected result is a time-coverage subset of every individual's free periods
    - **Validates: Requirements 10.6**

- [x] 3. Implement AI Integration service
  - [x] 3.1 Implement the AIIntegrationService module
    - Create `src/services/ai-integration.service.ts`
    - Implement `rankTimeSlots(request: AIRankingRequest): Promise<AIRankingResponse>`
    - Use environment variable for AI provider API key and endpoint configuration
    - Implement 15-second timeout on AI API call
    - On timeout/error: return free periods unranked with `aiAvailable: false`
    - Post-validate that every AI suggestion falls within a computed free period; discard invalid ones
    - Never send raw timetable data — only validated FreePeriods
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 3.2 Write unit tests for AI Integration service
    - Test timeout handling returns fallback with `aiAvailable: false`
    - Test response validation discards out-of-range AI recommendations
    - Test that only FreePeriods (not raw timetable data) are included in prompts
    - Mock external AI API calls
    - _Requirements: 11.3, 11.4, 11.5_

- [x] 4. Implement Planning Session service
  - [x] 4.1 Implement PlanningSessionService for personal planning flow
    - Create `src/services/planning-session.service.ts`
    - Implement `createPersonalSession()`: validate input, create session (status: generating), retrieve timetable + events, compute free periods, invoke AI ranking, store options, update status to options-generated
    - Implement input validation: duration 15–480, dateRangeStart not in past, dateRangeEnd within 30 days, activity required
    - Handle CONTEXT_UNAVAILABLE error when timetable/events cannot be retrieved
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 13.1, 13.2_

  - [x] 4.2 Implement PlanningSessionService for group planning flow
    - Implement `createGroupSession()`: validate input (1–10 participants), verify friendships, check privacy settings, retrieve authorized timetables, compute individual free periods, intersect for common slots, invoke AI ranking
    - Return privacyExclusions listing participants whose timetable was excluded
    - Handle NOT_FRIENDS error for invalid participants
    - Handle no-availability case with suggestions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 13.3_

  - [x] 4.3 Implement option acceptance, rejection, and next-option flows
    - Implement `acceptOption()`: revalidate time slot, create CalendarEvent, update session status (confirmed for personal, creator-accepted for group), generate MeetingInvitations for group mode
    - Implement `rejectOption()`: mark option as rejected, add to excludedOptions list
    - Implement `nextOption()`: regenerate options excluding rejected slots
    - Implement slot-conflict detection on acceptance with SLOT_CONFLICT error
    - Ensure idempotency: re-accepting returns existing event
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4_

  - [x] 4.4 Implement meeting invitation lifecycle
    - Implement `acceptInvitation()`: update status to accepted, create CalendarEvent for participant, set respondedAt
    - Implement `rejectInvitation()`: update status to rejected, set respondedAt
    - Implement session status rollup: confirmed if at least one accepted, rejected if all rejected
    - Handle 72h expiration (mark as expired on read)
    - Ensure only receiverUserId can respond (FORBIDDEN otherwise)
    - Idempotent: re-responding returns current status
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.5_

  - [x] 4.5 Implement session cancellation with cascade
    - Implement `cancelSession()`: set status to cancelled, cancel all pending invitations, delete associated CalendarEvents for creator and accepted participants
    - Ensure only creator can cancel (FORBIDDEN otherwise)
    - Idempotent: re-cancelling returns success
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 12.4_

  - [ ]* 4.6 Write unit tests for PlanningSessionService
    - Test authorization checks (only creator can modify sessions)
    - Test cancellation cascade logic
    - Test status transitions through full lifecycle
    - Test input validation rejection for out-of-range values
    - _Requirements: 6.4, 12.4, 13.1, 13.2, 13.3, 13.4_

- [x] 5. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Lambda handlers for planning endpoints
  - [x] 6.1 Implement personal and group planning handlers
    - Create `src/handlers/ai-planner/personal-plan.ts` — extract userId from JWT, validate request body, call PlanningSessionService, return response
    - Create `src/handlers/ai-planner/group-plan.ts` — same pattern with participant validation
    - Implement rate limiting check (5 requests/user/minute) with RATE_LIMITED error response
    - Follow existing handler patterns: `success()`/`error()` helpers, auth extraction
    - _Requirements: 1.1, 2.1, 12.1, 12.3, 13.5, 13.6_

  - [x] 6.2 Implement session action handlers
    - Create `src/handlers/ai-planner/accept-option.ts`
    - Create `src/handlers/ai-planner/reject-option.ts`
    - Create `src/handlers/ai-planner/next-option.ts`
    - Create `src/handlers/ai-planner/cancel-session.ts`
    - Each handler: extract userId, validate params, verify authorization, call service, return result
    - _Requirements: 3.1, 4.1, 4.2, 6.1, 12.4_

  - [x] 6.3 Implement session and invitation retrieval handlers
    - Create `src/handlers/ai-planner/list-sessions.ts` — query by creatorUserId, order by createdAt desc
    - Create `src/handlers/ai-planner/get-session.ts` — verify creator authorization
    - Create `src/handlers/ai-planner/list-invitations.ts` — query by receiverUserId, order by createdAt desc
    - Create `src/handlers/ai-planner/get-invitation.ts` — verify receiverUserId authorization
    - Return FORBIDDEN for unauthorized access attempts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.4 Implement invitation response handlers
    - Create `src/handlers/ai-planner/accept-invitation.ts`
    - Create `src/handlers/ai-planner/reject-invitation.ts`
    - Each: extract userId, verify receiverUserId matches, call service method
    - _Requirements: 5.2, 5.3, 12.5_

  - [x] 6.5 Implement timetable privacy settings handlers
    - Create `src/handlers/ai-planner/put-privacy.ts` — validate visibility value ("friends" or "none"), upsert setting
    - Create `src/handlers/ai-planner/get-privacy.ts` — return setting or default "friends"
    - _Requirements: 8.1, 8.2_

- [x] 7. Set up CDK API Gateway routes and Lambda construct
  - [x] 7.1 Create AI Planner CDK stack/construct with Lambda functions and API routes
    - Create `cdk/lib/ai-planner-construct.ts` (or extend existing stack)
    - Define all Lambda functions referencing the handler files
    - Configure API Gateway routes with Cognito authorizer for all 14 endpoints
    - Grant Lambda functions DynamoDB read/write access to the four new tables plus existing UserTimetables and Friendships tables
    - Set environment variables for AI API key (from SSM/Secrets Manager) and table names
    - _Requirements: 12.1, 12.2_

  - [ ]* 7.2 Write unit tests for Lambda handlers
    - Test input validation returns 400 for invalid payloads
    - Test auth extraction from JWT claims
    - Test error response formatting
    - Mock service layer calls
    - _Requirements: 12.1, 12.3, 13.4_

- [x] 8. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement frontend planning request components
  - [x] 9.1 Create PlannerModeSelector and PlanningRequestForm components
    - Create `src/app/components/ai-planner/PlannerModeSelector.tsx` — toggle between "Personal" and "Plan with Friends" modes
    - Create `src/app/components/ai-planner/PlanningRequestForm.tsx` — inputs for activity, duration (slider/number 15–480), date range picker
    - Create `src/app/components/ai-planner/FriendSelector.tsx` — checkbox list of active friends (fetched from GET /friends), shown only in group mode
    - _Requirements: 14.5, 14.6_

  - [x] 9.2 Create OptionCard and session result display components
    - Create `src/app/components/ai-planner/OptionCard.tsx` — displays start time, end time, duration, location, participant names, AI explanation
    - Include "Accept" button and "Find Another Time" button on each card
    - Create `src/app/components/ai-planner/PlanningSessionList.tsx` — history of past sessions
    - Create `src/app/components/ai-planner/EmptyState.tsx` — contextual empty states (no friends, no slots, errors)
    - _Requirements: 14.1, 14.2, 16.1, 16.2, 16.3, 16.4_

  - [x] 9.3 Create InvitationBadge and InvitationCard components
    - Create `src/app/components/ai-planner/InvitationBadge.tsx` — notification count badge for pending invitations
    - Create `src/app/components/ai-planner/InvitationCard.tsx` — displays event title, proposed time, duration, sender name, participant list, with Accept/Reject buttons
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 10. Integrate frontend components into AIPlanner page
  - [x] 10.1 Create API service layer for AI Planner endpoints
    - Create `src/app/lib/ai-planner-api.ts` with functions for all backend endpoints: `createPersonalSession()`, `createGroupSession()`, `acceptOption()`, `rejectOption()`, `nextOption()`, `cancelSession()`, `listSessions()`, `getSession()`, `acceptInvitation()`, `rejectInvitation()`, `listInvitations()`, `getInvitation()`, `getPrivacySettings()`, `updatePrivacySettings()`
    - Use existing auth token pattern for API calls
    - _Requirements: 14.3, 14.4, 15.3, 15.4_

  - [x] 10.2 Enhance AIPlanner.tsx page with full planning workflow
    - Refactor existing `src/app/pages/AIPlanner.tsx` to integrate PlannerModeSelector, PlanningRequestForm, FriendSelector, OptionCard, InvitationBadge, and InvitationCard components
    - Wire "Accept" button to call `POST /planning-sessions/{sessionId}/accept-option` and show confirmation
    - Wire "Find Another Time" button to call `POST /planning-sessions/{sessionId}/next-option` and render new options
    - Display loading states during API calls and error states with retry button
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 16.3, 16.4_

  - [x] 10.3 Implement Google Calendar sync option
    - Add "Sync to Google Calendar" button on event creation confirmation
    - Use existing OAuth2 integration to create Google Calendar event with title, startDateTime, endDateTime, location
    - Handle expired/missing OAuth token by prompting re-authentication
    - Ensure backend event creation is not blocked by sync status
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 11. Implement privacy enforcement and data security
  - [x] 11.1 Add privacy enforcement to group planning flow
    - Ensure group planning API responses never include individual TimetableClass titles, module codes, or locations
    - Return only common FreePeriod time ranges without participant attribution
    - When privacy is "none", indicate availability as "unknown" without revealing timetable existence
    - Ensure AI model prompts contain only computed FreePeriods, never participant timetable details
    - _Requirements: 8.3, 8.4, 18.1, 18.2, 18.3, 18.4_

  - [ ]* 11.2 Write unit tests for privacy enforcement
    - Test that group responses exclude individual class details
    - Test that "none" privacy setting prevents timetable access
    - Test that AI prompts contain only FreePeriods
    - **Property 7: Privacy exclusion prevents timetable leakage**
    - **Validates: Requirements 8.3, 18.1, 18.3, 18.4**

- [x] 12. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check (already installed)
- Unit tests validate specific examples and edge cases using vitest (already configured)
- The backend uses the existing CDK + Lambda + API Gateway + Cognito auth pattern
- The frontend extends the existing AIPlanner.tsx page and React component structure

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "3.2"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "4.6"] },
    { "id": 7, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 8, "tasks": ["7.1", "7.2"] },
    { "id": 9, "tasks": ["9.1", "9.2", "9.3"] },
    { "id": 10, "tasks": ["10.1"] },
    { "id": 11, "tasks": ["10.2", "10.3", "11.1"] },
    { "id": 12, "tasks": ["11.2"] }
  ]
}
```
