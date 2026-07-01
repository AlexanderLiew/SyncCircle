/**
 * Canonical pair utility for consistent friendship record storage.
 *
 * Given two user IDs, returns them in lexicographic order so that
 * any pair (A, B) always maps to the same record regardless of which
 * user initiated the action.
 */

export interface CanonicalPair {
  userIdLow: string;
  userIdHigh: string;
}

/**
 * Returns the two user IDs in lexicographic order.
 * Ensures `canonicalPair(A, B)` always equals `canonicalPair(B, A)`.
 */
export function canonicalPair(userA: string, userB: string): CanonicalPair {
  return userA < userB
    ? { userIdLow: userA, userIdHigh: userB }
    : { userIdLow: userB, userIdHigh: userA };
}
