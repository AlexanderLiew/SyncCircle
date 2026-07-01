import { describe, it, expect } from 'vitest';
import { canonicalPair } from '../../src/utils/canonical-pair.js';

describe('canonicalPair', () => {
  it('returns userA as low when userA < userB lexicographically', () => {
    const result = canonicalPair('alice', 'bob');
    expect(result).toEqual({ userIdLow: 'alice', userIdHigh: 'bob' });
  });

  it('returns userB as low when userB < userA lexicographically', () => {
    const result = canonicalPair('bob', 'alice');
    expect(result).toEqual({ userIdLow: 'alice', userIdHigh: 'bob' });
  });

  it('is commutative — canonicalPair(A,B) equals canonicalPair(B,A)', () => {
    const ab = canonicalPair('user-123', 'user-456');
    const ba = canonicalPair('user-456', 'user-123');
    expect(ab).toEqual(ba);
  });

  it('handles UUID-style user IDs', () => {
    const idA = '550e8400-e29b-41d4-a716-446655440000';
    const idB = 'a50e8400-e29b-41d4-a716-446655440000';
    const result = canonicalPair(idA, idB);
    expect(result.userIdLow).toBe(idA);
    expect(result.userIdHigh).toBe(idB);
  });

  it('handles equal strings (edge case)', () => {
    const result = canonicalPair('same', 'same');
    expect(result).toEqual({ userIdLow: 'same', userIdHigh: 'same' });
  });
});
