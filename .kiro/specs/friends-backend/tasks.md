# Implementation Plan: Friends Backend

## Overview

This plan implements the SyncCircle Friends Backend as an AWS serverless system using CDK for infrastructure, Lambda (Node.js 20) for business logic, DynamoDB for persistence, Cognito for auth, and SES for email invitations. Tasks are ordered to build foundational layers first (shared types, utilities, repositories) before handlers and frontend integration.

## Tasks

- [ ] 1. Set up project structure and shared types package
  - [ ] 1.1 Create shared types package at packages/shared/
    - Create `packages/shared/package.json` and `packages/shared/tsconfig.json`
    - Create `packages/shared/src/types/user-profile.ts` with UserProfile interface
    - Create `packages/shared/src/types/friend-request.ts` with FriendRequest interface and status enum
    - Create `packages/shared/src/types/friendship.ts` with Friendship interface, FriendshipAccessResult, and status enums
    - Create `packages/shared/src/types/api.ts` with API endpoint paths, request/response shapes, error codes, and auth header format
    - Create `packages/shared/src/index.ts` barrel export with JSDoc documentation comments and code examples
    - _Requirements: 20.1, 20.2, 20.3_

  - [ ] 1.2 Set up backend project structure and dependencies
    - Create `apps/backend/package.json` with dependencies: aws-sdk v3 clients, uuid, aws-cdk-lib, constructs, vitest, fast-check
    - Create `apps/backend/tsconfig.json` configured for Node.js 20 ESM
    - Create directory structure: `src/handlers/`, `src/services/`, `src/repositories/`, `src/utils/`, `src/types/`, `cdk/bin/`, `cdk/lib/`, `tests/`
    - Wire workspace references so backend imports from `@synccircle/shared`
    - _Requirements: 1.1, 22.1_

  - [ ] 1.3 Implement core utility modules
    - Create `src/utils/canonical-pair.ts` with `canonicalPair(userA, userB)` function (lexicographic ordering)
    - Create `src/utils/response.ts` with HTTP response helpers (success, created, error responses following ErrorResponse interface)
    - Create `src/utils/logger.ts` with structured JSON logger that strips PII (no emails, tokens, passwords in logs)
    - _Requirements: 1.6, 17.7_

  - [ ]* 1.4 Write property test for canonical pair ordering
    - **Property 5: Canonical pair ordering is deterministic and commutative**
    - Test that `canonicalPair(A, B) === canonicalPair(B, A)` and lower ID is always `userIdLow`
    - **Validates: Requirements 9.3, 1.4**

- [ ] 2. Implement validation and token services
  - [ ] 2.1 Implement validation service
    - Create `src/services/validation.service.ts`
    - Validate email format (max 254 chars, RFC-compliant regex)
    - Validate displayName (1-100 chars, non-empty)
    - Validate course (optional, max 100 chars)
    - Return `{ valid: boolean, errors: Array<{ field: string, message: string }> }`
    - Implement email normalization: `email.trim().toLowerCase()`
    - Implement display name comparison: case-insensitive, trim-invariant
    - Implement self-action check (sender email === recipient email after normalization)
    - _Requirements: 3.2, 3.4, 4.1, 4.2, 4.5, 4.8, 4.9, 5.4, 5.11, 17.2_

  - [ ]* 2.2 Write property tests for email normalization
    - **Property 1: Email normalization is idempotent and correct**
    - Test idempotency: `normalize(normalize(email)) === normalize(email)`
    - Test correctness: `normalize(email) === email.trim().toLowerCase()`
    - **Validates: Requirements 3.2, 4.1**

  - [ ]* 2.3 Write property tests for input validation
    - **Property 2: Input validation rejects all invalid inputs**
    - Generate arbitrary strings and verify rejection of invalid emails, empty required fields, oversized strings
    - **Validates: Requirements 3.4, 4.8, 4.9, 5.11, 17.2**

  - [ ]* 2.4 Write property test for self-action prevention
    - **Property 3: Self-action prevention**
    - Generate email variants (case, whitespace) and verify self-search/self-request always rejected
    - **Validates: Requirements 4.5, 5.4**

  - [ ]* 2.5 Write property test for display name comparison
    - **Property 4: Display name comparison is case-insensitive and trim-invariant**
    - Generate name pairs with varying case/whitespace and verify match logic
    - **Validates: Requirements 4.2**

  - [ ] 2.6 Implement token service
    - Create `src/services/token.service.ts`
    - Generate cryptographically secure token (32+ bytes using `crypto.randomBytes`)
    - Hash token using SHA-256 (`crypto.createHash('sha256')`)
    - Calculate expiry timestamp (7 days from creation, ISO 8601)
    - Provide token validation helper (compare hash, check expiry)
    - _Requirements: 5.8, 7.5_

  - [ ]* 2.7 Write property tests for token security
    - **Property 6: Invitation token security**
    - Verify token >= 32 bytes, hash !== plaintext, hash(token) is consistent, uniqueness across generations
    - **Validates: Requirements 5.8**

  - [ ]* 2.8 Write property test for token expiry enforcement
    - **Property 7: Token expiry enforcement**
    - Generate timestamps before/after expiry and verify correct expiry determination
    - **Validates: Requirements 7.5, 8.4, 12.3**

  - [ ]* 2.9 Write property test for token hash validation
    - **Property 8: Token validation rejects non-matching hashes**
    - Generate random strings and verify they don't validate against stored hashes
    - **Validates: Requirements 7.7**

