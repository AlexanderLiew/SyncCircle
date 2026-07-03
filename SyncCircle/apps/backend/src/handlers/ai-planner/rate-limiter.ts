/**
 * Simple in-memory rate limiter for AI planning endpoints.
 *
 * Enforces a maximum of 5 requests per user per minute using a
 * sliding window approach with automatic cleanup of expired entries.
 *
 * Note: In-memory rate limiting works per Lambda instance. For
 * production multi-instance deployments, this should be replaced
 * with a DynamoDB-based counter or API Gateway throttling.
 */

const MAX_REQUESTS_PER_MINUTE = 5;
const WINDOW_MS = 60_000; // 1 minute in milliseconds

/**
 * Stores timestamps of recent requests per user.
 * Key: userId, Value: array of request timestamps (epoch ms)
 */
const requestLog = new Map<string, number[]>();

/**
 * Checks whether the given user is within the rate limit.
 *
 * Returns true if the request is allowed, false if rate limited.
 * Automatically records the request timestamp when allowed.
 */
export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get or initialize the user's request timestamps
  let timestamps = requestLog.get(userId);

  if (!timestamps) {
    timestamps = [];
    requestLog.set(userId, timestamps);
  }

  // Remove timestamps outside the current window
  const validTimestamps = timestamps.filter((ts) => ts > windowStart);

  // Check if limit exceeded
  if (validTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    // Update stored timestamps (still remove expired ones)
    requestLog.set(userId, validTimestamps);
    return false;
  }

  // Record this request and allow it
  validTimestamps.push(now);
  requestLog.set(userId, validTimestamps);

  return true;
}

/**
 * Resets the rate limiter state. Useful for testing.
 */
export function resetRateLimiter(): void {
  requestLog.clear();
}
