import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, resetRateLimiter } from '../../../src/handlers/ai-planner/rate-limiter.js';

describe('rate-limiter', () => {
  beforeEach(() => {
    resetRateLimiter();
    vi.restoreAllMocks();
  });

  it('allows up to 5 requests per user within a minute', () => {
    const userId = 'user-1';

    expect(checkRateLimit(userId)).toBe(true);
    expect(checkRateLimit(userId)).toBe(true);
    expect(checkRateLimit(userId)).toBe(true);
    expect(checkRateLimit(userId)).toBe(true);
    expect(checkRateLimit(userId)).toBe(true);
  });

  it('blocks the 6th request within a minute', () => {
    const userId = 'user-2';

    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(userId)).toBe(true);
    }

    // 6th request should be blocked
    expect(checkRateLimit(userId)).toBe(false);
  });

  it('tracks rate limits independently per user', () => {
    const userA = 'user-a';
    const userB = 'user-b';

    // Exhaust user A's limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(userA);
    }

    // User B should still be allowed
    expect(checkRateLimit(userB)).toBe(true);
  });

  it('allows requests again after the window expires', () => {
    const userId = 'user-3';
    const realDateNow = Date.now;

    let mockNow = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => mockNow);

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(userId)).toBe(true);
    }
    expect(checkRateLimit(userId)).toBe(false);

    // Advance time by 61 seconds (past the 1 minute window)
    mockNow += 61_000;

    // Should be allowed again
    expect(checkRateLimit(userId)).toBe(true);

    Date.now = realDateNow;
  });
});
