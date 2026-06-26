# Implementation Plan: CramCircle

## Overview

Build the CramCircle educational dashboard MVP as a TypeScript monorepo with AWS serverless backend (Lambda + API Gateway + DynamoDB), Amazon Bedrock AI integration, and Next.js frontend. Implementation follows an incremental approach: shared types and infrastructure first, then core services, then integration and AI features.

## Tasks

- [ ] 1. Set up monorepo structure, shared types, and infrastructure
  - [ ] 1.1 Initialize monorepo with package structure and tooling
    - Create `packages/shared/`, `packages/backend/`, `packages/frontend/` directories
    - Initialize root `package.json` with workspaces configuration
    - Configure TypeScript (`tsconfig.json`) for each package with shared base config
    - Set up Vitest as the test runner with fast-check dependency
    - Add ESLint and Prettier configurations
    - _Requirements: 10.1_

  - [ ] 1.2 Define shared TypeScript types and interfaces
    - Create `packages/shared/src/types.ts` with all interfaces: User, StudyGroup, InviteLink, AcademicEvent, PersonalEvent, RecurrencePattern, EventCategory, BusyBlock, Note, TodoItem, FreeWindow, ApiResponse
    - Create `packages/shared/src/constants.ts` with validation limits and enums (DayOfWeek, Priority, TodoStatus)
    - Export types from package index
    - _Requirements: 10.6, 4.1, 6.1, 8.1, 9.1_

  - [ ] 1.3 Create shared validation utilities
    - Implement `validateEmail(email: string)` — RFC 5322 format, max 254 chars
    - Implement `validatePassword(password: string)` — 8-128 chars
    - Implement `validateGroupName(name: string)` — 1-100 chars
    - Implement `validateAcademicEvent(event)` — all field validations
    - Implement `validatePersonalEvent(event)` — title 1-100 chars, end > start
    - Implement `validateCategory(category)` — name 1-50 chars, valid hex color, count < 20
    - Implement `validateNote(note)` — title 1-200 chars, content 1-50000 chars
    - Implement `validateTodoItem(item)` — title 1-200 chars, valid priority/status
    - _Requirements: 1.1, 1.3, 2.1, 4.5, 6.9, 8.6, 9.8_

  - [ ]* 1.4 Write property tests for shared validation utilities
    - **Property 1: Registration Input Validation** — random emails and passwords verify accept/reject boundary
    - **Property 3: Group Name Validation** — random strings 0-200 chars verify 1-100 acceptance
    - **Property 7: Academic Event Validation** — random event objects with valid/invalid fields
    - **Property 11: Personal Event and Category Validation** — random events and categories
    - **Property 17: Note Validation** — random note objects
    - **Property 20: Todo Item Validation** — random todo objects
    - **Validates: Requirements 1.1, 1.3, 2.1, 4.1, 4.5, 6.1, 6.2, 6.9, 8.1, 8.6, 9.1, 9.8**

  - [ ] 1.5 Set up DynamoDB table definition and infrastructure-as-code
    - Create AWS SAM or CDK template defining the CramCircle single table
    - Define PK/SK schema, GSI1 (GSI1PK, GSI1SK), GSI2 (GSI2PK, GSI2SK)
    - Configure provisioned/on-demand capacity settings
    - Add API Gateway REST API resource with JWT authorizer
    - Define Lambda function resources for each service
    - _Requirements: 10.1, 10.2_

