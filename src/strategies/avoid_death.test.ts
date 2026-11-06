import type { ActionData, Entity, GData, PingCompensatedCharacter } from 'alclient';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { AvoidDeathStrategy } from '@/strategies/avoid_death';

describe('AvoidDeathStrategy', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('avoidDeath - burn damage', () => {
    test('returns false immediately if bot is already dead (rip)', async () => {
      const strategy = new AvoidDeathStrategy();
      const bot = {
        rip: true,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
    });

    test('commits suicide when burn damage is lethal within ping window', async () => {
      const strategy = new AvoidDeathStrategy();
      const harakiriMock = mock(() => Promise.resolve());
      const bot = {
        G: {
          conditions: {
            burned: { interval: 210 },
          },
        } as unknown as GData,
        harakiri: harakiriMock,
        hp: 50,
        ping: 50,
        rip: false,
        s: {
          burned: { intensity: 500, ms: 5000 }, // damagePerInterval = ceil(500/5) = 100 >= 50 hp
        },
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(harakiriMock).toHaveBeenCalledTimes(1);
    });

    test('does not suicide when burn damage is non-lethal within ping window', async () => {
      const strategy = new AvoidDeathStrategy();
      const harakiriMock = mock(() => Promise.resolve());
      const bot = {
        G: {
          conditions: {
            burned: { interval: 210 },
          },
        } as unknown as GData,
        harakiri: harakiriMock,
        hp: 500,
        ping: 50,
        rip: false,
        s: {
          burned: { intensity: 50, ms: 5000 }, // damagePerInterval = 10, 1 interval * 10 < 500 hp
        },
        targets: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBeUndefined();
      expect(harakiriMock).not.toHaveBeenCalled();
    });
  });

  describe('avoidDeath - monster attacks & scare', () => {
    test('returns early if bot has no targets', async () => {
      const strategy = new AvoidDeathStrategy();
      const harakiriMock = mock(() => Promise.resolve());
      const bot = {
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hp: 100,
        rip: false,
        s: {},
        targets: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBeUndefined();
      expect(harakiriMock).not.toHaveBeenCalled();
    });

    test('scares instead of suicide when lethal incoming damage and jacko equipped', async () => {
      const strategy = new AvoidDeathStrategy();
      const scareMock = mock(() => Promise.resolve([]));
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: (skill: string) => skill === 'scare',
        courage: 5,
        getEntities: () => [
          {
            calculateDamageRange: () => [50, 200],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: () => true,
        hp: 150, // 200 incoming >= 150 hp (lethal)
        isOnCooldown: () => false,
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        scare: scareMock,
        slots: { orb: { name: 'jacko' } },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(scareMock).toHaveBeenCalledTimes(1);
      expect(harakiriMock).not.toHaveBeenCalled();
    });

    test('equips jacko from inventory and scares when lethal incoming damage', async () => {
      const strategy = new AvoidDeathStrategy();
      const equipMock = mock(() => Promise.resolve());
      const scareMock = mock(() => Promise.resolve([]));
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: () => true,
        courage: 5,
        equip: equipMock,
        getEntities: () => [
          {
            calculateDamageRange: () => [50, 200],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: (name: string) => name === 'jacko',
        hp: 150,
        isOnCooldown: () => false,
        locateItem: (name: string) => (name === 'jacko' ? 4 : undefined),
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        scare: scareMock,
        slots: { orb: { name: 'test_orb' } },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(equipMock).toHaveBeenCalledWith(4);
      expect(scareMock).toHaveBeenCalledTimes(1);
      expect(harakiriMock).not.toHaveBeenCalled();
    });

    test('falls back to harakiri when lethal damage and scare is on cooldown', async () => {
      const strategy = new AvoidDeathStrategy();
      const scareMock = mock(() => Promise.resolve([]));
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: () => false, // scare on cooldown
        courage: 5,
        getEntities: () => [
          {
            calculateDamageRange: () => [50, 200],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: () => true,
        hp: 150,
        isOnCooldown: () => true,
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        scare: scareMock,
        slots: { orb: { name: 'jacko' } },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(scareMock).not.toHaveBeenCalled();
      expect(harakiriMock).toHaveBeenCalledTimes(1);
    });

    test('triggers scare on scareIfHpBelow even if damage is non-lethal', async () => {
      const strategy = new AvoidDeathStrategy({ scareIfHpBelow: 300 });
      const scareMock = mock(() => Promise.resolve([]));
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: () => true,
        courage: 5,
        getEntities: () => [
          {
            calculateDamageRange: () => [10, 50],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: () => true,
        hp: 250, // <= 300 hp threshold, but 50 damage is non-lethal
        isOnCooldown: () => false,
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        scare: scareMock,
        slots: { orb: { name: 'jacko' } },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(scareMock).toHaveBeenCalledTimes(1);
      expect(harakiriMock).not.toHaveBeenCalled();
    });

    test('does not suicide on scareIfHpBelow if scare fails and hit is non-lethal', async () => {
      const strategy = new AvoidDeathStrategy({ scareIfHpBelow: 300 });
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: () => false, // Cannot scare
        courage: 5,
        getEntities: () => [
          {
            calculateDamageRange: () => [10, 50],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: () => false,
        hp: 250, // <= 300 hp, but 50 damage < 250 hp (non-lethal)
        isOnCooldown: () => false,
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        slots: { orb: undefined },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBeUndefined();
      expect(harakiriMock).not.toHaveBeenCalled();
    });

    test('triggers scare on scareIfHpRatioBelow', async () => {
      const strategy = new AvoidDeathStrategy({ scareIfHpRatioBelow: 0.25 });
      const scareMock = mock(() => Promise.resolve([]));
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: () => true,
        courage: 5,
        getEntities: () => [
          {
            calculateDamageRange: () => [10, 50],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: () => true,
        hp: 200, // 200 / 1000 = 0.20 <= 0.25
        isOnCooldown: () => false,
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        scare: scareMock,
        slots: { orb: { name: 'jacko' } },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(scareMock).toHaveBeenCalledTimes(1);
    });

    test('bypasses scare when useScare is false and suicides directly on lethal damage', async () => {
      const strategy = new AvoidDeathStrategy({ useScare: false });
      const scareMock = mock(() => Promise.resolve([]));
      const harakiriMock = mock(() => Promise.resolve());

      const bot = {
        calculateTargets: () => ({ magical: 0, physical: 1, pure: 0 }),
        canUse: () => true,
        courage: 5,
        getEntities: () => [
          {
            calculateDamageRange: () => [50, 200],
            damage_type: 'physical',
            range: 50,
            speed: 20,
            x: 10,
            y: 0,
          } as unknown as Entity,
        ],
        G: { conditions: {} } as unknown as GData,
        harakiri: harakiriMock,
        hasItem: () => true,
        hp: 150,
        isOnCooldown: () => false,
        max_hp: 1000,
        mcourage: 5,
        pcourage: 5,
        rip: false,
        s: {},
        scare: scareMock,
        slots: { orb: { name: 'jacko' } },
        targets: 1,
        x: 0,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const result = await strategy.loops.attack?.fn(bot);
      expect(result).toBe(false);
      expect(scareMock).not.toHaveBeenCalled();
      expect(harakiriMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('onApply and onRemove', () => {
    test('suicides on projectile action event if couldDieToProjectiles is true', () => {
      const strategy = new AvoidDeathStrategy();
      const harakiriMock = mock(() => Promise.resolve());
      let actionListener: ((data: ActionData) => void) | undefined;

      const offMock = mock(() => {});
      const bot = {
        couldDieToProjectiles: () => true,
        harakiri: harakiriMock,
        id: 'bot1',
        rip: false,
        socket: {
          off: offMock,
          on: mock((event: string, cb: (data: ActionData) => void) => {
            if (event === 'action') actionListener = cb;
          }),
        },
      } as unknown as PingCompensatedCharacter;

      strategy.onApply(bot);
      expect(actionListener).toBeDefined();

      // Trigger with projectile for another target -> ignored
      actionListener?.({ target: 'other_bot' } as ActionData);
      expect(harakiriMock).not.toHaveBeenCalled();

      // Trigger with projectile for this bot -> suicides
      actionListener?.({ target: 'bot1' } as ActionData);
      expect(harakiriMock).toHaveBeenCalledTimes(1);

      // Clean up via onRemove
      strategy.onRemove(bot);
      expect(offMock).toHaveBeenCalledWith('action', actionListener!);
    });
  });
});
