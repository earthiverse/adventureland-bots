import type { IPosition, MonsterName } from 'alclient';
import { describe, expect, test } from 'bun:test';

import { calculateKiteDistance, findKitePosition, matchesMonsterType } from '@/utils/kiting';

describe('kiting utilities', () => {
  describe('calculateKiteDistance', () => {
    test('uses configured distance when provided and within bot range', () => {
      const distance = calculateKiteDistance(300, { range: 50, speed: 40 }, 200);
      expect(distance).toBe(200);
    });

    test('caps configured distance at bot.range - 25', () => {
      const distance = calculateKiteDistance(200, { range: 50, speed: 40 }, 250);
      expect(distance).toBe(175);
    });

    test('calculates threat distance based on monster speed, range, and 50 buffer', () => {
      // 60 speed + 80 range + 50 buffer = 190
      const distance = calculateKiteDistance(300, { range: 80, speed: 60 });
      expect(distance).toBe(190);
    });

    test('factors in monster charge if present', () => {
      // charge: 200, speed: 50, range: 40 => 200 + 40 + 50 = 290
      const distance = calculateKiteDistance(350, { charge: 200, range: 40, speed: 50 });
      expect(distance).toBe(290);
    });

    test('caps dynamic threat distance to bot.range - 25', () => {
      // threat is 300, but bot range is 250 (max 225)
      const distance = calculateKiteDistance(250, { range: 150, speed: 100 });
      expect(distance).toBe(225);
    });

    test('enforces minimum distance of 50 or max attack distance', () => {
      const distance = calculateKiteDistance(300, { range: 0, speed: 0 });
      expect(distance).toBe(50);
    });
  });

  describe('matchesMonsterType', () => {
    test('returns true when no filter is provided', () => {
      expect(matchesMonsterType('phoenix')).toBe(true);
    });

    test('matches single type filter', () => {
      expect(matchesMonsterType('phoenix', { type: 'phoenix' as MonsterName })).toBe(true);
      expect(matchesMonsterType('goo', { type: 'phoenix' as MonsterName })).toBe(false);
    });

    test('matches typeList filter', () => {
      const filter = { typeList: ['osnake' as MonsterName, 'snake' as MonsterName] };
      expect(matchesMonsterType('osnake', filter)).toBe(true);
      expect(matchesMonsterType('snake', filter)).toBe(true);
      expect(matchesMonsterType('goo', filter)).toBe(false);
    });
  });

  describe('findKitePosition', () => {
    test('returns direct retreat position when straight back is fully open', () => {
      const botPos: IPosition = { map: 'main', x: 200, y: 0 };
      const targetPos: IPosition = { map: 'main', x: 0, y: 0 };

      // Target is at (0, 0), bot is at (200, 0). Straight retreat is along +x.
      const kitePos = findKitePosition({
        botPosition: botPos,
        canStand: () => true,
        kiteDistance: 150,
        targetPosition: targetPos,
      });

      expect(kitePos).toBeDefined();
      expect(kitePos?.x).toBeCloseTo(150, 1);
      expect(kitePos?.y).toBeCloseTo(0, 1);
    });

    test('finds ideal position that has clearance behind it', () => {
      const botPos: IPosition = { map: 'main', x: 100, y: 0 };
      const targetPos: IPosition = { map: 'main', x: 0, y: 0 };

      // Block straight back lookPos at x = 187.5 (150 * 1.25)
      const kitePos = findKitePosition({
        botPosition: botPos,
        canStand: (pos) => {
          // If looking straight back beyond 180, it's blocked by a wall
          return !(pos.x > 180 && Math.abs(pos.y) < 10);
        },
        kiteDistance: 150,
        targetPosition: targetPos,
      });

      // It should steer off-angle to find a spot where lookPos is also open
      expect(kitePos).toBeDefined();
      expect(kitePos?.x).toBeLessThan(150);
      expect(Math.abs(kitePos?.y ?? 0)).toBeGreaterThan(0);
    });

    test('falls back to valid kite position even if rear clearance is blocked', () => {
      const botPos: IPosition = { map: 'main', x: 100, y: 0 };
      const targetPos: IPosition = { map: 'main', x: 0, y: 0 };

      // Room has radius 160: pos with radius 150 is valid, but lookPos (187.5) is outside walls everywhere
      const kitePos = findKitePosition({
        botPosition: botPos,
        canStand: (pos) => Math.hypot(pos.x, pos.y) <= 160,
        kiteDistance: 150,
        targetPosition: targetPos,
      });

      expect(kitePos).toBeDefined();
      expect(kitePos?.x).toBeCloseTo(150, 1);
      expect(kitePos?.y).toBeCloseTo(0, 1);
    });

    test('returns undefined when all candidate positions are blocked', () => {
      const botPos: IPosition = { map: 'main', x: 100, y: 0 };
      const targetPos: IPosition = { map: 'main', x: 0, y: 0 };

      const kitePos = findKitePosition({
        botPosition: botPos,
        canStand: () => false,
        kiteDistance: 150,
        targetPosition: targetPos,
      });

      expect(kitePos).toBeUndefined();
    });
  });
});