- [ ] 2. Implement Authentication Service
  - [ ] 2.1 Implement auth service core logic
    - Create `packages/backend/src/services/auth.service.ts`
    - Implement `hashPassword()` using bcrypt with salt rounds = 12
    - Implement `verifyPassword()` for credential verification
    - Implement `generateToken()` — JWT with 24h expiry, HMAC-SHA256
    - Implement `validateToken()` — verify signature and expiry
    - Implement `checkRateLimit()` — query LoginAttempt records within 15-min window, block at 5 failures
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ] 2.2 Implement auth Lambda handler with registration and login endpoints
    - Create `packages/backend/src/handlers/auth.handler.ts`
    - POST `/auth/register` — validate input, check duplicate email, hash password, store user, return JWT
    - POST `/auth/login` — validate input, check rate limit, verify credentials, record attempt, return JWT
    - Map all errors to ApiResponse envelope with correct HTTP status codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.5, 10.6_

  - [ ]* 2.3 Write property test for rate limiting
    - **Property 2: Rate Limiting Threshold** — random sequences of timestamps within/across 15-min windows verify block at N≥5
    - **Validates: Requirements 1.5**

  - [ ]* 2.4 Write unit tests for auth service
    - Test successful registration flow
    - Test duplicate email rejection
    - Test login with valid/invalid credentials
    - Test generic error message on failed login (no email/password leak)
    - Test token generation and validation lifecycle
    - Test account lockout after 5 failed attempts
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Implement Group Service
  - [ ] 3.1 Implement group service core logic
    - Create `packages/backend/src/services/group.service.ts`
    - Implement `createGroup()` — generate groupId, store GROUP#META + MEMBER record, generate invite code
    - Implement `generateInviteCode()` — 8-char URL-safe random string with uniqueness check
    - Implement `joinGroup()` — validate invite code, check membership limit (50), add MEMBER record
    - Implement `leaveGroup()` — remove MEMBER record, update member count
    - Implement `listUserGroups()` — query GSI1 for USER# → GROUP# entries
    - Implement `getGroupDetails()` — fetch META + all MEMBER# records
    - Implement `validateMembershipLimit()` — check < 50 groups
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.2 Implement group Lambda handler with all endpoints
    - Create `packages/backend/src/handlers/group.handler.ts`
    - POST `/groups` — create group
    - GET `/groups` — list user's groups
    - GET `/groups/:id` — get group details with member list
    - POST `/groups/:id/leave` — leave group
    - POST `/groups/join/:inviteCode` — join via invite link
    - Enforce authentication on all endpoints
    - Map errors to ApiResponse envelope
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 10.2, 10.5, 10.6_

  - [ ]* 3.3 Write property tests for group service
    - **Property 4: Invite Code Uniqueness** — generate N codes, verify set size = N
    - **Property 5: Group Membership Leave** — after leave, user not in group and group not in user's list
    - **Validates: Requirements 2.2, 3.4**

  - [ ]* 3.4 Write unit tests for group service
    - Test group creation assigns creator as member
    - Test invite link generation and join flow
    - Test invalid/expired invite link rejection
    - Test already-a-member message on duplicate join
    - Test 50-group membership limit enforcement
    - Test leave group removes membership bidirectionally
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.4, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Timetable Service (Academic Events)
  - [ ] 5.1 Implement timetable service core logic for academic events
    - Create `packages/backend/src/services/timetable.service.ts`
    - Implement `createAcademicEvent()` — validate fields, store with USER# PK and ACADEMIC# SK, index in GSI1 by group
    - Implement `updateAcademicEvent()` — verify ownership, validate fields, persist changes
    - Implement `deleteAcademicEvent()` — verify ownership, remove record
    - Implement `expandRecurrence()` — generate occurrences within a date range from recurrence days
    - Implement `getUserTimetable()` — query GSI2 by time range, expand recurrences, merge academic + personal
    - Implement `validateTimeRange()` — ensure end > start, range ≤ 90 days
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 5.2 Write property tests for timetable query and validation
    - **Property 6: Timetable Date Range Query Correctness** — random events + random date ranges verify all-and-only overlapping events returned
    - **Validates: Requirements 4.2**

  - [ ] 5.3 Implement personal event and category management
    - Implement `createPersonalEvent()` — validate, store with PERSONAL# SK
    - Implement `updatePersonalEvent()` — verify ownership, validate, persist
    - Implement `deletePersonalEvent()` — verify ownership, remove
    - Implement `createCategory()` — validate name/color, check < 20 limit, persist
    - Implement `updateCategory()` — persist changes, reflect on associated events
    - Implement `deleteCategory()` — remove category, nullify categoryId on associated events
    - Implement `maskPersonalEvents()` — strip title/category/details, return BusyBlock with time only
    - Implement `getGroupTimetable()` — fetch all members' events, mask personal events for non-owners
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ]* 5.4 Write property tests for privacy masking and event validation
    - **Property 10: Privacy Masking Completeness** — random personal events verify non-owner sees only time, owner sees all
    - **Validates: Requirements 6.7, 6.8**

  - [ ] 5.5 Implement timetable Lambda handler with all endpoints
    - Create `packages/backend/src/handlers/timetable.handler.ts`
    - POST `/events/academic` — create academic event
    - PUT `/events/academic/:id` — update academic event
    - DELETE `/events/academic/:id` — delete academic event
    - POST `/events/personal` — create personal event
    - PUT `/events/personal/:id` — update personal event
    - DELETE `/events/personal/:id` — delete personal event
    - POST `/events/categories` — create category
    - PUT `/events/categories/:id` — update category
    - DELETE `/events/categories/:id` — delete category
    - GET `/events?start=&end=` — get own timetable
    - GET `/events/group/:groupId?start=&end=` — get group timetable (privacy-masked)
    - Enforce authentication and authorization on all endpoints
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 10.2, 10.4, 10.5_

  - [ ]* 5.6 Write unit tests for timetable service
    - Test academic event CRUD with ownership verification
    - Test personal event CRUD
    - Test category CRUD with 20-limit enforcement
    - Test recurrence expansion for various patterns
    - Test privacy masking for group timetable views
    - Test date range validation (≤ 90 days)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1, 6.5, 6.6, 6.7, 6.8_

