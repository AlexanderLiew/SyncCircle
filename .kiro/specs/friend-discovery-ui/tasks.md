# Implementation Plan: Friend Discovery UI

## Overview

This plan implements the Instagram-style friend discovery popup, a new backend `GET /users` endpoint, and removes the Group Chat navigation item. Tasks are organized to build the backend first, then shared types, then the frontend hook and components, and finally wire everything together.

## Tasks

- [x] 1. Add shared types and API path for Users endpoint
  - [x] 1.1 Add `USERS` path and `UsersListResponse` type to shared API types
    - Add `USERS: '/users'` to the `API_PATHS` constant in `packages/shared/src/types/api.ts`
    - Add `UsersListResponse` interface with `users: Array<{ userId: string; displayName: string; email: string }>`
    - _Requirements: 5.4_

- [x] 2. Implement backend GET /users Lambda handler
  - [x] 2.1 Create the `get-users` Lambda handler
    - Create `apps/backend/src/handlers/users/get-users.ts`
    - Scan UserProfiles table with `ProjectionExpression` for `userId, displayName, email`
    - Extract caller's `userId` from Cognito authorizer context and exclude from results via FilterExpression
    - Support optional `?name=` query parameter with case-insensitive filtering (lowercase comparison in Lambda logic)
    - Return 200 with `{ users: [...] }` response
    - Return 500 with `INTERNAL_ERROR` code on DynamoDB failures
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 2.2 Write property test for backend user listing correctness
    - **Property 4: Backend user listing correctness**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [x] 3. Wire GET /users endpoint into CDK infrastructure
  - [x] 3.1 Add `getUsersHandler` Lambda to `LambdaConstruct`
    - Add a new `NodejsFunction` in `apps/backend/cdk/lib/lambda-construct.ts` pointing to `src/handlers/users/get-users.ts`
    - Grant `dynamodb:Scan` permission on `userProfilesTable`
    - Expose the handler as a public readonly property
    - _Requirements: 5.1, 5.2_

  - [x] 3.2 Add GET /users route to `ApiConstruct`
    - Add `getUsersHandler` to `ApiConstructProps` interface in `apps/backend/cdk/lib/api-construct.ts`
    - Create `/users` resource on the API root and add `GET` method with Cognito authorizer
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 3.3 Pass `getUsersHandler` from `FriendsStack` to `ApiConstruct`
    - Update `apps/backend/cdk/lib/friends-stack.ts` to wire the new Lambda reference into the ApiConstruct props
    - _Requirements: 5.1_

- [x] 4. Checkpoint - Ensure backend compiles and CDK synth succeeds
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement frontend `useUsersDiscovery` hook
  - [x] 5.1 Create the `useUsersDiscovery` hook
    - Create `apps/frontend/src/app/hooks/useUsersDiscovery.ts`
    - Use `apiClient.get<UsersListResponse>(API_PATHS.USERS)` to fetch all users
    - Expose `users`, `isLoading`, `error`, and `refresh` from the hook
    - Handle `UnauthorizedError` by triggering logout (existing pattern)
    - _Requirements: 1.4, 5.1_

- [x] 6. Implement DiscoveryPopup component
  - [x] 6.1 Create the `DiscoveryPopup` component with search and user list
    - Create `apps/frontend/src/app/components/DiscoveryPopup.tsx`
    - Implement modal overlay with `AnimatePresence` + `motion.div` for fade/scale animations
    - Include X close button in top-right corner
    - Include Search_Bar with auto-focus on open
    - Render scrollable list of `UserCard` items
    - Filter out current user from the displayed list (using `useAuth` hook for current user ID)
    - Implement client-side case-insensitive search filtering on `displayName`
    - Show empty state message when no users match search
    - Close on X button click, backdrop click, or Escape key
    - Accept props: `isOpen`, `onClose`, `friendIds`, `pendingRequestUserIds`, `onSendRequest`
    - Derive button state per card: "Friends" indicator, grey "Request Sent", or active "Add Friend"
    - Show loading spinner on button while request is in flight
    - On successful send, immediately update button to "Request Sent" state
    - On failure, show error toast via `sonner`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 6.2 Write property test for current user exclusion
    - **Property 1: Current user exclusion (frontend)**
    - **Validates: Requirements 1.7**

  - [ ]* 6.3 Write property test for user card button state derivation
    - **Property 2: User card button state derivation**
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 6.4 Write property test for client-side search filter correctness
    - **Property 3: Client-side search filter correctness**
    - **Validates: Requirements 4.1, 4.2**

- [x] 7. Integrate DiscoveryPopup into Friends page
  - [x] 7.1 Replace the Add Friend form with DiscoveryPopup in Friends.tsx
    - Update `apps/frontend/src/app/pages/Friends.tsx`
    - Remove the inline Add Friend form (name + email inputs)
    - Keep the "Add Friend" button but change its `onClick` to open the DiscoveryPopup
    - Import and render `DiscoveryPopup` with `isOpen` state
    - Build `friendIds` Set from `useFriends()` data
    - Build `pendingRequestUserIds` Set by matching outgoing request `recipientEmail` against user emails
    - Wire `onSendRequest` to call existing `sendRequest` from `useFriendRequests()`
    - _Requirements: 1.1, 3.1, 3.2_

- [x] 8. Remove Group Chat from navigation and routes
  - [x] 8.1 Remove Group Chat nav item and route
    - Remove `{ path: "/group-chat", label: "Group Chat", icon: MessageSquare }` from `navItems` in `apps/frontend/src/app/components/Layout.tsx`
    - Remove `{ path: "group-chat", Component: GroupChat }` from routes in `apps/frontend/src/app/routes.tsx`
    - Remove the `GroupChat` import from routes.tsx
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Checkpoint - Ensure all tests pass and frontend builds successfully
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Write unit tests for DiscoveryPopup and navigation changes
  - [ ]* 10.1 Write unit tests for DiscoveryPopup component
    - Test popup opens on trigger
    - Test close via X button, backdrop click, Escape key
    - Test search bar receives auto-focus
    - Test empty search results message
    - Test loading spinner on button during request
    - Test button state transitions (Add Friend → Request Sent)
    - Test error toast on failed request
    - _Requirements: 1.1, 1.5, 1.6, 3.2, 3.3, 3.4, 4.4, 7.3, 7.4_

  - [ ]* 10.2 Write unit tests for navigation sidebar changes
    - Test that navItems includes Dashboard, Timetable, Notes, AI Planner, Friends, Profile, Settings
    - Test that navItems does NOT include Group Chat
    - Test that no /group-chat route is registered
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend `GET /users` handler is built first so the frontend can consume it
- Client-side filtering is used for instant search responsiveness (bounded user count)
- Existing `useFriends` and `useFriendRequests` hooks are reused — no new mutation endpoints needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.4", "7.1"] },
    { "id": 7, "tasks": ["10.1", "10.2"] }
  ]
}
```
