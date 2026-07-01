# Requirements Document

## Introduction

This document specifies the requirements for the SyncCircle Friends Backend feature. The feature replaces the current localStorage-only friends implementation with a production-grade AWS serverless backend supporting authenticated friend search, friend request lifecycle management, email invitations via Amazon SES, and persistent friendship storage. The backend uses AWS Cognito for authentication, API Gateway for REST endpoints, Lambda for business logic, and DynamoDB for data persistence. The frontend is updated to consume authenticated API calls instead of localStorage.

## Glossary

- **Friends_Backend**: The AWS serverless backend system comprising API Gateway, Lambda functions, DynamoDB tables, Cognito user pool, and SES email integration that manages the friends feature
- **API_Gateway**: The AWS API Gateway REST API that exposes friend-related endpoints and validates Cognito JWT tokens
- **Auth_Service**: The AWS Cognito user pool and associated configuration that handles user registration, login, and token issuance
- **Friend_Request_Service**: The Lambda function logic responsible for creating, querying, accepting, rejecting, and cancelling friend requests
- **Friendship_Service**: The Lambda function logic responsible for managing active friendships, including creation via acceptance and removal
- **Search_Service**: The Lambda function logic responsible for looking up users by email and display name confirmation
- **Email_Service**: The Amazon SES integration that sends invitation emails to friend request recipients
- **Invitation_Token**: A cryptographically secure, single-use, time-limited token embedded in invitation email links
- **Canonical_Pair**: A deterministic ordering of two user IDs (lexicographic, lower ID always first) used to prevent duplicate friendship records
- **Normalized_Email**: An email address converted to lowercase with whitespace trimmed for case-insensitive comparison
- **User_Profile**: A DynamoDB record containing userId, email, normalizedEmail, displayName, course, createdAt, and updatedAt
- **Friend_Request**: A DynamoDB record representing a pending, accepted, rejected, expired, or cancelled friend invitation
- **Friendship**: A DynamoDB record representing an active, removed, or blocked relationship between two users stored as a canonical pair
- **Invitation_Page**: The frontend route that handles invitation link navigation, authentication redirect, and accept/reject UI
- **Friends_Page**: The frontend page displaying current friends, incoming requests, sent requests, and the add friend form

## Requirements

### Requirement 1: AWS Infrastructure Provisioning

**User Story:** As a developer, I want the friends backend infrastructure defined as code, so that the team can deploy and tear down the environment reproducibly.

#### Acceptance Criteria

1. THE Friends_Backend SHALL define all AWS resources (Cognito user pool, API Gateway, Lambda functions, DynamoDB tables, SES configuration, IAM roles, CloudWatch log groups) using AWS CDK or SAM infrastructure-as-code such that running the deploy command twice in succession produces no resource changes on the second run
2. THE Friends_Backend SHALL provision a DynamoDB table for User_Profile entities with userId as the partition key, a GSI on normalizedEmail, and on-demand (PAY_PER_REQUEST) billing mode
3. THE Friends_Backend SHALL provision a DynamoDB table for Friend_Request entities with requestId as the partition key, GSIs on senderUserId, receiverUserId, and normalizedReceiverEmail, and on-demand (PAY_PER_REQUEST) billing mode
4. THE Friends_Backend SHALL provision a DynamoDB table for Friendship entities with friendshipId as the partition key, a GSI on each user ID field in the Canonical_Pair (where Canonical_Pair stores two user IDs in lexicographic order so the lower ID is always first), and on-demand (PAY_PER_REQUEST) billing mode
5. THE Friends_Backend SHALL assign least-privilege IAM policies to each Lambda function granting only the specific DynamoDB actions (e.g., GetItem, PutItem, Query, DeleteItem) on the specific table ARNs and SES SendEmail action required by that function, with no wildcard resource ARNs
6. THE Friends_Backend SHALL enable CloudWatch logging for all Lambda functions and API Gateway with a log retention period of 14 days, and SHALL NOT log authentication tokens, API keys, passwords, or personally identifiable email addresses in plain text
7. WHEN a developer runs the infrastructure destroy command, THE Friends_Backend SHALL remove all provisioned resources and return the AWS account to the pre-deployment state with no orphaned resources