- [ ] 3. Checkpoint - Ensure utilities and services compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement DynamoDB repository layer
  - [ ] 4.1 Implement UserProfile repository
    - Create `src/repositories/user-profile.repo.ts`
    - Implement `createProfile(profile)` using PutItem
    - Implement `getByUserId(userId)` using GetItem
    - Implement `getByNormalizedEmail(email)` using Query on normalizedEmail-index GSI
    - Implement `batchGetByUserIds(userIds)` using BatchGetItem
    - Implement `updateProfile(userId, updates)` using UpdateItem with updatedAt
    - _Requirements: 3.1, 3.2, 3.3, 4.1_

  - [ ] 4.2 Implement FriendRequest repository
    - Create `src/repositories/friend-request.repo.ts`
    - Implement `create(request)` using PutItem
    - Implement `getById(requestId)` using GetItem
    - Implement `getBySenderUserId(senderId)` using Query on senderUserId-createdAt-index
    - Implement `getByReceiverUserId(receiverId)` using Query on receiverUserId-createdAt-index
    - Implement `getByNormalizedEmail(email)` using Query on normalizedReceiverEmail-index
    - Implement `getByTokenHash(hash)` using Query on tokenHash-index
    - Implement `queryPendingBetweenUsers(userA, userB)` for duplicate check
    - Implement `updateStatus(requestId, status, respondedAt)` with conditional write (status must be "pending")
    - Implement `setReceiverUserId(requestId, userId)` for registration attachment
    - _Requirements: 5.1, 5.5, 8.2, 12.1, 12.2_

  - [ ] 4.3 Implement Friendship repository
    - Create `src/repositories/friendship.repo.ts`
    - Implement `create(friendship)` using PutItem with condition (prevent duplicate)
    - Implement `getByCanonicalPair(userIdLow, userIdHigh)` using Query
    - Implement `getByUserId(userId)` querying both userIdLow-index and userIdHigh-index
    - Implement `updateStatus(friendshipId, status, updatedAt)` using UpdateItem
    - Implement `transactAccept(requestUpdate, friendshipCreate)` using TransactWriteItems
    - _Requirements: 9.2, 9.3, 13.1, 14.1_

- [ ] 5. Implement email service
  - [ ] 5.1 Implement email service
    - Create `src/services/email.service.ts`
    - Compose invitation email with: sender display name, app name "SyncCircle", invitation link, 7-day expiry note, login/register instructions, ignore note
    - Construct invitation link from configured base URL + token as query parameter
    - Send via SES with both HTML and plain text parts (multipart MIME)
    - Handle SES failures gracefully (log error, return `emailSent: false`)
    - Support local adapter mode: log full email content instead of calling SES (controlled by env var)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 5.2 Write property test for email composition
    - **Property 20: Email composition completeness**
    - Verify email contains sender name, "SyncCircle", invitation link with token, 7-day expiry, HTML + plain text
    - **Validates: Requirements 6.2, 6.3, 6.6**

