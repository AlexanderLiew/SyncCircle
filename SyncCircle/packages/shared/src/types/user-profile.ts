/**
 * Represents a user profile stored in the UserProfiles DynamoDB table.
 *
 * @example
 * ```typescript
 * const profile: UserProfile = {
 *   userId: '550e8400-e29b-41d4-a716-446655440000',
 *   email: 'Alice@Example.com',
 *   normalizedEmail: 'alice@example.com',
 *   displayName: 'Alice',
 *   course: 'Computer Science',
 *   createdAt: '2024-01-15T10:30:00.000Z',
 *   updatedAt: '2024-01-15T10:30:00.000Z',
 * };
 * ```
 */
export interface UserProfile {
  /** Cognito sub (UUID) — partition key */
  userId: string;

  /** Original email as provided during registration */
  email: string;

  /** Lowercase-trimmed email for case-insensitive lookups (GSI key) */
  normalizedEmail: string;

  /** Display name, 1–50 characters */
  displayName: string;

  /** Optional course name, max 100 characters */
  course?: string;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last-update timestamp */
  updatedAt?: string;
}