### Requirement 2: User Authentication

**User Story:** As a user, I want to register and log in with my email and password, so that my identity is verified and my data is secure.

#### Acceptance Criteria

1. THE Auth_Service SHALL allow users to register with email, password, and display name
2. THE Auth_Service SHALL require email verification before granting access to protected endpoints
3. THE Auth_Service SHALL issue JWT access tokens and refresh tokens upon successful authentication
4. WHEN a request is made to any protected endpoint, THE API_Gateway SHALL validate the Cognito JWT token and reject requests with missing, expired, or invalid tokens with HTTP 401
5. THE API_Gateway SHALL extract the authenticated userId from the validated token and pass it to Lambda functions as the caller identity
6. THE Auth_Service SHALL enforce password complexity requirements (minimum 8 characters, at least one uppercase letter, one lowercase letter, one number, one special character)

### Requirement 3: User Profile Management

**User Story:** As a user, I want my profile stored in the backend, so that other users can find me and my data persists across sessions.

#### Acceptance Criteria

1. WHEN a user completes registration and email verification, THE Friends_Backend SHALL create a User_Profile record with userId, email, Normalized_Email, displayName (between 1 and 50 characters), course (optional, maximum 100 characters), and createdAt timestamp in ISO 8601 format
2. THE Friends_Backend SHALL store the Normalized_Email as a lowercase-trimmed version of the user's email for case-insensitive lookups
3. WHEN a user updates their display name or course with valid values, THE Friends_Backend SHALL update the User_Profile record and set the updatedAt timestamp in ISO 8601 format
4. IF a user submits a profile update with a display name that is empty, exceeds 50 characters, or a course value that exceeds 100 characters, THEN THE Friends_Backend SHALL reject the update, preserve the existing User_Profile record unchanged, and return an error message indicating which field failed validation

### Requirement 4: Friend Search

**User Story:** As a user, I want to search for other users by display name and email, so that I can send them friend requests.

#### Acceptance Criteria

1. WHEN a user submits a friend search with display name (1 to 100 characters) and email (valid email format, maximum 254 characters) via POST /friends/search, THE Search_Service SHALL look up the recipient by Normalized_Email (lowercase-trimmed)
2. WHEN the email matches a registered user and the display name matches (case-insensitive, trimmed comparison), THE Search_Service SHALL return a confirmation that the user was found (without exposing userId or sensitive profile data)
3. WHEN the email matches a registered user but the display name does not match, THE Search_Service SHALL return a name mismatch indicator
4. WHEN the email does not match any registered user, THE Search_Service SHALL return an indication that the recipient is not registered (suitable for unregistered invitation flow)
5. WHEN a user searches for their own email, THE Search_Service SHALL return an error indicating self-search is not permitted
6. WHEN a user searches for an email that already has an active friendship with the searcher, THE Search_Service SHALL return an already-friends indicator
7. WHEN a user searches for an email that has a pending friend request from or to the searcher, THE Search_Service SHALL return a pending-request indicator
8. WHEN the submitted email fails format validation or exceeds 254 characters, THE Search_Service SHALL return a validation error
9. WHEN the submitted display name is empty, missing, or exceeds 100 characters, THE Search_Service SHALL return a validation error
10. THE Search_Service SHALL use generic error responses for rate-limiting and server errors that do not reveal whether a specific email is registered to prevent user enumeration

### Requirement 5: Friend Request Creation

**User Story:** As a user, I want to send friend requests, so that I can initiate connections with other students.

#### Acceptance Criteria

