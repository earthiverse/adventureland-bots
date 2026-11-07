import type { Entity, GData, Ranger } from 'alclient';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { IGNORED_MONSTERS } from '@/strategies/attack';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';

function createMockEntity(id: string, hp = 100, damageType: 'physical' | 'magical' | 'pure' = 'physical'): Entity {
  return {
    couldBurnToDeath: () => false,
    couldDieToProjectiles: () => false,
    damage_type: damageType,
    hp,
    id,
    target: undefined,
  } as unknown as Entity;
}

describe('RangerAttackStrategy', () => {
  beforeEach(() => {
    mock.restore();
    IGNORED_MONSTERS.clear();
  });

  describe('3shot', () => {
    test('performs 3shot when 1 target dies in one shot and remaining 2 fit courage budget', async () => {
      const strategy = new RangerAttackStrategy();
      const threeShotMock = mock(() => Promise.resolve(['p1', 'p2', 'p3']));
      const fiveShotMock = mock(() => Promise.resolve(['p1', 'p2', 'p3', 'p4', 'p5']));

      const dyingTarget = createMockEntity('m1', 20);
      const survivingTarget1 = createMockEntity('m2', 200);
      const survivingTarget2 = createMockEntity('m3', 200);

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 0, pure: 0 }),
        canKillInOneShot: (entity: Entity, skill?: string) => skill === '3shot' && entity.id === 'm1',
        canUse: (skill: string) => skill === '3shot',
        courage: 2,
        fiveShot: fiveShotMock,
        G: {
          skills: {
            '3shot': { mp_cost: 20 },
            '5shot': { mp_cost: 30 },
            supershot: { mp_cost: 400 },
          },
        } as unknown as GData,
        getEntities: () => [dyingTarget, survivingTarget1, survivingTarget2],
        mcourage: 0,
        mp: 100,
        pcourage: 0,
        targets: 0,
        threeShot: threeShotMock,
      } as unknown as Ranger;

      await strategy.loops.attack?.fn(bot);

      expect(threeShotMock).toHaveBeenCalledTimes(1);
      expect(threeShotMock).toHaveBeenCalledWith('m1', 'm2', 'm3');
      expect(IGNORED_MONSTERS.has('m1')).toBe(true);
      expect(IGNORED_MONSTERS.has('m2')).toBe(false);
      expect(IGNORED_MONSTERS.has('m3')).toBe(false);
    });

    test('does not 3shot if courage budget is insufficient for surviving targets', async () => {
      const strategy = new RangerAttackStrategy();
      const threeShotMock = mock(() => Promise.resolve(['p1']));
      const basicAttackMock = mock(() => Promise.resolve('p_basic'));

      const dyingTarget = createMockEntity('m1', 20);
      const survivingTarget1 = createMockEntity('m2', 200);
      const survivingTarget2 = createMockEntity('m3', 200);

      const bot = {
        basicAttack: basicAttackMock,
        calculateTargets: () => ({ magical: 0, physical: 0, pure: 0 }),
        canKillInOneShot: (entity: Entity, skill?: string) => skill === '3shot' && entity.id === 'm1',
        canUse: (skill: string) => skill === '3shot' || skill === 'attack',
        courage: 1, // Only enough courage for 1 surviving monster, but 2 survive
        fiveShot: mock(() => Promise.resolve([])),
        G: {
          skills: {
            '3shot': { mp_cost: 20 },
            '5shot': { mp_cost: 30 },
            supershot: { mp_cost: 400 },
          },
        } as unknown as GData,
        getEntities: () => [dyingTarget, survivingTarget1, survivingTarget2],
        mcourage: 0,
        mp: 100,
        pcourage: 0,
        targets: 0,
        threeShot: threeShotMock,
      } as unknown as Ranger;

      await strategy.loops.attack?.fn(bot);

      expect(threeShotMock).not.toHaveBeenCalled();
      expect(basicAttackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('5shot', () => {
    test('performs 5shot when 1 target dies in one shot and remaining 4 fit courage budget', async () => {
      const strategy = new RangerAttackStrategy();
      const threeShotMock = mock(() => Promise.resolve([]));
      const fiveShotMock = mock(() => Promise.resolve(['p1', 'p2', 'p3', 'p4', 'p5']));

      const dyingTarget = createMockEntity('m1', 20);
      const survivingTargets = [
        createMockEntity('m2', 200),
        createMockEntity('m3', 200),
        createMockEntity('m4', 200),
        createMockEntity('m5', 200),
      ];

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 0, pure: 0 }),
        canKillInOneShot: (entity: Entity, skill?: string) => skill === '5shot' && entity.id === 'm1',
        canUse: (skill: string) => skill === '5shot' || skill === '3shot',
        courage: 4, // Exactly enough courage for 4 surviving monsters
        fiveShot: fiveShotMock,
        G: {
          skills: {
            '3shot': { mp_cost: 20 },
            '5shot': { mp_cost: 30 },
            supershot: { mp_cost: 400 },
          },
        } as unknown as GData,
        getEntities: () => [dyingTarget, ...survivingTargets],
        mcourage: 0,
        mp: 100,
        pcourage: 0,
        targets: 0,
        threeShot: threeShotMock,
      } as unknown as Ranger;

      await strategy.loops.attack?.fn(bot);

      expect(fiveShotMock).toHaveBeenCalledTimes(1);
      expect(fiveShotMock).toHaveBeenCalledWith('m1', 'm2', 'm3', 'm4', 'm5');
      expect(threeShotMock).not.toHaveBeenCalled();
      expect(IGNORED_MONSTERS.has('m1')).toBe(true);
    });

    test('falls back to 3shot when 5shot cannot find 5 safe targets', async () => {
      const strategy = new RangerAttackStrategy();
      const threeShotMock = mock(() => Promise.resolve(['p1', 'p2', 'p3']));
      const fiveShotMock = mock(() => Promise.resolve([]));

      const dyingTarget = createMockEntity('m1', 20);
      const survivingTargets = [
        createMockEntity('m2', 200),
        createMockEntity('m3', 200),
        createMockEntity('m4', 200),
        createMockEntity('m5', 200),
      ];

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 0, pure: 0 }),
        // m1 dies to both 5shot and 3shot
        canKillInOneShot: (entity: Entity) => entity.id === 'm1',
        canUse: (skill: string) => skill === '5shot' || skill === '3shot',
        courage: 2, // Courage only enough for 2 surviving monsters (total 3 targets)
        fiveShot: fiveShotMock,
        G: {
          skills: {
            '3shot': { mp_cost: 20 },
            '5shot': { mp_cost: 30 },
            supershot: { mp_cost: 400 },
          },
        } as unknown as GData,
        getEntities: () => [dyingTarget, ...survivingTargets],
        mcourage: 0,
        mp: 100,
        pcourage: 0,
        targets: 0,
        threeShot: threeShotMock,
      } as unknown as Ranger;

      await strategy.loops.attack?.fn(bot);

      expect(fiveShotMock).not.toHaveBeenCalled();
      expect(threeShotMock).toHaveBeenCalledTimes(1);
      expect(threeShotMock).toHaveBeenCalledWith('m1', 'm2', 'm3');
    });

    test('falls back to 3shot when a target dies to 3shot but survives 5shot', async () => {
      const strategy = new RangerAttackStrategy();
      const threeShotMock = mock(() => Promise.resolve(['p1', 'p2', 'p3']));
      const fiveShotMock = mock(() => Promise.resolve([]));

      // m1 dies to 3shot, but NOT 5shot
      const hybridTarget = createMockEntity('m1', 150);
      const survivingTarget1 = createMockEntity('m2', 200);
      const survivingTarget2 = createMockEntity('m3', 200);

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 0, pure: 0 }),
        canKillInOneShot: (entity: Entity, skill?: string) => skill === '3shot' && entity.id === 'm1',
        canUse: (skill: string) => skill === '5shot' || skill === '3shot',
        courage: 2, // Courage for 2 surviving monsters
        fiveShot: fiveShotMock,
        G: {
          skills: {
            '3shot': { mp_cost: 20 },
            '5shot': { mp_cost: 30 },
            supershot: { mp_cost: 400 },
          },
        } as unknown as GData,
        getEntities: () => [hybridTarget, survivingTarget1, survivingTarget2],
        mcourage: 0,
        mp: 100,
        pcourage: 0,
        targets: 0,
        threeShot: threeShotMock,
      } as unknown as Ranger;

      await strategy.loops.attack?.fn(bot);

      expect(fiveShotMock).not.toHaveBeenCalled();
      expect(threeShotMock).toHaveBeenCalledTimes(1);
      expect(threeShotMock).toHaveBeenCalledWith('m1', 'm2', 'm3');
      expect(IGNORED_MONSTERS.has('m1')).toBe(true);
    });
  });

  describe('options', () => {
    test('skips multishot when disableMultiShot is true', async () => {
      const strategy = new RangerAttackStrategy({ disableMultiShot: true });
      const threeShotMock = mock(() => Promise.resolve([]));
      const basicAttackMock = mock(() => Promise.resolve('p_basic'));

      const targets = [createMockEntity('m1', 20), createMockEntity('m2', 20), createMockEntity('m3', 20)];

      const bot = {
        basicAttack: basicAttackMock,
        calculateTargets: () => ({ magical: 0, physical: 0, pure: 0 }),
        canKillInOneShot: () => true,
        canUse: (skill: string) => skill === '3shot' || skill === 'attack',
        courage: 10,
        fiveShot: mock(() => Promise.resolve([])),
        G: {
          skills: {
            '3shot': { mp_cost: 20 },
            '5shot': { mp_cost: 30 },
            supershot: { mp_cost: 400 },
          },
        } as unknown as GData,
        getEntities: () => targets,
        mcourage: 0,
        mp: 100,
        pcourage: 0,
        targets: 0,
        threeShot: threeShotMock,
      } as unknown as Ranger;

      await strategy.loops.attack?.fn(bot);

      expect(threeShotMock).not.toHaveBeenCalled();
      expect(basicAttackMock).toHaveBeenCalledTimes(1);
    });
  });
});
