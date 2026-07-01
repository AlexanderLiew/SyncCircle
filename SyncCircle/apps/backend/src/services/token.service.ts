/**
 * Token service for invitation link security.
 *
 * Generates cryptographically secure tokens, hashes them with SHA-256,
 * calculates expiry timestamps, and provides validation helpers.
 * Plaintext tokens are only ever sent in emails — only the hash is stored.
 */

import { randomBytes, createHash } from 'crypto';

/** Number of random bytes in a generated token (32 bytes = 64 hex chars). */
const TOKEN_BYTES = 32;

/** Token validity duration in milliseconds (7 days). */
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface GeneratedToken {
  /** Hex-encoded plaintext token (64 characters). */
  token: string;
  /** SHA-256 hex digest of the token (stored in DB). */
  tokenHash: string;
  /** ISO 8601 expiry timestamp (7 days from creation). */
  expiresAt: string;
}

export interface TokenValidationResult {
  valid: boolean;
  reason?: 'expired' | 'invalid_hash';
}

/**
 * Generates a cryptographically secure invitation token.
 *
 * Returns the plaintext token (for the email link), its SHA-256 hash
 * (for storage), and the expiry timestamp (7 days from now, ISO 8601).
 */
export function generateToken(): GeneratedToken {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  return { token, tokenHash, expiresAt };
}

/**
 * Computes the SHA-256 hex digest of a plaintext token.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Returns true if the given ISO 8601 expiry timestamp is in the past.
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Validates a plaintext token against a stored hash and expiry.
 *
 * Checks expiry first (fail-fast), then compares the hash.
 */
export function validateToken(
  token: string,
  storedHash: string,
  expiresAt: string,
): TokenValidationResult {
  if (isTokenExpired(expiresAt)) {
    return { valid: false, reason: 'expired' };
  }

  const computedHash = hashToken(token);
  if (computedHash !== storedHash) {
    return { valid: false, reason: 'invalid_hash' };
  }

  return { valid: true };
}
