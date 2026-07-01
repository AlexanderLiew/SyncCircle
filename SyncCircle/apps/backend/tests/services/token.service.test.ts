import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateToken,
  hashToken,
  isTokenExpired,
  validateToken,
} from '../../src/services/token.service.js';

describe('token.service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateToken', () => {
    it('returns a 64-character hex token (32 bytes)', () => {
      const { token } = generateToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a valid SHA-256 hex digest as tokenHash', () => {
      const { tokenHash } = generateToken();
      expect(tokenHash).toHaveLength(64);
      expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('tokenHash is the SHA-256 of the plaintext token', () => {
      const { token, tokenHash } = generateToken();
      expect(hashToken(token)).toBe(tokenHash);
    });

    it('tokenHash is not equal to the plaintext token', () => {
      const { token, tokenHash } = generateToken();
      expect(tokenHash).not.toBe(token);
    });

    it('returns an ISO 8601 expiresAt timestamp', () => {
      const { expiresAt } = generateToken();
      const parsed = new Date(expiresAt);
      expect(parsed.toISOString()).toBe(expiresAt);
    });

    it('expiresAt is approximately 7 days in the future', () => {
      const before = Date.now();
      const { expiresAt } = generateToken();
      const after = Date.now();

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expiryTime = new Date(expiresAt).getTime();

      expect(expiryTime).toBeGreaterThanOrEqual(before + sevenDaysMs);
      expect(expiryTime).toBeLessThanOrEqual(after + sevenDaysMs);
    });

    it('generates unique tokens on successive calls', () => {
      const tokens = new Set(Array.from({ length: 10 }, () => generateToken().token));
      expect(tokens.size).toBe(10);
    });
  });

  describe('hashToken', () => {
    it('produces a consistent hash for the same input', () => {
      const input = 'test-token-value';
      expect(hashToken(input)).toBe(hashToken(input));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashToken('aaa')).not.toBe(hashToken('bbb'));
    });

    it('returns a 64-character hex string', () => {
      const result = hashToken('anything');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('isTokenExpired', () => {
    it('returns true for a timestamp in the past', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      expect(isTokenExpired(past)).toBe(true);
    });

    it('returns false for a timestamp in the future', () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      expect(isTokenExpired(future)).toBe(false);
    });

    it('returns true when expiresAt equals current time', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
      expect(isTokenExpired('2024-06-01T12:00:00.000Z')).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('validateToken', () => {
    it('returns valid: true for correct token and non-expired time', () => {
      const { token, tokenHash, expiresAt } = generateToken();
      const result = validateToken(token, tokenHash, expiresAt);
      expect(result).toEqual({ valid: true });
    });

    it('returns invalid_hash when token does not match stored hash', () => {
      const { expiresAt } = generateToken();
      const wrongToken = 'a'.repeat(64);
      const storedHash = hashToken('correct-token');

      const result = validateToken(wrongToken, storedHash, expiresAt);
      expect(result).toEqual({ valid: false, reason: 'invalid_hash' });
    });

    it('returns expired when expiresAt is in the past', () => {
      const { token, tokenHash } = generateToken();
      const expiredAt = new Date(Date.now() - 1000).toISOString();

      const result = validateToken(token, tokenHash, expiredAt);
      expect(result).toEqual({ valid: false, reason: 'expired' });
    });

    it('checks expiry before hash (fail-fast on expired)', () => {
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const result = validateToken('wrong-token', 'wrong-hash', expiredAt);
      expect(result.reason).toBe('expired');
    });
  });
});
