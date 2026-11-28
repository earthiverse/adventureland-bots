import type { CMData, GData, Priest } from 'alclient';
import { describe, expect, mock, test } from 'bun:test';

import { PartyHealStrategy } from '@/strategies/priest/partyheal';

function createMockPriest(id: string) {
  let cmListener: ((data: CMData) => void) | undefined;
  const partyHealMock = mock(() => Promise.resolve());
  const offMock = mock(() => {});

  const bot = {
    canUse: (skill: string) => skill === 'partyheal',
    G: {
      skills: {
        partyheal: {
          levels: [
            [1, 500],
            [60, 600],
          ],
        },
      },
    } as unknown as GData,
    hp: 1000,
    id,
    level: 60,
    max_hp: 1000,
    party: 'leader',
    partyData: { list: ['leader', 'priestA', 'priestB'] },
    partyHeal: partyHealMock,
    players: new Map(),
    rip: false,
    serverData: { name: 'I', region: 'ASIA' },
    socket: {
      off: offMock,
      on: mock((event: string, cb: (data: CMData) => void) => {
        if (event === 'cm') cmListener = cb;
      }),
    },
  } as unknown as Priest;

  return {
    bot,
    emitCm: (data: CMData) => cmListener?.(data),
    getListener: () => cmListener,
    offMock,
    partyHealMock,
  };
}

describe('PartyHealStrategy', () => {
  test('isolates CM heal requests per priest on a shared strategy instance', async () => {
    const strategy = new PartyHealStrategy({});
    const priestA = createMockPriest('priestA');
    const priestB = createMockPriest('priestB');

    strategy.onApply(priestA.bot);
    strategy.onApply(priestB.bot);

    priestA.emitCm({ message: JSON.stringify({ hp: 600, request: 'partyheal' }), name: 'leader' });

    await strategy.loops.regen?.fn(priestB.bot);
    expect(priestB.partyHealMock).not.toHaveBeenCalled();

    await strategy.loops.regen?.fn(priestA.bot);
    expect(priestA.partyHealMock).toHaveBeenCalledTimes(1);

    // Request is cleared after healing
    await strategy.loops.regen?.fn(priestA.bot);
    expect(priestA.partyHealMock).toHaveBeenCalledTimes(1);
  });

  test('clears pending CM heal request and detaches listener on onRemove', async () => {
    const strategy = new PartyHealStrategy({});
    const priest = createMockPriest('priestA');

    strategy.onApply(priest.bot);
    const listener = priest.getListener();
    expect(listener).toBeDefined();

    priest.emitCm({ message: JSON.stringify({ hp: 600, request: 'partyheal' }), name: 'leader' });
    strategy.onRemove(priest.bot);

    expect(priest.offMock).toHaveBeenCalledWith('cm', listener!);

    await strategy.loops.regen?.fn(priest.bot);
    expect(priest.partyHealMock).not.toHaveBeenCalled();
  });
});