1. WHEN a user sends a friend request via POST /friend-requests with a recipient email (maximum 254 characters, valid email format) and a display name (1 to 100 characters), THE Friend_Request_Service SHALL create a Friend_Request record with status "pending", senderUserId, receiverUserId (if registered), receiverEmail, Normalized_Email, and createdAt in ISO 8601 format
2. WHEN the recipient is a registered user, THE Friend_Request_Service SHALL set the receiverUserId on the Friend_Request record
3. WHEN the recipient is not registered, THE Friend_Request_Service SHALL store the Friend_Request with receiverUserId empty and the receiverEmail populated for later attachment
4. IF a user attempts to send a friend request to themselves (recipient email matches sender email after normalization), THEN THE Friend_Request_Service SHALL reject the request with an error message indicating the user cannot send a request to themselves
5. IF a pending friend request already exists between the same two users in either direction, THEN THE Friend_Request_Service SHALL reject the duplicate request with an error message indicating a pending request already exists
6. IF an active friendship already exists between the two users, THEN THE Friend_Request_Service SHALL reject the request with an error message indicating the users are already friends
7. WHEN a previous request between the same users was rejected or expired, THE Friend_Request_Service SHALL allow a new request to be created
8. THE Friend_Request_Service SHALL generate a cryptographically secure Invitation_Token of at least 32 bytes of randomness, store only its hash in the Friend_Request record, and set a token expiry timestamp to 7 days from creation
9. WHEN a Friend_Request record is successfully created, THE Friend_Request_Service SHALL trigger the Email_Service to send an invitation email to the recipient
10. IF the Email_Service fails to send the invitation email, THEN THE Friend_Request_Service SHALL retain the created Friend_Request record and return a response indicating the request was created but the invitation email could not be sent
11. IF the recipient email is not in valid email format or the display name is empty or exceeds 100 characters, THEN THE Friend_Request_Service SHALL reject the request with an error message indicating which field failed validation

### Requirement 6: Invitation Email Delivery

**User Story:** As a user, I want my friend request recipients to receive an email invitation, so that they can respond even if they are not currently using the app.

#### Acceptance Criteria

1. WHEN a friend request is created, THE Email_Service SHALL send an invitation email to the recipient's email address via Amazon SES within 30 seconds of the request creation
2. THE Email_Service SHALL include in the email: sender display name, application name (SyncCircle), a statement that the sender wants to connect, a clickable invitation link containing the Invitation_Token, the token expiry duration (7 days from creation), instructions to log in or register to respond, and a note that the recipient can ignore the email if they do not wish to connect
3. THE Email_Service SHALL construct the invitation link using a base URL configured via environment variable, pointing to the Invitation_Page route with the token as a URL query parameter
4. IF the Email_Service fails to send the email, THEN THE Friends_Backend SHALL log the failure, retain the Friend_Request record in "pending" status, and return an error to the sender indicating the invitation could not be delivered
5. THE Email_Service SHALL use a verified SES sender identity configured via environment variables
6. THE Email_Service SHALL send the invitation email in both HTML and plain text formats (multipart MIME) so that all email clients can render the content
7. WHERE the local adapter mode is enabled, THE Email_Service SHALL log the full email content (recipient, subject, body) to the application log without calling Amazon SES

### Requirement 7: Invitation Link Handling

**User Story:** As an invited user, I want to click the invitation link and be guided through authentication before responding, so that my response is secure and verified.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to the Invitation_Page with a token, THE Invitation_Page SHALL redirect the user to the login/register page while preserving the original invitation URL (including the token path) as the post-authentication redirect destination
2. WHEN the user completes authentication (login or registration), THE Invitation_Page SHALL redirect the user back to the original invitation URL with the token intact
3. WHEN an authenticated user navigates to the Invitation_Page, THE Friends_Backend SHALL validate the token via GET /friend-requests/invite/{token}
4. WHEN the token is valid and has not exceeded its 7-day expiration window, THE Friends_Backend SHALL return the friend request details (sender display name, request date) without exposing the token hash, and THE Invitation_Page SHALL display the sender's display name, the request date, and accept/reject action buttons
5. IF the token has exceeded its 7-day expiration window, THEN THE Friends_Backend SHALL return an expiry error, and THE Invitation_Page SHALL display a message indicating the invitation has expired
6. IF the token has already been used (request already accepted/rejected), THEN THE Friends_Backend SHALL return a used-token error, and THE Invitation_Page SHALL display a message indicating the invitation has already been responded to
7. IF the token is malformed or does not match any request, THEN THE Friends_Backend SHALL return an invalid-token error, and THE Invitation_Page SHALL display a message indicating the invitation link is invalid
8. WHEN the authenticated user's Normalized_Email does not match the recipient Normalized_Email on the Friend_Request, THE Friends_Backend SHALL reject the action with a wrong-recipient error, and THE Invitation_Page SHALL display a message indicating the invitation was intended for a different account

