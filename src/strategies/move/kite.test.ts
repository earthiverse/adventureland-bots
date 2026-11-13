import { type Entity, Pathfinder, type PingCompensatedCharacter } from 'alclient';
import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { KiteMoveStrategy } from '@/strategies/move/kite';

describe('KiteMoveStrategy', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    test('accepts empty options by default', () => {
      const strategy = new KiteMoveStrategy();
      expect(strategy.loops.move?.getDelay({} as PingCompensatedCharacter)).toBe(250);
    });

    test('accepts options object with distance and monster type', () => {
      const strategy = new KiteMoveStrategy({ distance: 150, type: 'phoenix' });
      expect(strategy.loops.move).toBeDefined();
    });

    test('accepts options object with typeList and moveThreshold', () => {
      const strategy = new KiteMoveStrategy({ moveThreshold: 5, typeList: ['osnake', 'snake'] });
      expect(strategy.loops.move?.getDelay({} as PingCompensatedCharacter)).toBe(250);
    });
  });

  describe('onRemove', () => {
    test('stops smartMove if bot is smartMoving', () => {
      const strategy = new KiteMoveStrategy({ type: 'phoenix' });
      const stopSmartMoveMock = mock(() => Promise.resolve({ map: 'main', x: 0, y: 0 }));
      const bot = {
        smartMoving: { map: 'main', x: 100, y: 100 },
        stopSmartMove: stopSmartMoveMock,
      } as unknown as PingCompensatedCharacter;

      strategy.onRemove(bot);
      expect(stopSmartMoveMock).toHaveBeenCalledTimes(1);
    });

    test('does nothing if bot is not smartMoving', () => {
      const strategy = new KiteMoveStrategy({ type: 'phoenix' });
      const stopSmartMoveMock = mock(() => Promise.resolve({ map: 'main', x: 0, y: 0 }));
      const bot = {
        smartMoving: undefined,
        stopSmartMove: stopSmartMoveMock,
      } as unknown as PingCompensatedCharacter;

      strategy.onRemove(bot);
      expect(stopSmartMoveMock).not.toHaveBeenCalled();
    });
  });

  describe('move loop execution', () => {
    test('aborts early if bot is disabled', async () => {
      const strategy = new KiteMoveStrategy({ type: 'phoenix' });
      const smartMoveMock = mock(() => Promise.resolve());
      const bot = {
        isDisabled: () => true,
        smartMove: smartMoveMock,
      } as unknown as PingCompensatedCharacter;

      await strategy.loops.move?.fn(bot);
      expect(smartMoveMock).not.toHaveBeenCalled();
    });

    test('moves to monster spawn when no target is present', async () => {
      const strategy = new KiteMoveStrategy({ type: 'phoenix' });
      const smartMoveMock = mock(() => Promise.resolve());
      const bot = {
        getEntity: () => {},
        getTargetEntity: () => {},
        isDisabled: () => false,
        smartMove: smartMoveMock,
        smartMoving: undefined,
      } as unknown as PingCompensatedCharacter;

      await strategy.loops.move?.fn(bot);
      expect(smartMoveMock).toHaveBeenCalledWith('phoenix', { getWithin: 50 });
    });

    test('moves towards target if target is on a different map', async () => {
      const strategy = new KiteMoveStrategy({ type: 'phoenix' });
      const smartMoveMock = mock(() => Promise.resolve());
      const target = {
        id: 'target1',
        map: 'halloween',
        type: 'phoenix',
      } as unknown as Entity;

      const bot = {
        getEntity: () => target,
        getTargetEntity: () => {},
        isDisabled: () => false,
        map: 'main',
        range: 300,
        smartMove: smartMoveMock,
        smartMoving: undefined,
      } as unknown as PingCompensatedCharacter;

      await strategy.loops.move?.fn(bot);
      expect(smartMoveMock).toHaveBeenCalledWith(target, { getWithin: 275, useBlink: true });
    });

    test('executes direct move when path is walkable', async () => {
      const strategy = new KiteMoveStrategy({ distance: 150, type: 'phoenix' });
      const moveMock = mock(() => Promise.resolve({ map: 'main', x: 150, y: 0 }));
      const target = {
        charge: 0,
        id: 'phoenix1',
        map: 'main',
        range: 50,
        speed: 40,
        type: 'phoenix',
        x: 0,
        y: 0,
      } as unknown as Entity;

      const bot = {
        getEntity: () => target,
        getTargetEntity: () => {},
        isDisabled: () => false,
        map: 'main',
        move: moveMock,
        range: 300,
        smartMoving: undefined,
        x: 300,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const canStandSpy = mock(() => true);
      const canWalkPathSpy = mock(() => true);
      Pathfinder.canStand = canStandSpy;
      Pathfinder.canWalkPath = canWalkPathSpy;

      await strategy.loops.move?.fn(bot);
      expect(moveMock).toHaveBeenCalledTimes(1);
    });

    test('switches to smartMove when canWalkPath is false', async () => {
      const strategy = new KiteMoveStrategy({ distance: 150, type: 'phoenix' });
      const smartMoveMock = mock(() => Promise.resolve());
      const target = {
        charge: 0,
        id: 'phoenix1',
        map: 'main',
        range: 50,
        speed: 40,
        type: 'phoenix',
        x: 0,
        y: 0,
      } as unknown as Entity;

      const bot = {
        getEntity: () => target,
        getTargetEntity: () => {},
        isDisabled: () => false,
        map: 'main',
        range: 300,
        smartMove: smartMoveMock,
        smartMoving: undefined,
        x: 300,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      const canStandSpy = mock(() => true);
      const canWalkPathSpy = mock(() => false);
      Pathfinder.canStand = canStandSpy;
      Pathfinder.canWalkPath = canWalkPathSpy;

      await strategy.loops.move?.fn(bot);
      expect(smartMoveMock).toHaveBeenCalledTimes(1);
    });

    test('skips direct move when distance to kitePos is <= default moveThreshold (1)', async () => {
      const strategy = new KiteMoveStrategy({ distance: 150, type: 'phoenix' });
      const moveMock = mock(() => Promise.resolve({ map: 'main', x: 150, y: 0 }));
      const target = {
        charge: 0,
        id: 'phoenix1',
        map: 'main',
        range: 50,
        speed: 40,
        type: 'phoenix',
        x: 0,
        y: 0,
      } as unknown as Entity;

      // Bot is at 150.5, kitePos will be at 150 -> distance 0.5 <= default moveThreshold (1)
      const bot = {
        getEntity: () => target,
        getTargetEntity: () => {},
        isDisabled: () => false,
        map: 'main',
        move: moveMock,
        range: 300,
        smartMoving: undefined,
        x: 150.5,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      Pathfinder.canStand = mock(() => true);
      Pathfinder.canWalkPath = mock(() => true);

      await strategy.loops.move?.fn(bot);
      expect(moveMock).not.toHaveBeenCalled();
    });

    test('respects custom moveThreshold option', async () => {
      const strategy = new KiteMoveStrategy({ distance: 150, moveThreshold: 10, type: 'phoenix' });
      const moveMock = mock(() => Promise.resolve({ map: 'main', x: 150, y: 0 }));
      const target = {
        charge: 0,
        id: 'phoenix1',
        map: 'main',
        range: 50,
        speed: 40,
        type: 'phoenix',
        x: 0,
        y: 0,
      } as unknown as Entity;

      // Distance = 5 <= 10 (moveThreshold) -> should not move
      const botUnderThreshold = {
        getEntity: () => target,
        getTargetEntity: () => {},
        isDisabled: () => false,
        map: 'main',
        move: moveMock,
        range: 300,
        smartMoving: undefined,
        x: 155,
        y: 0,
      } as unknown as PingCompensatedCharacter;

      Pathfinder.canStand = mock(() => true);
      Pathfinder.canWalkPath = mock(() => true);

      await strategy.loops.move?.fn(botUnderThreshold);
      expect(moveMock).not.toHaveBeenCalled();

      // Distance = 15 > 10 (moveThreshold) -> should move
      const botOverThreshold = {
        ...botUnderThreshold,
        x: 165,
      } as unknown as PingCompensatedCharacter;

      await strategy.loops.move?.fn(botOverThreshold);
      expect(moveMock).toHaveBeenCalledTimes(1);
    });
  });
});