- [ ] 6. Implement Lambda handlers - Search and Friend Requests
  - [ ] 6.1 Implement search handler
    - Create `src/handlers/search.ts`
    - Validate input (email format, displayName length)
    - Check self-search (reject if sender email matches)
    - Query UserProfiles by normalizedEmail
    - If found: check displayName match (case-insensitive), check existing friendship, check pending request
    - Return appropriate status: found, name_mismatch, not_registered, already_friends, pending_request, self_search
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.10_

  - [ ] 6.2 Implement create friend request handler
    - Create `src/handlers/friend-requests/create.ts`
    - Validate input (email, displayName)
    - Check self-request
    - Check existing friendship (reject if already friends)
    - Check pending request in either direction (reject if duplicate)
    - Allow re-request after rejection/expiry
    - Generate token, hash it, set 7-day expiry
    - Create FriendRequest record (set receiverUserId if registered, leave empty if not)
    - Trigger email service (non-blocking on failure)
    - Return 201 with requestId, status, emailSent flag
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [ ] 6.3 Implement accept friend request handler
    - Create `src/handlers/friend-requests/accept.ts`
    - Get request by ID (404 if not found)
    - Verify caller is receiverUserId (403 if not)
    - Check status is "pending" (409 if not; handle idempotent re-accept)
    - Use TransactWriteItems: update request status to "accepted" + create Friendship with canonical pair
    - Handle conditional write failures (race conditions)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 16.1_

  - [ ] 6.4 Implement reject friend request handler
    - Create `src/handlers/friend-requests/reject.ts`
    - Get request by ID (404 if not found)
    - Verify caller is receiverUserId (403 if not)
    - Check status is "pending" (409 if not; handle idempotent re-reject)
    - Update status to "rejected", set respondedAt
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 16.2_

  - [ ] 6.5 Implement cancel friend request handler
    - Create `src/handlers/friend-requests/cancel.ts`
    - Get request by ID (404 if not found)
    - Verify caller is senderUserId (403 if not)
    - Check status is "pending" (409 if not; handle idempotent re-cancel)
    - Update status to "cancelled"
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 16.3_

  - [ ] 6.6 Implement list incoming/outgoing handlers
    - Create `src/handlers/friend-requests/incoming.ts` — query by receiverUserId, filter status="pending", sort descending, max 100
    - Create `src/handlers/friend-requests/outgoing.ts` — query by senderUserId, mark expired tokens, sort descending, max 100
    - Enrich incoming requests with sender display names via UserProfile batch get
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ] 6.7 Implement validate-token handler
    - Create `src/handlers/friend-requests/validate-token.ts`
    - Hash incoming token, query by tokenHash-index
    - Check expiry (410 if expired)
    - Check if already used/responded (410 if used)
    - Check caller's normalizedEmail matches request's normalizedReceiverEmail (403 if wrong recipient)
    - Return sender display name and createdAt
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 7. Implement Lambda handlers - Friends and Relationship
  - [ ] 7.1 Implement list friends handler
    - Create `src/handlers/friends/list.ts`
    - Query Friendships by userId (both GSIs), filter status="active"
    - Enrich with friend display names via UserProfile batch get
    - Return friends array with friendId, displayName, createdAt
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ] 7.2 Implement remove friend handler
    - Create `src/handlers/friends/remove.ts`
    - Get friendship by ID
    - Verify caller is one of the two users in canonical pair (403 if not)
    - Update status to "removed", set updatedAt
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 7.3 Implement relationship query handler
    - Create `src/handlers/friends/relationship.ts`
    - Query Friendships table for canonical pair
    - Query FriendRequests for pending between users
    - Determine relationshipStatus: active, pending, rejected, removed, blocked, or none
    - Set isActiveFriend = true only when status is "active"
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [ ] 7.4 Implement post-confirmation trigger
    - Create `src/handlers/triggers/post-confirmation.ts`
    - Create UserProfile record from Cognito event data
    - Query FriendRequests by normalizedEmail (status="pending")
    - For each matching request: if not expired, set receiverUserId; if expired, mark as "expired"
    - Continue processing on individual failures, log errors
    - _Requirements: 3.1, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 7.5 Write property tests for authorization enforcement
    - **Property 10: Authorization enforcement (correct actor only)**
    - Generate user IDs and verify only correct actor can accept/reject/cancel/remove
    - **Validates: Requirements 9.5, 10.2, 11.2, 14.4**

  - [ ]* 7.6 Write property tests for status precondition enforcement
    - **Property 11: Status precondition enforcement**
    - Generate non-pending statuses and verify operations return 409
    - **Validates: Requirements 9.6, 10.3, 11.3**

  - [ ]* 7.7 Write property test for non-existent resource handling
    - **Property 12: Non-existent resource returns 404**
    - Generate random UUIDs and verify 404 for non-existent resources
    - **Validates: Requirements 9.7, 10.4, 11.4**

  - [ ]* 7.8 Write property tests for state transitions
    - **Property 13: State transitions set correct fields**
    - Verify accept sets "accepted" + respondedAt, reject sets "rejected" + respondedAt, cancel sets "cancelled", remove sets "removed" + updatedAt
    - **Validates: Requirements 9.1, 10.1, 11.1, 14.1**

  - [ ]* 7.9 Write property tests for idempotent operations
    - **Property 14: Idempotent operations**
    - Verify re-accept/re-reject/re-cancel return success without duplicates; incompatible operations return error
    - **Validates: Requirements 16.1, 16.2, 16.3, 16.4**

  - [ ]* 7.10 Write property test for duplicate request prevention
    - **Property 15: Duplicate request prevention**
    - Generate user pairs with existing pending requests or active friendships and verify rejection
    - **Validates: Requirements 5.5, 5.6**

  - [ ]* 7.11 Write property test for pending request attachment on registration
    - **Property 16: Pending request attachment on registration**
    - Generate pending requests with various expiry states and verify correct attachment/expiry on registration
    - **Validates: Requirements 8.2, 8.4**

  - [ ]* 7.12 Write property test for recipient email enforcement
    - **Property 9: Recipient email enforcement on invitation actions**
    - Generate mismatched emails and verify rejection with wrong-recipient error
    - **Validates: Requirements 7.8**

