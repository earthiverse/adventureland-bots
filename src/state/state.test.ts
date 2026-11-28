import type { BankInfo, CharacterData, PingCompensatedCharacter } from 'alclient';
import { describe, expect, mock, test } from 'bun:test';

import { Context } from '@/context/context';
import { State } from '@/state/state';

function createMockBot(id: string, owner: string, initialBank?: BankInfo) {
  let playerListener: ((data: CharacterData) => void) | undefined;
  const offMock = mock(() => {});

  const bot = {
    bank: initialBank,
    disconnect: mock(() => {}),
    id,
    owner,
    socket: {
      off: offMock,
      on: mock((event: string, cb: (data: CharacterData) => void) => {
        if (event === 'player') playerListener = cb;
      }),
    },
  } as unknown as PingCompensatedCharacter;

  return {
    bot,
    emitPlayer: (data: CharacterData) => playerListener?.(data),
    getPlayerListener: () => playerListener,
    offMock,
  };
}

describe('State bank snapshot caching', () => {
  test('caches bank snapshot when player socket updates include user data', () => {
    const localState = new State();
    const owner = 'owner-player-event';
    const { bot, emitPlayer } = createMockBot('bankBot1', owner);
    const context = new Context(bot, 'ASIA', 'I');

    try {
      localState.addContext(context);

      // Non-bank player updates should not populate the cache
      emitPlayer({ owner } as CharacterData);
      expect(localState.getBank(owner)).toBeUndefined();

      const bankSnapshot = { gold: 12_345, items0: [] } as unknown as BankInfo;
      emitPlayer({ owner, user: bankSnapshot } as CharacterData);
      expect(localState.getBank(owner)).toBe(bankSnapshot);
    } finally {
      localState.stopAll();
    }
  });

  test('seeds cached bank snapshot if bot connects already inside the bank', () => {
    const localState = new State();
    const owner = 'owner-initial-bank';
    const initialBank = { gold: 50_000, items0: [] } as unknown as BankInfo;
    const { bot } = createMockBot('bankBot2', owner, initialBank);
    const context = new Context(bot, 'ASIA', 'I');

    try {
      localState.addContext(context);
      expect(localState.getBank(owner)).toBe(initialBank);
    } finally {
      localState.stopAll();
    }
  });

  test('detaches player listener when context is removed from state', () => {
    const localState = new State();
    const { bot, getPlayerListener, offMock } = createMockBot('bankBot3', 'owner-remove');
    const context = new Context(bot, 'ASIA', 'I');

    try {
      localState.addContext(context);
      const listener = getPlayerListener();
      expect(listener).toBeDefined();

      expect(localState.removeContext(context)).toBe(true);
      expect(offMock).toHaveBeenCalledWith('player', listener!);
    } finally {
      context.stop();
    }
  });

  test('prefers fresher cached bank snapshot over an earlier bot holding stale bot.bank', () => {
    const localState = new State();
    const owner = 'owner-fresher-cache';
    const staleBank = { gold: 100, items0: [] } as unknown as BankInfo;
    const freshBank = { gold: 999, items0: [] } as unknown as BankInfo;

    const botA = createMockBot('botA', owner, staleBank);
    const botB = createMockBot('botB', owner, freshBank);
    const contextA = new Context(botA.bot, 'ASIA', 'I');
    const contextB = new Context(botB.bot, 'ASIA', 'I');

    try {
      localState.addContext(contextA);
      localState.addContext(contextB);

      // Even though botA is first in contextsMap with staleBank, botB's newer snapshot wins
      expect(localState.getBank(owner)).toBe(freshBank);
    } finally {
      localState.stopAll();
    }
  });
});
