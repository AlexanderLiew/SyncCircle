/**
 * @synccircle/shared — Shared type definitions and constants for the SyncCircle Friends Backend.
 *
 * This package provides TypeScript interfaces, enums, API path constants, error codes,
 * and request/response shapes used by both the backend (Lambda handlers) and the frontend
 * (API client hooks).
 *
 * @example Importing types in a Lambda handler:
 * ```typescript
 * import {
 *   type FriendRequest,
 *   FRIEND_REQUEST_STATUS,
 *   ERROR_CODES,
 *   type ErrorResponse,
 * } from '@synccircle/shared';
 *
 * if (request.status === FRIEND_REQUEST_STATUS.PENDING) {
 *   // process pending request
 * }
 * ```
 *
 * @example Importing types in the frontend API client:
 * ```typescript
 * import {
 *   API_PATHS,
 *   AUTH_HEADER,
 *   AUTH_SCHEME,
 *   type FriendsListResponse,
 * } from '@synccircle/shared';
 *
 * const response = await fetch(`${baseUrl}${API_PATHS.FRIENDS}`, {
 *   headers: { [AUTH_HEADER]: `${AUTH_SCHEME} ${token}` },
 * });
 * const data: FriendsListResponse = await response.json();
 * ```
 *
 * @example Using relationship query types in downstream services:
 * ```typescript
 * import { type FriendshipAccessResult } from '@synccircle/shared';
 *
 * function canAccessSharedTimetable(result: FriendshipAccessResult): boolean {
 *   return result.isActiveFriend;
 * }
 * ```
 *
 * @packageDocumentation
 */

// ─── User Profile ────────────────────────────────────────────────────────────
export type { UserProfile } from './types/user-profile.js';

// ─── Friend Request ──────────────────────────────────────────────────────────
export type { FriendRequest, FriendRequestStatus } from './types/friend-request.js';
export { FRIEND_REQUEST_STATUS } from './types/friend-request.js';

// ─── Friendship ──────────────────────────────────────────────────────────────
export type {
  Friendship,
  FriendshipStatus,
  FriendshipAccessResult,
  RelationshipStatus,
} from './types/friendship.js';
export { FRIENDSHIP_STATUS } from './types/friendship.js';

// ─── API Contracts ───────────────────────────────────────────────────────────
export {
  API_PATHS,
  AUTH_HEADER,
  AUTH_SCHEME,
  ERROR_CODES,
} from './types/api.js';

export type {
  ErrorCode,
  SearchRequest,
  CreateFriendRequestRequest,
  SearchStatus,
  SearchResponse,
  CreateFriendRequestResponse,
  IncomingRequestsResponse,
  OutgoingRequestsResponse,
  AcceptRejectCancelResponse,
  TokenValidationResponse,
  FriendsListResponse,
  ErrorResponse,
} from './types/api.js';