- [ ] 8. Checkpoint - Ensure all handler logic compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement CDK infrastructure
  - [ ] 9.1 Create CDK app entry and main stack
    - Create `cdk/bin/app.ts` with CDK App instantiation
    - Create `cdk/lib/friends-stack.ts` as the main stack composing all constructs
    - _Requirements: 1.1_

  - [ ] 9.2 Create DynamoDB construct
    - Create `cdk/lib/dynamodb-construct.ts`
    - Define UserProfiles table (PK: userId, GSI: normalizedEmail-index, on-demand billing)
    - Define FriendRequests table (PK: requestId, GSIs: senderUserId-createdAt-index, receiverUserId-createdAt-index, normalizedReceiverEmail-index, tokenHash-index, on-demand billing)
    - Define Friendships table (PK: friendshipId, GSIs: userIdLow-index, userIdHigh-index, on-demand billing)
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ] 9.3 Create Cognito construct
    - Create `cdk/lib/cognito-construct.ts`
    - Define user pool with email sign-in, auto-verify email, password policy (min 8, uppercase, lowercase, number, special)
    - Configure custom attributes (displayName, course)
    - Set token validity (access: 1h, refresh: 30d)
    - Attach post-confirmation Lambda trigger
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ] 9.4 Create Lambda construct
    - Create `cdk/lib/lambda-construct.ts`
    - Define all Lambda functions (Node.js 20 runtime, appropriate timeout/memory)
    - Assign least-privilege IAM policies per function (specific DynamoDB actions on specific table ARNs, SES SendEmail)
    - Set environment variables (table names, SES sender, frontend base URL)
    - _Requirements: 1.5, 1.6_

  - [ ] 9.5 Create API Gateway construct
    - Create `cdk/lib/api-construct.ts`
    - Define REST API with Cognito authorizer
    - Configure all routes matching the API design (search, friend-requests CRUD, friends CRUD, relationship)
    - Set up request validation (body models for POST endpoints)
    - Configure CORS (restrict to frontend origin via env var)
    - Configure rate limiting (10 requests per 10s per user on specified endpoints)
    - _Requirements: 2.4, 2.5, 17.1, 17.3, 17.4, 17.5_

  - [ ] 9.6 Create SES construct
    - Create `cdk/lib/ses-construct.ts`
    - Configure verified sender identity from environment variable
    - _Requirements: 6.5_

  - [ ] 9.7 Configure CloudWatch logging
    - Enable CloudWatch logs for all Lambdas and API Gateway
    - Set 14-day retention period
    - _Requirements: 1.6_

  - [ ]* 9.8 Write CDK infrastructure tests
    - Create `tests/cdk/friends-stack.test.ts`
    - Verify DynamoDB table schemas, GSI configurations, billing mode
    - Verify IAM policies are least-privilege (no wildcard ARNs)
    - Verify Lambda runtime, authorizer config, CORS settings
    - Verify CloudWatch log retention
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 10. Checkpoint - Ensure CDK synthesizes and infrastructure tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement frontend API client and hooks
  - [ ] 11.1 Create authenticated API client
    - Create `apps/frontend/src/app/lib/api-client.ts`
    - Implement fetch wrapper that attaches Cognito JWT as `Authorization: Bearer {token}`
    - Handle 401 responses (trigger re-auth)
    - Handle error responses (parse ErrorResponse shape)
    - Configure base URL from environment variable
    - _Requirements: 18.1, 21.1_

  - [ ] 11.2 Implement auth hook
    - Create `apps/frontend/src/app/hooks/useAuth.ts`
    - Integrate with Cognito for login, register, confirm, refresh
    - Expose authenticated user state and JWT token
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 11.3 Implement friends API hooks
    - Create `apps/frontend/src/app/hooks/useFriendsApi.ts` — list friends, remove friend
    - Create `apps/frontend/src/app/hooks/useFriendRequests.ts` — send request, list incoming/outgoing, accept, reject, cancel
    - Use API client, handle loading/error states
    - Remove all localStorage usage for friend-related operations
    - _Requirements: 18.1, 21.1, 21.2, 21.3_

