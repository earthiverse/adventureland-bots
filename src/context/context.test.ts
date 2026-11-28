import AL, { type PingCompensatedCharacter } from 'alclient';
import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';

import { Context } from '@/context/context';
import type { Strategy } from '@/types/strategy';

function createMockBot(id = 'bot1') {
  const disconnectMock = mock(() => {});
  const offMock = mock(() => {});
  const onMock = mock(() => {});

  const bot = {
    disconnect: disconnectMock,
    id,
    ready: true,
    socket: {
      off: offMock,
      on: onMock,
    },
  } as unknown as PingCompensatedCharacter;

  return { bot, disconnectMock, offMock, onMock };
}

describe('Context reconnect hardening', () => {
  afterEach(() => {
    mock.restore();
  });

  test('does not reschedule an in-flight loop tick after reconnect starts', async () => {
    const initial = createMockBot('bot1');
    const replacement = createMockBot('bot1');
    const context = new Context(initial.bot, 'ASIA', 'I');

    const tickStarted = Promise.withResolvers<void>();
    const releaseTick = Promise.withResolvers<void>();
    let tickCount = 0;

    const strategy: Strategy = {
      loops: {
        attack: {
          fn: async () => {
            tickCount += 1;
            if (tickCount !== 1) return;
            tickStarted.resolve();
            await releaseTick.promise;
          },
          getDelay: () => 10,
        },
      },
    };
    context.applyStrategy(strategy);

    const connect = Promise.withResolvers<PingCompensatedCharacter>();
    spyOn(AL.Game, 'startCharacter').mockImplementation(() => connect.promise);
    spyOn(console, 'log').mockImplementation(() => {});

    try {
      await tickStarted.promise;

      // Start reconnect while tick 1 is still awaiting
      const reconnectPromise = context.reconnect();
      releaseTick.resolve();

      // Wait longer than the 10ms loop delay; loop must stay paused during reconnect
      await Bun.sleep(40);
      expect(tickCount).toBe(1);

      connect.resolve(replacement.bot);
      await reconnectPromise;

      // Once reconnected, the loop resumes
      await Bun.sleep(30);
      expect(tickCount).toBeGreaterThan(1);
    } finally {
      context.stop();
    }
  });

  test('stops retrying on fatal nouser error without calling onRemove twice', async () => {
    const initial = createMockBot('bot1');
    const context = new Context(initial.bot, 'ASIA', 'I');
    const onRemoveMock = mock(() => {});
    context.applyStrategy({ onRemove: onRemoveMock });

    const startSpy = spyOn(AL.Game, 'startCharacter').mockRejectedValue(new Error('nouser'));
    spyOn(console, 'error').mockImplementation(() => {});
    spyOn(console, 'log').mockImplementation(() => {});

    await context.reconnect();

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
  });

  test('disconnects newly connected bot if stop is called while startCharacter is in flight', async () => {
    const initial = createMockBot('bot1');
    const lateBot = createMockBot('bot1');
    const context = new Context(initial.bot, 'ASIA', 'I');
    const onApplyMock = mock(() => {});
    context.applyStrategy({ onApply: onApplyMock });

    const connect = Promise.withResolvers<PingCompensatedCharacter>();
    spyOn(AL.Game, 'startCharacter').mockImplementation(() => connect.promise);
    spyOn(console, 'log').mockImplementation(() => {});

    const reconnectPromise = context.reconnect();
    context.stop();

    connect.resolve(lateBot.bot);
    await reconnectPromise;

    expect(lateBot.disconnectMock).toHaveBeenCalledTimes(1);
    // onApply ran once initially, never re-applied to the discarded bot
    expect(onApplyMock).toHaveBeenCalledTimes(1);
  });
});