- [ ] 6. Implement Timetable Grabber Service
  - [ ] 6.1 Implement ICS file parser and validator
    - Create `packages/backend/src/services/grabber.service.ts`
    - Implement `validateIcsFile()` — check valid iCalendar format, size ≤ 5MB, ≤ 500 VEVENTs, at least 1 VEVENT
    - Implement `parseIcsFile()` — extract VEVENT components into AcademicEvent objects (title, start, end, recurrence, location)
    - Implement `detectConflicts()` — compare imported events against existing events, flag overlapping time ranges
    - _Requirements: 5.5, 5.6, 5.8, 5.9_

  - [ ]* 6.2 Write property tests for ICS parsing and conflict detection
    - **Property 8: ICS File Parsing Round-Trip** — random valid events serialized to ICS then parsed back should be equivalent
    - **Property 9: Event Conflict Detection** — random time interval pairs verify overlap iff start₁ < end₂ AND start₂ < end₁
    - **Validates: Requirements 5.5, 5.8**

  - [ ] 6.3 Implement university portal extraction (stub with SIT support)
    - Implement `extractFromPortal()` — HTTP client with 30-second timeout for university portal scraping
    - Create portal-specific parsers for SIT (initial implementation), with extension points for NUS, SMU, polytechnics
    - Handle connection failures with descriptive error and ICS fallback suggestion
    - _Requirements: 5.1, 5.2, 5.7_

  - [ ] 6.4 Implement grabber Lambda handler
    - Create `packages/backend/src/handlers/grabber.handler.ts`
    - POST `/grabber/extract` — initiate portal extraction, return extracted events for confirmation
    - POST `/grabber/confirm` — confirm and import extracted events, handle conflict resolution
    - POST `/grabber/ics` — upload ICS file, validate, parse, detect conflicts, return for confirmation
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 10.5_

  - [ ]* 6.5 Write unit tests for grabber service
    - Test valid ICS file parsing with various VEVENT structures
    - Test ICS rejection for invalid format, > 5MB, > 500 events, 0 events
    - Test conflict detection with overlapping and non-overlapping intervals
    - Test portal extraction timeout handling
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9_

