// ─── API Endpoint Paths ──────────────────────────────────────────────────────

/**
 * All API endpoint path constants for the Friends Backend.
 * Use these to avoid hardcoding paths in frontend and backend code.
 *
 * @example
 * ```typescript
 * const url = `${BASE_URL}${API_PATHS.FRIEND_REQUESTS}`;
 * ```
 */
export const API_PATHS = {
  /** POST — Search for a user by email + displayName */
  SEARCH: '/friends/search',

  /** POST — Create a friend request */
  FRIEND_REQUESTS: '/friend-requests',

  /** GET — List incoming pending friend requests */
  FRIEND_REQUESTS_INCOMING: '/friend-requests/incoming',

  /** GET — List outgoing friend requests */
  FRIEND_REQUESTS_OUTGOING: '/friend-requests/outgoing',

  /** POST — Accept a friend request (append /{requestId}/accept) */
  FRIEND_REQUESTS_ACCEPT: '/friend-requests/:requestId/accept',

  /** POST — Reject a friend request (append /{requestId}/reject) */
  FRIEND_REQUESTS_REJECT: '/friend-requests/:requestId/reject',

  /** POST — Cancel a friend request (append /{requestId}/cancel) */
  FRIEND_REQUESTS_CANCEL: '/friend-requests/:requestId/cancel',

  /** GET — Validate an invitation token (append /invite/{token}) */
  FRIEND_REQUESTS_VALIDATE_TOKEN: '/friend-requests/invite/:token',

  /** GET — List active friends */
  FRIENDS: '/friends',

  /** DELETE — Remove a friendship (append /{friendId}) */
  FRIENDS_REMOVE: '/friends/:friendId',

  /** GET — Query relationship status (append /{friendId}/relationship) */
  FRIENDS_RELATIONSHIP: '/friends/:friendId/relationship',

  /** PUT — Save user's timetable classes */
  TIMETABLE: '/timetable',

  /** GET — Fetch a friend's timetable (append /{friendId}/timetable) */
  FRIENDS_TIMETABLE: '/friends/:friendId/timetable',

  /** GET — List all registered users for friend discovery */
  USERS: '/users',

  /** POST — Send a task reminder email notification */
  TASKS_NOTIFY: '/tasks/notify',
} as const;

// ─── Auth Header Format ──────────────────────────────────────────────────────

/**
 * The authorization header name and format used for all protected endpoints.
 *
 * @example
 * ```typescript
 * const headers = {
 *   [AUTH_HEADER]: `${AUTH_SCHEME} ${jwtToken}`,
 * };
 * ```
 */
export const AUTH_HEADER = 'Authorization' as const;
export const AUTH_SCHEME = 'Bearer' as const;

// ─── Error Codes ─────────────────────────────────────────────────────────────

/**
 * Machine-readable error codes returned by the API.
 *
 * @example
 * ```typescript
 * if (response.code === ERROR_CODES.VALIDATION_ERROR) {
 *   // show field-level error
 * }
 * ```
 */
export const ERROR_CODES = {
  /** Input validation failure (HTTP 400) */
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  /** Missing or invalid JWT (HTTP 401) */
  UNAUTHORIZED: 'UNAUTHORIZED',

  /** Authenticated but not authorized for this action (HTTP 403) */
  FORBIDDEN: 'FORBIDDEN',

  /** Resource does not exist (HTTP 404) */
  NOT_FOUND: 'NOT_FOUND',

  /** Operation conflicts with current state (HTTP 409) */
  CONFLICT: 'CONFLICT',

  /** Too many requests (HTTP 429) */
  RATE_LIMITED: 'RATE_LIMITED',

  /** Cannot perform action on yourself (HTTP 400) */
  SELF_REQUEST: 'SELF_REQUEST',

  /** Users are already friends (HTTP 409) */
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',

  /** Pending request already exists (HTTP 409) */
  PENDING_EXISTS: 'PENDING_EXISTS',

  /** Invitation token has expired (HTTP 410) */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  /** Invitation token has already been used (HTTP 410) */
  TOKEN_USED: 'TOKEN_USED',

  /** Invitation token is invalid/malformed (HTTP 400) */
  TOKEN_INVALID: 'TOKEN_INVALID',

  /** Token recipient does not match authenticated user (HTTP 403) */
  WRONG_RECIPIENT: 'WRONG_RECIPIENT',

  /** Internal server error (HTTP 500) */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── Request Shapes ──────────────────────────────────────────────────────────

/** POST /friends/search — request body */
export interface SearchRequest {
  /** Valid email format, max 254 characters */
  email: string;
  /** 1–100 characters */
  displayName: string;
}

/** POST /friend-requests — request body */
export interface CreateFriendRequestRequest {
  /** Valid email format, max 254 characters */
  recipientEmail: string;
  /** 1–100 characters */
  recipientDisplayName: string;
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

/** Search result status values */
export type SearchStatus =
  | 'found'
  | 'name_mismatch'
  | 'not_registered'
  | 'already_friends'
  | 'pending_request'
  | 'self_search';

/** POST /friends/search — response body */
export interface SearchResponse {
  status: SearchStatus;
  message: string;
}

/** POST /friend-requests — response body (201 Created) */
export interface CreateFriendRequestResponse {
  requestId: string;
  status: 'pending';
  recipientEmail: string;
  createdAt: string;
  emailSent: boolean;
}

/** GET /friend-requests/incoming — response body */
export interface IncomingRequestsResponse {
  requests: Array<{
    requestId: string;
    senderDisplayName: string;
    createdAt: string;
  }>;
}

/** GET /friend-requests/outgoing — response body */
export interface OutgoingRequestsResponse {
  requests: Array<{
    requestId: string;
    recipientEmail: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
    createdAt: string;
  }>;
}

/** POST /friend-requests/{id}/accept|reject|cancel — response body */
export interface AcceptRejectCancelResponse {
  requestId: string;
  status: 'accepted' | 'rejected' | 'cancelled';
  respondedAt: string;
}

/** GET /friend-requests/invite/{token} — response body */
export interface TokenValidationResponse {
  requestId: string;
  senderDisplayName: string;
  createdAt: string;
}

/** GET /friends — response body */
export interface FriendsListResponse {
  friends: Array<{
    friendId: string;
    displayName: string;
    createdAt: string;
  }>;
}

/** GET /users — response body */
export interface UsersListResponse {
  users: Array<{
    userId: string;
    displayName: string;
    email: string;
  }>;
}

// ─── Task Notification ────────────────────────────────────────────────────────

/** POST /tasks/notify — request body */
export interface NotifyTaskRequest {
  /** The title of the task due tomorrow */
  taskTitle: string;
  /** ISO 8601 date format: YYYY-MM-DD */
  dueDate: string;
}

/** POST /tasks/notify — response body */
export interface NotifyTaskResponse {
  /** Confirmation message */
  message: string;
}

// ─── Error Response ──────────────────────────────────────────────────────────

/** Standard error response shape (all endpoints) */
export interface ErrorResponse {
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code */
  code: ErrorCode;
  /** Which field failed validation (if applicable) */
  field?: string;
}