### Requirement 8: Unregistered Recipient Handling

**User Story:** As a sender, I want to invite someone who does not have a SyncCircle account yet, so that they can join and become my friend.

#### Acceptance Criteria

1. WHEN a friend request targets an unregistered email, THE Friend_Request_Service SHALL store the request with status "pending", the receiverEmail, Normalized_Email, and receiverUserId left empty for future matching upon recipient registration
2. WHEN a new user completes registration and email verification, THE Friends_Backend SHALL query all Friend_Request records with status "pending" that match the new user's Normalized_Email and update each matching record by setting the receiverUserId to the new user's userId
3. WHEN pending requests are attached to the newly registered user, THE Friends_Backend SHALL include those requests in the results of GET /friend-requests/incoming for that user, displaying sender display name and createdAt
4. IF a Friend_Request has a token expiry timestamp in the past at the time of recipient registration, THEN THE Friends_Backend SHALL mark that request as "expired" and SHALL NOT attach it to the newly registered user
5. IF the Friends_Backend fails to attach one or more pending requests during registration processing, THEN THE Friends_Backend SHALL log the failure and continue processing remaining requests without blocking account creation

### Requirement 9: Accept Friend Request

**User Story:** As a recipient, I want to accept a friend request, so that we become friends and can see each other in our friends lists.

#### Acceptance Criteria

1. WHEN the intended recipient sends POST /friend-requests/{requestId}/accept, THE Friend_Request_Service SHALL update the Friend_Request status to "accepted" and set the respondedAt timestamp in ISO 8601 format
2. WHEN a friend request is accepted, THE Friendship_Service SHALL atomically create a Friendship record using a DynamoDB transaction (update request status + create friendship in a single transaction)
3. THE Friendship_Service SHALL store the Friendship record using the Canonical_Pair of both user IDs (lexicographic order, lower ID first) to prevent duplicate friendship records
4. THE Friendship record SHALL contain friendshipId, both user IDs, status "active", and createdAt in ISO 8601 format
5. IF a user other than the intended recipient attempts to accept the request, THEN THE Friend_Request_Service SHALL reject the action with HTTP 403
6. IF the friend request status is not "pending", THEN THE Friend_Request_Service SHALL return HTTP 409 indicating the request cannot be accepted because it is no longer pending
7. IF the requestId does not correspond to an existing friend request, THEN THE Friend_Request_Service SHALL return HTTP 404
8. IF a concurrent acceptance creates a race condition, THEN THE Friendship_Service SHALL use conditional writes to ensure only one Friendship record is created

### Requirement 10: Reject Friend Request

**User Story:** As a recipient, I want to reject a friend request, so that I can decline connections I do not want.

#### Acceptance Criteria

1. WHEN the intended recipient sends POST /friend-requests/{requestId}/reject, THE Friend_Request_Service SHALL update the Friend_Request status to "rejected", set the respondedAt timestamp to the current server time in ISO 8601 format, and return HTTP 200 with the updated friend request object
2. IF a user other than the intended recipient attempts to reject the request, THEN THE Friend_Request_Service SHALL reject the action with HTTP 403 and return an error message indicating the user is not authorized to reject this request
3. IF the friend request status is not "pending", THEN THE Friend_Request_Service SHALL return HTTP 409 and an error message indicating the request cannot be rejected because it is no longer pending
4. IF the requestId does not correspond to an existing friend request, THEN THE Friend_Request_Service SHALL return HTTP 404 and an error message indicating the request was not found
5. WHEN a friend request is rejected, THE Friend_Request_Service SHALL allow the sender to create a new friend request to the same recipient immediately without any cooldown period

### Requirement 11: Cancel Friend Request

