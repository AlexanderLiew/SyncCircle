import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateDisplayName,
  validateCourse,
  normalizeEmail,
  compareDisplayNames,
  isSelfAction,
} from '../../src/services/validation.service.js';

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty string', () => {
    const result = validateEmail('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.field).toBe('email');
  });

  it('rejects whitespace-only input', () => {
    const result = validateEmail('   ');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.field).toBe('email');
  });

  it('rejects undefined', () => {
    const result = validateEmail(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects email exceeding 254 characters', () => {
    const longEmail = 'a'.repeat(246) + '@test.com'; // 255 chars total
    const result = validateEmail(longEmail);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain('254');
  });

  it('rejects email missing @ sign', () => {
    const result = validateEmail('userexample.com');
    expect(result.valid).toBe(false);
  });

  it('rejects email missing domain', () => {
    const result = validateEmail('user@');
    expect(result.valid).toBe(false);
  });

  it('rejects email missing TLD', () => {
    const result = validateEmail('user@example');
    expect(result.valid).toBe(false);
  });

  it('accepts email with plus addressing', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.valid).toBe(true);
  });

  it('accepts email with dots in local part', () => {
    const result = validateEmail('first.last@example.com');
    expect(result.valid).toBe(true);
  });
});

describe('validateDisplayName', () => {
  it('accepts a valid display name', () => {
    const result = validateDisplayName('Alice');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects an empty string', () => {
    const result = validateDisplayName('');
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.field).toBe('displayName');
  });

  it('rejects whitespace-only input', () => {
    const result = validateDisplayName('   ');
    expect(result.valid).toBe(false);
  });

  it('rejects undefined', () => {
    const result = validateDisplayName(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects a display name exceeding 100 characters', () => {
    const longName = 'A'.repeat(101);
    const result = validateDisplayName(longName);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.message).toContain('100');
  });

  it('accepts a display name of exactly 100 characters', () => {
    const name = 'B'.repeat(100);
    const result = validateDisplayName(name);
    expect(result.valid).toBe(true);
  });

  it('accepts a single character display name', () => {
    const result = validateDisplayName('X');
    expect(result.valid).toBe(true);
  });
});

describe('validateCourse', () => {
  it('accepts undefined (optional field)', () => {
    const result = validateCourse(undefined);
    expect(result.valid).toBe(true);
  });

  it('accepts null (optional field)', () => {
    const result = validateCourse(null);
    expect(result.valid).toBe(true);
  });

  it('accepts an empty string', () => {
    const result = validateCourse('');
    expect(result.valid).toBe(true);
  });

  it('accepts a valid course string', () => {
    const result = validateCourse('Computer Science');
    expect(result.valid).toBe(true);
  });

  it('rejects a course exceeding 100 characters', () => {
    const longCourse = 'C'.repeat(101);
    const result = validateCourse(longCourse);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.field).toBe('course');
  });

  it('accepts a course of exactly 100 characters', () => {
    const course = 'D'.repeat(100);
    const result = validateCourse(course);
    expect(result.valid).toBe(true);
  });

  it('rejects a non-string value', () => {
    const result = validateCourse(123);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.field).toBe('course');
  });
});

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
  });

  it('is idempotent', () => {
    const email = '  Test@Mail.org ';
    const once = normalizeEmail(email);
    const twice = normalizeEmail(once);
    expect(twice).toBe(once);
  });

  it('handles already normalized email', () => {
    expect(normalizeEmail('already@normal.com')).toBe('already@normal.com');
  });
});

describe('compareDisplayNames', () => {
  it('returns true for identical names', () => {
    expect(compareDisplayNames('Alice', 'Alice')).toBe(true);
  });

  it('returns true for case-different names', () => {
    expect(compareDisplayNames('alice', 'ALICE')).toBe(true);
  });

  it('returns true for names differing by whitespace', () => {
    expect(compareDisplayNames('  alice  ', 'alice')).toBe(true);
  });

  it('returns false for different names', () => {
    expect(compareDisplayNames('Alice', 'Bob')).toBe(false);
  });

  it('returns true for mixed case + whitespace', () => {
    expect(compareDisplayNames('  JoHn  ', 'john')).toBe(true);
  });
});

describe('isSelfAction', () => {
  it('detects same email (exact match)', () => {
    expect(isSelfAction('user@example.com', 'user@example.com')).toBe(true);
  });

  it('detects same email (case difference)', () => {
    expect(isSelfAction('User@Example.COM', 'user@example.com')).toBe(true);
  });

  it('detects same email (whitespace difference)', () => {
    expect(isSelfAction('  user@example.com ', 'user@example.com')).toBe(true);
  });

  it('returns false for different emails', () => {
    expect(isSelfAction('alice@example.com', 'bob@example.com')).toBe(false);
  });
});
