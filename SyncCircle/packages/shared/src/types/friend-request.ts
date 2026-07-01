/**
 * Possible statuses for a friend request throughout its lifecycle.
 */
export type FriendRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

/**
 * Status values as a const object for runtime checks.
 *
 * @example
 * ```typescript
 * if (request.status === FRIEND_REQUEST_STATUS.PENDING) {
 *   // handle pending request
 * }
 * ```
 */
export const FRIEND_REQUEST_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, FriendRequestStatus>;

/**
 * Represents a friend request stored in the FriendRequests DynamoDB table.
 *
 * @example
 * ```typescript
 * const request: FriendRequest = {
 *   requestId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
 *   senderUserId: '550e8400-e29b-41d4-a716-446655440000',
 *   receiverUserId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
 *   receiverEmail: 'Bob@Example.com',
 *   normalizedReceiverEmail: 'bob@example.com',
 *   senderDisplayName: 'Alice',
 *   status: 'pending',
 *   tokenHash: 'a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
 *   tokenExpiresAt: '2024-01-22T10:30:00.000Z',
 *   createdAt: '2024-01-15T10:30:00.000Z',
 * };
 * ```
 */
export interface FriendRequest {
  /** UUID v4 — partition key */
  requestId: string;

  /** Sender's Cognito sub */
  senderUserId: string;

  /** Receiver's Cognito sub (empty string if unregistered) */
  receiverUserId: string;

  /** Recipient email address as provided */
  receiverEmail: string;

  /** Lowercase-trimmed recipient email for matching (GSI key) */
  normalizedReceiverEmail: string;

  /** Cached sender display name at time of request */
  senderDisplayName: string;

  /** Current lifecycle status */
  status: FriendRequestStatus;

  /** SHA-256 hash of the invitation token */
  tokenHash: string;

  /** ISO 8601 token expiry (7 days from creation) */
  tokenExpiresAt: string;

  /** ISO 8601 creation timestamp (GSI sort key) */
  createdAt: string;

  /** ISO 8601 timestamp when responded to (accept/reject/cancel) */
  respondedAt?: string;
}
