import type { Entity, PingCompensatedCharacter, ProjectileSkillGRDataObject } from 'alclient';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { AttackStrategy, IGNORED_MONSTERS } from '@/strategies/attack';
import { furthestPrioritization } from '@/utils/targeting';

const MOCK_ATTACK_RESPONSE = {
  place: 'attack',
  response: 'data',
} as unknown as ProjectileSkillGRDataObject;

function createMockEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    couldBurnToDeath: () => false,
    couldDieToProjectiles: () => false,
    hp: 100,
    id: 'm1',
    target: undefined,
    x: 0,
    y: 0,
    ...overrides,
  } as unknown as Entity;
}

function createMockBot(overrides: Partial<PingCompensatedCharacter> = {}): PingCompensatedCharacter {
  return {
    basicAttack: mock(() => Promise.resolve(MOCK_ATTACK_RESPONSE)),
    canKillInOneShot: () => false,
    canUse: () => true,
    entities: new Map(),
    getCooldown: () => 50,
    getEntities: () => [],
    players: new Map(),
    projectiles: new Map(),
    x: 0,
    y: 0,
    ...overrides,
  } as unknown as PingCompensatedCharacter;
}

describe('AttackStrategy', () => {
  beforeEach(() => {
    mock.restore();
    IGNORED_MONSTERS.clear();
  });

  describe('prioritization option', () => {
    test('uses default prioritization (lower HP target first) when prioritization is omitted', async () => {
      const strategy = new AttackStrategy();
      const basicAttackMock = mock(() => Promise.resolve(MOCK_ATTACK_RESPONSE));

      const highHpTarget = createMockEntity({ hp: 500, id: 'high_hp', x: 10, y: 0 });
      const lowHpTarget = createMockEntity({ hp: 50, id: 'low_hp', x: 20, y: 0 });

      const bot = createMockBot({
        basicAttack: basicAttackMock,
        getEntities: () => [highHpTarget, lowHpTarget],
      });

      await strategy.loops.attack?.fn(bot);

      expect(basicAttackMock).toHaveBeenCalledTimes(1);
      expect(basicAttackMock).toHaveBeenCalledWith('low_hp');
    });

    test('uses custom furthestPrioritization when configured', async () => {
      const strategy = new AttackStrategy({
        prioritization: furthestPrioritization,
      });
      const basicAttackMock = mock(() => Promise.resolve(MOCK_ATTACK_RESPONSE));

      const closeLowHpTarget = createMockEntity({ hp: 10, id: 'close', x: 10, y: 0 });
      const farHighHpTarget = createMockEntity({ hp: 1000, id: 'far', x: 200, y: 0 });

      const bot = createMockBot({
        basicAttack: basicAttackMock,
        getEntities: () => [closeLowHpTarget, farHighHpTarget],
        x: 0,
        y: 0,
      });

      await strategy.loops.attack?.fn(bot);

      expect(basicAttackMock).toHaveBeenCalledTimes(1);
      expect(basicAttackMock).toHaveBeenCalledWith('far');
    });
  });

  describe('tryBasicAttack', () => {
    test('does not attack when disableBasicAttack is true', async () => {
      const strategy = new AttackStrategy({ disableBasicAttack: true });
      const basicAttackMock = mock(() => Promise.resolve(MOCK_ATTACK_RESPONSE));

      const bot = createMockBot({
        basicAttack: basicAttackMock,
        getEntities: () => [createMockEntity({ id: 'target' })],
      });

      await strategy.loops.attack?.fn(bot);

      expect(basicAttackMock).toHaveBeenCalledTimes(0);
    });

    test('marks one-shot kill targets in IGNORED_MONSTERS', async () => {
      const strategy = new AttackStrategy();
      const basicAttackMock = mock(() => Promise.resolve(MOCK_ATTACK_RESPONSE));

      const target = createMockEntity({ id: 'target' });
      const bot = createMockBot({
        basicAttack: basicAttackMock,
        canKillInOneShot: () => true,
        getEntities: () => [target],
      });

      await strategy.loops.attack?.fn(bot);

      expect(basicAttackMock).toHaveBeenCalledWith('target');
      expect(IGNORED_MONSTERS.has('target')).toBe(true);
    });
  });
});