- [ ] 7. Implement Notes Service
  - [ ] 7.1 Implement notes service core logic
    - Create `packages/backend/src/services/notes.service.ts`
    - Implement `createNote()` — validate title/content/event, verify group membership, persist with NOTE# SK
    - Implement `updateNote()` — verify group membership, validate content, persist with last-write-wins, update lastModifiedBy/At
    - Implement `getNote()` — verify group membership, return full note content
    - Implement `getGroupNotes()` — query all notes for group, order by associated Academic_Event date ascending
    - Implement `getNotesForEvent()` — query GSI1 by EVENT# to find notes for a specific academic event
    - Implement `verifyGroupMembership()` — check user is member of the group
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 7.2 Implement notes Lambda handler
    - Create `packages/backend/src/handlers/notes.handler.ts`
    - GET `/notes/group/:groupId` — list notes for group ordered by event date
    - POST `/notes/group/:groupId` — create note linked to academic event
    - GET `/notes/:id` — get note content
    - PUT `/notes/:id` — update note content (last-write-wins)
    - Enforce authentication and group membership authorization
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 10.2, 10.4, 10.5_

  - [ ]* 7.3 Write property tests for notes service
    - **Property 15: Notes Last-Write-Wins** — random edit sequences verify final state = last write content and lastModifiedBy = last editor
    - **Property 16: Notes Ordering by Event Date** — random notes verify ascending chronological order by event date
    - **Validates: Requirements 8.4, 8.5**

  - [ ]* 7.4 Write unit tests for notes service
    - Test note creation with valid/invalid event references
    - Test authorization rejection for non-group-members
    - Test note content update and metadata tracking
    - Test notes listing ordered by academic event date
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7_

- [ ] 8. Implement Todo Service
  - [ ] 8.1 Implement todo service core logic
    - Create `packages/backend/src/services/todo.service.ts`
    - Implement `createTodo()` — validate item, set initial status "To Do", persist with TODO# SK
    - Implement `updateTodo()` — verify ownership, validate fields, persist changes, set completedAt when status → Done
    - Implement `deleteTodo()` — verify ownership, remove record
    - Implement `listActiveTodos()` — query user's todos with status ≠ Done, sort by priority desc then due date asc (nulls last)
    - Implement `listCompletedTodos()` — query user's todos with status = Done, sort by completedAt desc
    - Implement `sortTodos()` — pure function: priority (High > Medium > Low), then due date asc, nulls last
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [ ] 8.2 Implement todo Lambda handler
    - Create `packages/backend/src/handlers/todo.handler.ts`
    - GET `/todos` — list active todos (sorted)
    - GET `/todos/completed` — list completed todos
    - POST `/todos` — create todo item
    - PUT `/todos/:id` — update todo item
    - DELETE `/todos/:id` — delete todo item
    - Enforce authentication and ownership verification
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.2, 10.5_

  - [ ]* 8.3 Write property tests for todo sorting
    - **Property 18: Todo Sort Order** — random todo lists verify priority desc, then due date asc, nulls last
    - **Property 19: Completed Todos Reverse Chronological Order** — random completed todos verify reverse completedAt order
    - **Validates: Requirements 9.4, 9.5**

  - [ ]* 8.4 Write unit tests for todo service
    - Test todo creation with valid/invalid data
    - Test status transitions (To Do → In Progress → Done → Delayed)
    - Test ownership verification on update/delete
    - Test active todo sorting with mixed priorities and due dates
    - Test completed todos reverse chronological ordering
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement AI Planner Service
  - [ ] 10.1 Implement free window computation algorithm
    - Create `packages/backend/src/services/ai-planner.service.ts`
    - Implement `computeFreeWindows()` — for each day, collect all member events, merge overlapping busy intervals, compute complement within 08:00-22:00, filter by minimum duration
    - Implement `mergeBusyIntervals()` — sort and merge overlapping time intervals into consolidated timeline
    - Implement `parseDuration()` — extract meeting duration (15min-8hr) from natural language text
    - _Requirements: 7.1, 7.5, 7.6_

  - [ ]* 10.2 Write property tests for free window computation
    - **Property 12: Free Window Correctness** — random member schedules verify windows are within 08:00-22:00, ≥ requested duration, no overlap with any member event, and contiguous
    - **Property 13: Free Window Ordering** — verify at most 3 windows returned, ordered by earliest start time
    - **Property 14: Duration Parsing** — random NL duration strings verify correct extraction
    - **Validates: Requirements 7.1, 7.5, 7.6, 7.7**

  - [ ] 10.3 Implement Bedrock integration and AI response formatting
    - Implement `buildPrompt()` — construct Claude Haiku prompt with group context and scheduling query
    - Implement `invokeBedrock()` — call Amazon Bedrock with Claude Haiku model, 15-second timeout
    - Implement `formatResponse()` — format top 3 earliest free windows with day, start time, end time, duration
    - Handle case where no free windows exist — suggest shorter duration or different time range
    - Default to next 7 calendar days when no date range specified
    - _Requirements: 7.2, 7.3, 7.4, 7.7, 7.8_

  - [ ] 10.4 Implement AI planner Lambda handler
    - Create `packages/backend/src/handlers/ai-planner.handler.ts`
    - POST `/ai/schedule` — accept NL query, parse duration, fetch group schedules, compute free windows, format response
    - Enforce authentication and group membership
    - Handle Bedrock timeout gracefully
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 10.2, 10.4_

  - [ ]* 10.5 Write unit tests for AI planner service
    - Test free window computation with known schedules
    - Test duration parsing for various NL expressions
    - Test no-availability response generation
    - Test 08:00-22:00 boundary enforcement
    - Test top-3 ordering by earliest start time
    - _Requirements: 7.1, 7.5, 7.6, 7.7, 7.8_

