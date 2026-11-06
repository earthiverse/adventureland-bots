import { describe, expect, test } from 'bun:test';

import { canAvoidDreturn } from '@/utils/combat';

describe('canAvoidDreturn', () => {
  test('returns true when damage_type is magical regardless of range', () => {
    expect(canAvoidDreturn({ damage_type: 'magical', range: 20 })).toBe(true);
    expect(canAvoidDreturn({ damage_type: 'magical', range: 100 })).toBe(true);
  });

  test('returns true when damage_type is pure regardless of range', () => {
    expect(canAvoidDreturn({ damage_type: 'pure', range: 20 })).toBe(true);
    expect(canAvoidDreturn({ damage_type: 'pure', range: 100 })).toBe(true);
  });

  test('returns true when damage_type is physical and range is >= 75', () => {
    expect(canAvoidDreturn({ damage_type: 'physical', range: 75 })).toBe(true);
    expect(canAvoidDreturn({ damage_type: 'physical', range: 120 })).toBe(true);
  });

  test('returns false when damage_type is physical and range is < 75', () => {
    expect(canAvoidDreturn({ damage_type: 'physical', range: 74 })).toBe(false);
    expect(canAvoidDreturn({ damage_type: 'physical', range: 20 })).toBe(false);
  });
});