**User Story:** As a sender, I want to cancel a pending friend request, so that I can withdraw an invitation I no longer want to send.

#### Acceptance Criteria

1. WHEN the sender sends POST /friend-requests/{requestId}/cancel, THE Friend_Request_Service SHALL update the Friend_Request status to "cancelled" and invalidate the associated Invitation_Token by marking it as used
2. IF a user other than the sender attempts to cancel the request, THEN THE Friend_Request_Service SHALL reject the action with HTTP 403
3. IF the friend request status is not "pending", THEN THE Friend_Request_Service SHALL return HTTP 409 indicating the request cannot be cancelled because it is no longer pending
4. IF the requestId does not correspond to an existing friend request, THEN THE Friend_Request_Service SHALL return HTTP 404

### Requirement 12: List Friend Requests

**User Story:** As a user, I want to view my incoming and outgoing friend requests, so that I can manage my pending connections.

#### Acceptance Criteria

1. WHEN a user sends GET /friend-requests/incoming, THE Friend_Request_Service SHALL return all Friend_Request records where the user is the receiver and status is "pending", including sender display name and createdAt timestamp in ISO 8601 format
2. WHEN a user sends GET /friend-requests/outgoing, THE Friend_Request_Service SHALL return all Friend_Request records where the user is the sender, including recipient email, status (one of "pending", "accepted", "rejected", or "expired"), and createdAt timestamp in ISO 8601 format
3. WHEN the Friend_Request_Service returns results for either incoming or outgoing requests, THE Friend_Request_Service SHALL mark any request whose token expiry timestamp is earlier than the current server time as "expired" status before including it in the response
4. THE Friend_Request_Service SHALL return results sorted by createdAt descending (newest first)
5. IF the user has no pending incoming or outgoing friend requests, THEN THE Friend_Request_Service SHALL return an empty list with no error
6. WHEN a user sends GET /friend-requests/incoming or GET /friend-requests/outgoing, THE Friend_Request_Service SHALL return a maximum of 100 Friend_Request records per response

### Requirement 13: List Friends

**User Story:** As a user, I want to view my current friends list, so that I can see who I am connected with.

#### Acceptance Criteria

1. WHEN a user sends GET /friends, THE Friendship_Service SHALL return all active Friendship records for the authenticated user, including the friend's display name and friendship createdAt
2. THE Friendship_Service SHALL only return friendships with status "active"
3. THE Friendship_Service SHALL persist friendship data in DynamoDB so that friends remain visible across user logout, login, page refresh, and different browser sessions
4. IF the user's friend list is empty, THEN THE Friendship_Service SHALL return an empty list with no error

### Requirement 14: Remove Friend

**User Story:** As a user, I want to remove a friend, so that I can manage my connections.

#### Acceptance Criteria

1. WHEN a user sends DELETE /friends/{friendId}, THE Friendship_Service SHALL update the Friendship status to "removed" and set the updatedAt timestamp in ISO 8601 format
2. WHEN a friendship is removed, THE Friendship_Service SHALL remove the friend from both users' active friends lists (GET /friends for either user SHALL no longer include the removed friendship)
3. WHEN a friendship is removed, THE Friendship_Service SHALL cause the GET /friends/{friendId}/relationship endpoint to return relationshipStatus "removed" and isActiveFriend false
4. IF a user attempts to remove a friendship they are not a member of, THEN THE Friendship_Service SHALL reject the action with HTTP 403

### Requirement 15: Relationship Query

**User Story:** As a downstream service (Timetable, AI Planner), I want to check if two users are active friends, so that I can gate feature access on friendship status.

#### Acceptance Criteria

1. WHEN a user sends GET /friends/{friendId}/relationship, THE Friendship_Service SHALL return a FriendshipAccessResult containing friendUserId, isActiveFriend boolean, and relationshipStatus
2. THE Friendship_Service SHALL return relationshipStatus as one of: "none", "pending", "active", "rejected", "removed", or "blocked"
3. WHEN no relationship exists between the two users, THE Friendship_Service SHALL return relationshipStatus "none" and isActiveFriend false
4. WHEN the relationship status is "active", THE Friendship_Service SHALL return isActiveFriend true; for all other statuses THE Friendship_Service SHALL return isActiveFriend false

