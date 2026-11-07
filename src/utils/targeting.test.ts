import type { Entity, PingCompensatedCharacter } from 'alclient';
import { describe, expect, test } from 'bun:test';

import { defaultPrioritization, furthestPrioritization } from './targeting';

function createMockBot(overrides: Partial<PingCompensatedCharacter> = {}): PingCompensatedCharacter {
  return {
    entities: new Map(),
    players: new Map(),
    projectiles: new Map(),
    x: 0,
    y: 0,
    ...overrides,
  } as unknown as PingCompensatedCharacter;
}

interface MockEntityOptions {
  couldBurnToDeath?: boolean | undefined;
  couldDieToProjectiles?: boolean | undefined;
  hp?: number | undefined;
  id?: string | undefined;
  target?: string | undefined;
  x?: number | undefined;
  y?: number | undefined;
}

function createMockEntity(options: MockEntityOptions = {}): Entity {
  const {
    couldBurnToDeath = false,
    couldDieToProjectiles = false,
    hp = 100,
    id = 'm1',
    target,
    x = 0,
    y = 0,
  } = options;

  return {
    couldBurnToDeath: () => couldBurnToDeath,
    couldDieToProjectiles: () => couldDieToProjectiles,
    hp,
    id,
    target,
    x,
    y,
  } as unknown as Entity;
}

describe('targeting utilities', () => {
  describe('defaultPrioritization', () => {
    test('prioritizes monsters that cannot burn to death over those that will', () => {
      const bot = createMockBot();
      const comparator = defaultPrioritization(bot);

      const burning = createMockEntity({ couldBurnToDeath: true, id: 'burning' });
      const nonBurning = createMockEntity({ couldBurnToDeath: false, id: 'nonBurning' });

      expect(comparator(nonBurning, burning)).toBeLessThan(0);
      expect(comparator(burning, nonBurning)).toBeGreaterThan(0);
    });

    test('prioritizes monsters that will not die to projectiles over those that will', () => {
      const bot = createMockBot();
      const comparator = defaultPrioritization(bot);

      const dying = createMockEntity({ couldDieToProjectiles: true, id: 'dying' });
      const surviving = createMockEntity({ couldDieToProjectiles: false, id: 'surviving' });

      expect(comparator(surviving, dying)).toBeLessThan(0);
      expect(comparator(dying, surviving)).toBeGreaterThan(0);
    });

    test('prioritizes monsters with a target over those without', () => {
      const bot = createMockBot();
      const comparator = defaultPrioritization(bot);

      const targeted = createMockEntity({ id: 'targeted', target: 'someone' });
      const untargeted = createMockEntity({ id: 'untargeted', target: undefined });

      expect(comparator(targeted, untargeted)).toBeLessThan(0);
      expect(comparator(untargeted, targeted)).toBeGreaterThan(0);
    });

    test('prioritizes monsters with lower HP when other criteria match', () => {
      const bot = createMockBot();
      const comparator = defaultPrioritization(bot);

      const lowHp = createMockEntity({ hp: 50, id: 'low' });
      const highHp = createMockEntity({ hp: 200, id: 'high' });

      expect(comparator(lowHp, highHp)).toBeLessThan(0);
      expect(comparator(highHp, lowHp)).toBeGreaterThan(0);
      expect(comparator(lowHp, lowHp)).toBe(0);
    });
  });

  describe('furthestPrioritization', () => {
    test('prioritizes monsters furthest away from the bot', () => {
      const bot = createMockBot({ x: 0, y: 0 });
      const comparator = furthestPrioritization(bot);

      const near = createMockEntity({ id: 'near', x: 20, y: 0 });
      const far = createMockEntity({ id: 'far', x: 100, y: 0 });

      // far should come before near (negative comparator return value)
      expect(comparator(far, near)).toBeLessThan(0);
      expect(comparator(near, far)).toBeGreaterThan(0);

      const list = [near, far];
      list.sort(comparator);
      expect(list[0]!.id).toBe('far');
      expect(list[1]!.id).toBe('near');
    });

    test('returns 0 for monsters at identical distance', () => {
      const bot = createMockBot({ x: 0, y: 0 });
      const comparator = furthestPrioritization(bot);

      const m1 = createMockEntity({ id: 'm1', x: 50, y: 0 });
      const m2 = createMockEntity({ id: 'm2', x: 0, y: 50 });

      expect(comparator(m1, m2)).toBe(0);
    });
  });
});