- [ ] 11. Implement API middleware and response envelope
  - [ ] 11.1 Implement JWT authorization middleware
    - Create `packages/backend/src/middleware/auth.middleware.ts`
    - Implement token extraction from Authorization header
    - Implement token validation (signature + expiry check)
    - Return 401 for missing, expired, or invalid tokens
    - Skip auth for `/auth/register` and `/auth/login` endpoints
    - _Requirements: 10.2, 10.3_

  - [ ] 11.2 Implement API response formatter and error handler
    - Create `packages/backend/src/middleware/response.middleware.ts`
    - Implement consistent ApiResponse envelope for all responses
    - Map service-layer errors to HTTP status codes (200, 201, 400, 401, 403, 404, 500)
    - Include machine-readable error type and human-readable message
    - Include per-field validation errors in the fields property
    - Log full errors to CloudWatch, return sanitized errors to client
    - _Requirements: 10.5, 10.6, 10.7_

  - [ ]* 11.3 Write property tests for auth enforcement and response envelope
    - **Property 21: Authentication Enforcement** — random tokens (expired, malformed, missing, valid) verify correct 401/pass-through behavior
    - **Property 22: API Response Envelope Consistency** — random success/error responses verify envelope structure
    - **Validates: Requirements 10.2, 10.3, 10.6, 10.7**

