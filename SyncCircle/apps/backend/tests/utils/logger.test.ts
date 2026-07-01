import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../src/utils/logger.js';

describe('logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('outputs structured JSON with level, message, and timestamp', () => {
    logger.info('test message');
    expect(consoleSpy).toHaveBeenCalledOnce();

    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.level).toBe('info');
    expect(output.message).toBe('test message');
    expect(output.timestamp).toBeDefined();
    // Verify timestamp is valid ISO 8601
    expect(new Date(output.timestamp).toISOString()).toBe(output.timestamp);
  });

  it('includes additional data fields', () => {
    logger.info('user action', { userId: 'abc', action: 'login' });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.userId).toBe('abc');
    expect(output.action).toBe('login');
  });

  it('redacts email fields', () => {
    logger.info('user found', { email: 'user@example.com', userId: '123' });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.email).toBe('[REDACTED]');
    expect(output.userId).toBe('123');
  });

  it('redacts token fields', () => {
    logger.info('token validated', { token: 'secret-token-value' });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.token).toBe('[REDACTED]');
  });

  it('redacts password fields', () => {
    logger.warn('auth attempt', { password: 'hunter2', username: 'user1' });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.password).toBe('[REDACTED]');
    expect(output.username).toBe('user1');
  });

  it('redacts nested PII fields', () => {
    logger.info('request', { user: { email: 'nested@test.com', id: '1' } });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.user.email).toBe('[REDACTED]');
    expect(output.user.id).toBe('1');
  });

  it('redacts PII in arrays', () => {
    logger.info('batch', { items: [{ email: 'a@b.com' }, { email: 'c@d.com' }] });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.items[0].email).toBe('[REDACTED]');
    expect(output.items[1].email).toBe('[REDACTED]');
  });

  it('redacts case-insensitively (e.g., tokenHash, Authorization)', () => {
    logger.info('headers', { tokenHash: 'abc123', Authorization: 'Bearer xyz' });
    const output = JSON.parse(consoleSpy.mock.calls[0]![0] as string);
    expect(output.tokenHash).toBe('[REDACTED]');
    expect(output.Authorization).toBe('[REDACTED]');
  });

  it('supports all log levels', () => {
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');
    expect(consoleSpy).toHaveBeenCalledTimes(4);

    const levels = consoleSpy.mock.calls.map(
      (call) => JSON.parse(call[0] as string).level,
    );
    expect(levels).toEqual(['debug', 'info', 'warn', 'error']);
  });
});
