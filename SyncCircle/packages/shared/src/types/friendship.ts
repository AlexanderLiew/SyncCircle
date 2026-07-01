/**
 * Possible statuses for a friendship record.
 */
export type FriendshipStatus = 'active' | 'removed' | 'blocked';

/**
 * Status values as a const object for runtime checks.
 *
 * @example
 * ```typescript
 * if (friendship.status === FRIENDSHIP_STATUS.ACTIVE) {
 *   // user pair are active friends
 * }
 * ```
 */
export const FRIENDSHIP_STATUS = {
  ACTIVE: 'active',
  REMOVED: 'removed',
  BLOCKED: 'blocked',
} as const satisfies Record<string, FriendshipStatus>;

/**
 * Possible relationship statuses returned by the relationship query endpoint.
 */
export type RelationshipStatus =
  | 'none'
  | 'pending'
  | 'active'
  | 'rejected'
  | 'removed'
  | 'blocked';

/**
 * Represents a friendship record stored in the Friendships DynamoDB table.
 * Uses canonical pair ordering (lower user ID first) to prevent duplicates.
 *
 * @example
 * ```typescript
 * const friendship: Friendship = {
 *   friendshipId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
 *   userIdLow: '550e8400-e29b-41d4-a716-446655440000',
 *   userIdHigh: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
 *   status: 'active',
 *   createdAt: '2024-01-15T10:30:00.000Z',
 * };
 * ```
 */
export interface Friendship {
  /** UUID v4 — partition key */
  friendshipId: string;

  /** Lexicographically lower user ID (canonical pair) */
  userIdLow: string;

  /** Lexicographically higher user ID (canonical pair) */
  userIdHigh: string;

  /** Current friendship status */
  status: FriendshipStatus;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last-update timestamp */
  updatedAt?: string;
}

/**
 * Result returned by the relationship query endpoint.
 * Used by downstream services (Timetable, AI Planner) to gate features
 * on friendship status.
 *
 * @example
 * ```typescript
 * const result: FriendshipAccessResult = {
 *   friendUserId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
 *   isActiveFriend: true,
 *   relationshipStatus: 'active',
 * };
 * ```
 */
export interface FriendshipAccessResult {
  /** The other user's ID in the relationship query */
  friendUserId: string;

  /** true only when relationshipStatus is "active" */
  isActiveFriend: boolean;

  /** The current relationship status between the two users */
  relationshipStatus: RelationshipStatus;
}