- [ ] 12. Implement Next.js Frontend
  - [ ] 12.1 Set up Next.js app with routing and auth context
    - Create `packages/frontend/` with Next.js App Router
    - Implement auth context provider (store JWT, handle login/logout state)
    - Create login and registration pages with form validation
    - Set up API client utility with token attachment and error handling
    - Implement protected route wrapper (redirect to login if unauthenticated)
    - _Requirements: 1.1, 1.2, 1.3, 10.2_

  - [ ] 12.2 Implement dashboard and group management UI
    - Create dashboard page showing user's groups, upcoming events, active todos
    - Implement group creation form (name input, 1-100 chars)
    - Implement group detail page showing members and invite link
    - Implement join-via-invite flow
    - Implement leave group confirmation dialog
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [ ] 12.3 Implement timetable calendar view
    - Create weekly/daily calendar view component with time grid
    - Display academic events with module code, title, and location
    - Display personal events with category color coding (owner view)
    - Display busy blocks for other members in group timetable view
    - Implement event creation/edit forms for academic and personal events
    - Implement category management (create, edit, delete with color picker)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ] 12.4 Implement timetable grabber and ICS import UI
    - Create timetable import page with university portal selection
    - Implement ICS file upload with drag-and-drop support
    - Display extracted events for confirmation with conflict indicators
    - Implement conflict resolution UI (overwrite/skip per event)
    - Show error messages for invalid files or portal connection failures
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.7, 5.8, 5.9_

  - [ ] 12.5 Implement collaborative notes UI
    - Create notes list view for a group (ordered by event date)
    - Implement note creation form with academic event selector
    - Implement note editor with title and content fields
    - Display last-modified timestamp and editor info
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ] 12.6 Implement todo list UI
    - Create todo list page with active/completed tab views
    - Implement todo creation form (title, priority, optional due date)
    - Implement inline status update (To Do, In Progress, Done, Delayed)
    - Implement priority indicator with visual differentiation
    - Display sorted list (priority desc, due date asc, nulls last)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ] 12.7 Implement AI scheduling chat interface
    - Create chat-style UI within group context for scheduling queries
    - Implement natural language input for scheduling requests
    - Display AI responses with formatted time slot suggestions
    - Show loading state during AI processing
    - Handle and display error/clarification messages from AI
    - _Requirements: 7.1, 7.2, 7.7, 7.8_

- [ ] 13. Integration and wiring
  - [ ] 13.1 Wire API Gateway routes to Lambda handlers
    - Configure API Gateway REST API with all route mappings
    - Attach JWT authorizer to protected routes
    - Configure CORS for frontend origin
    - Set up environment variables for DynamoDB table name, Bedrock model ID, JWT secret
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 13.2 Connect frontend to backend API
    - Configure API base URL in frontend environment
    - Wire all frontend components to their corresponding API endpoints
    - Implement error handling and user-facing error messages
    - Test full authentication flow (register → login → access protected resources)
    - _Requirements: 10.1, 10.5, 10.6_

  - [ ]* 13.3 Write integration tests for key workflows
    - Test registration → login → create group → invite → join flow
    - Test create academic event → view timetable → view group timetable (masked)
    - Test create note → edit note → verify last-write-wins
    - Test AI scheduling query end-to-end with mocked Bedrock
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 4.1, 4.2, 6.7, 7.7, 8.3, 8.4_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints at tasks 4 and 9 ensure incremental validation of core services before building dependent features
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The frontend tasks (12.x) can be developed in parallel with backend integration (13.x) using mock API responses
- University portal scraping (task 6.3) should start with SIT as the primary target for the hackathon demo

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.5"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "2.1", "3.1"] },
    { "id": 4, "tasks": ["2.2", "2.3", "3.2"] },
    { "id": 5, "tasks": ["2.4", "3.3", "3.4"] },
    { "id": 6, "tasks": ["5.1", "8.1"] },
    { "id": 7, "tasks": ["5.2", "5.3", "8.2"] },
    { "id": 8, "tasks": ["5.4", "5.5", "6.1", "8.3", "8.4"] },
    { "id": 9, "tasks": ["5.6", "6.2", "6.3", "7.1"] },
    { "id": 10, "tasks": ["6.4", "6.5", "7.2", "10.1"] },
    { "id": 11, "tasks": ["7.3", "7.4", "10.2", "10.3"] },
    { "id": 12, "tasks": ["10.4", "10.5", "11.1", "11.2"] },
    { "id": 13, "tasks": ["11.3", "12.1"] },
    { "id": 14, "tasks": ["12.2", "12.3", "12.6"] },
    { "id": 15, "tasks": ["12.4", "12.5", "12.7"] },
    { "id": 16, "tasks": ["13.1"] },
    { "id": 17, "tasks": ["13.2"] },
    { "id": 18, "tasks": ["13.3"] }
  ]
}
```