### Requirement 16: Idempotent Operations

**User Story:** As a developer, I want accept, reject, and cancel operations to be idempotent, so that network retries do not cause errors or inconsistent state.

#### Acceptance Criteria

1. WHEN an already-accepted friend request receives another accept call from the same user, THE Friend_Request_Service SHALL return a success response identical in structure to the original accept response without creating a duplicate Friendship record
2. WHEN an already-rejected friend request receives another reject call from the same user, THE Friend_Request_Service SHALL return a success response identical in structure to the original reject response without modifying any stored data or emitting notifications
3. WHEN an already-cancelled friend request receives another cancel call from the same user, THE Friend_Request_Service SHALL return a success response identical in structure to the original cancel response without modifying any stored data or emitting notifications
4. IF an accept, reject, or cancel operation is called on a friend request whose current state does not match the operation (e.g., accept on a cancelled request, reject on an accepted request), THEN THE Friend_Request_Service SHALL return an error response indicating the request is in an incompatible state and SHALL NOT modify the existing state
5. WHEN two identical accept, reject, or cancel calls for the same friend request arrive concurrently, THE Friend_Request_Service SHALL process exactly one and return success for both without creating duplicate records or inconsistent state

### Requirement 17: Input Validation and Security

**User Story:** As a developer, I want all API inputs validated on the backend, so that the system is secure against malformed or malicious data.

#### Acceptance Criteria

1. THE API_Gateway SHALL validate all request bodies, path parameters, and query parameters against defined schemas before invoking Lambda functions
2. IF a request contains an invalid email format, an empty required field, or a string parameter exceeding 255 characters, THEN THE Friends_Backend SHALL reject the request with HTTP 400 and a response body indicating which parameter failed validation
3. THE Friends_Backend SHALL apply rate limiting of 10 requests per 10-second window per authenticated user on POST /friends/search, POST /friend-requests, GET /friend-requests/invite/{token}, and Email_Service send operations
4. IF a client exceeds the rate limit, THEN THE Friends_Backend SHALL reject the request with HTTP 429 and include a Retry-After header indicating the number of seconds until the next permitted request
5. THE API_Gateway SHALL restrict CORS to the configured frontend origin only
6. THE Friends_Backend SHALL return ISO 8601 timestamps in all API responses
7. THE Friends_Backend SHALL return no Invitation_Token hashes, database primary keys, or internal service identifiers in any API response

### Requirement 18: Frontend Friends Page Update

**User Story:** As a user, I want the Friends page to use the real backend API, so that my data persists and friend requests actually work.

#### Acceptance Criteria

1. THE Friends_Page SHALL make authenticated API calls to the Friends_Backend for all friend operations (list friends, send request, accept request, reject request, cancel request, remove friend) instead of using localStorage
2. WHEN the Friends_Page loads, THE Friends_Page SHALL fetch and display four sections: Current Friends, Incoming Requests, Sent Requests, and Add Friend form, showing a loading indicator in each section until the API response is received
3. WHEN the Add Friend form is submitted with a display name between 1 and 100 characters and a valid email address, THE Friends_Page SHALL show a loading indicator on the submit button during the API call and display a success toast notification when the request is sent
4. IF the Add Friend form is submitted with an empty display name, a display name exceeding 100 characters, or an invalid email format, THEN THE Friends_Page SHALL display inline validation errors below the respective fields without making an API call
5. THE Friends_Page SHALL display each current friend with display name, online status indicator, and a remove button that presents a confirmation dialog before executing the removal
6. THE Friends_Page SHALL display each incoming request with sender display name, request date in relative format (e.g., "2 days ago"), and accept/reject action buttons
7. THE Friends_Page SHALL display each sent request with recipient email, a status badge indicating request state (pending, accepted, rejected), and a cancel button visible only for pending requests
8. IF a section (Current Friends, Incoming Requests, or Sent Requests) contains no items, THEN THE Friends_Page SHALL display a descriptive empty state message specific to that section (e.g., "No friends yet", "No incoming requests", "No sent requests")
9. IF a Friends_Backend API call fails, THEN THE Friends_Page SHALL display an error toast notification describing the failed action (e.g., "Could not send friend request") without exposing technical error details, and SHALL preserve the current page state without data loss