- [ ] 12. Implement frontend pages
  - [ ] 12.1 Update Friends page
    - Update `apps/frontend/src/app/pages/Friends.tsx` (or create if not exists)
    - Display four sections: Current Friends, Incoming Requests, Sent Requests, Add Friend form
    - Show loading indicators during API calls
    - Add Friend form: validate displayName (1-100 chars) and email (valid format) client-side before submitting
    - Show success toast on successful request, error toast on failure
    - Current Friends: display name, remove button with confirmation dialog
    - Incoming Requests: sender name, relative date, accept/reject buttons
    - Sent Requests: recipient email, status badge, cancel button (pending only)
    - Empty states per section
    - No localStorage fallback — show error on API failure
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 21.1, 21.2, 21.3_

  - [ ] 12.2 Implement Invitation page
    - Create `apps/frontend/src/app/pages/Invitation.tsx`
    - Route: `/invite/{token}`
    - If unauthenticated: redirect to auth page preserving token URL
    - If authenticated: call validate-token endpoint
    - Display sender name + accept/reject buttons on valid token
    - Display specific error messages for expired/used/invalid tokens
    - On accept/reject success: redirect to Friends page
    - On failure: show error, keep buttons enabled for retry
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ]* 12.3 Write property tests for list filtering
    - **Property 17: List filtering correctness**
    - Generate sets of friend request records and verify incoming/outgoing filtering, sorting, and limit
    - **Validates: Requirements 12.1, 12.2, 12.4, 12.6**

  - [ ]* 12.4 Write property test for friends list filtering
    - **Property 18: Friends list returns only active friendships**
    - Generate friendship records with various statuses and verify only active returned
    - **Validates: Requirements 13.1, 13.2, 14.2**

  - [ ]* 12.5 Write property test for relationship query consistency
    - **Property 19: Relationship query consistency**
    - Generate relationship states and verify isActiveFriend === (status === "active")
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4**

  - [ ]* 12.6 Write property tests for response format
    - **Property 21: ISO 8601 timestamp format**
    - Verify all timestamp fields in API responses are valid ISO 8601
    - **Property 22: No internal data leakage in API responses**
    - Verify responses don't contain tokenHash, internal keys, or unauthorized emails
    - **Validates: Requirements 17.6, 17.7, 1.6**

- [ ] 13. Final checkpoint - Ensure all tests pass and project builds
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses TypeScript throughout (CDK, Lambda handlers, shared types)
- Frontend hooks replace all localStorage usage — no fallback to mock data
- CDK infrastructure is idempotent (deploying twice produces no changes on second run)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.6"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.7", "2.8", "2.9"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1", "6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4", "6.5", "6.6", "6.7"] },
    { "id": 7, "tasks": ["7.1", "7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["7.5", "7.6", "7.7", "7.8", "7.9", "7.10", "7.11", "7.12"] },
    { "id": 9, "tasks": ["9.1"] },
    { "id": 10, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 11, "tasks": ["9.8"] },
    { "id": 12, "tasks": ["11.1", "11.2"] },
    { "id": 13, "tasks": ["11.3"] },
    { "id": 14, "tasks": ["12.1", "12.2"] },
    { "id": 15, "tasks": ["12.3", "12.4", "12.5", "12.6"] }
  ]
}
```