### Requirement 19: Frontend Invitation Page

**User Story:** As an invited user, I want a dedicated page to respond to a friend invitation, so that I can accept or reject after authenticating.

#### Acceptance Criteria

1. THE Invitation_Page SHALL be accessible at the route /invite/{token}
2. IF an unauthenticated user visits the Invitation_Page, THEN THE Frontend SHALL redirect to the Auth page while preserving the invitation token, and redirect the user back to the Invitation_Page with the same token after successful authentication
3. WHEN an authenticated user visits the Invitation_Page with a valid token, THE Invitation_Page SHALL display the sender's display name and both an accept button and a reject button
4. IF the invitation token is expired, already used, or malformed, THEN THE Invitation_Page SHALL display an error message indicating the specific reason the invitation cannot be acted upon (expired, already used, or invalid)
5. WHEN the user clicks the accept or reject button, THE Invitation_Page SHALL call the corresponding API endpoint and redirect to the Friends_Page upon a successful response
6. IF the accept or reject API call fails, THEN THE Invitation_Page SHALL display an error message indicating the action could not be completed and SHALL keep the accept and reject buttons enabled so the user can retry

### Requirement 20: Shared Types Package

**User Story:** As a teammate working on Timetable or AI Planner features, I want shared TypeScript types and API contracts for the friends feature, so that I can integrate without reading implementation code.

#### Acceptance Criteria

1. THE Friends_Backend SHALL export reusable TypeScript interfaces (FriendshipAccessResult, FriendRequest, Friendship, UserProfile) from the shared package at packages/shared/
2. THE shared package SHALL include documented API endpoint paths, expected request/response shapes, authentication header format (Authorization: Bearer {token}), status enums, and error code definitions with JSDoc comments on every exported interface and field
3. THE shared package SHALL include code examples as exported documentation comments showing how to check friendship status and get a user's active friends list

### Requirement 21: Migration from localStorage

**User Story:** As a developer, I want a clean migration from localStorage to the backend, so that the app does not silently fall back to mock data.

#### Acceptance Criteria

1. WHEN the frontend is deployed with the backend API base URL configured, THE Friends_Page SHALL use only authenticated backend API calls as the source of truth for all friend-related operations (listing friends, sending requests, accepting requests, rejecting requests, cancelling requests, removing friends, and searching users)
2. THE Friends_Page SHALL NOT read from or write to localStorage or in-memory mock data for any friend-related operation
3. IF a backend API call for a friend-related operation fails or the backend is unreachable, THEN THE Friends_Page SHALL display an error message indicating the failure and SHALL NOT fall back to localStorage or mock data
4. THE Friends_Backend SHALL start, respond to API requests, and pass health checks without requiring any pre-populated seed data or mock user records in its data stores
5. THE Friends_Backend SHALL provide test fixtures that write to a separate data namespace or table prefix from the deployed application data, such that creating or deleting test data does not modify records accessible to production API endpoints

### Requirement 22: Scope Boundaries

**User Story:** As a developer, I want clear scope boundaries, so that the friends feature does not expand into unrelated domains.

#### Acceptance Criteria

1. THE Friends_Backend SHALL implement only friend search, friend request lifecycle, friendship management, email invitation, and relationship query features
2. THE Friends_Backend SHALL expose stable friendship query APIs (GET /friends, GET /friends/{friendId}/relationship) for downstream Timetable and AI Planner teams to consume
3. THE Friends_Backend SHALL NOT implement timetable comparison, timetable sharing, common free time calculation, AI Planner group planning, AI calendar events, or meeting invitation features
4. IF a feature request involves computing, displaying, or acting on schedule data, AI planning data, or calendar event data, THEN THE Friends_Backend SHALL reject the request as out of scope and delegate it to the appropriate downstream service
