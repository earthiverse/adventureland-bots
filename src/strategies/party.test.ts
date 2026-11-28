import type { InviteData, PingCompensatedCharacter } from 'alclient';
import { describe, expect, mock, test } from 'bun:test';

import { PartyStrategy } from '@/strategies/party';

function createMockBot(id: string) {
  let requestListener: ((data: InviteData) => void) | undefined;
  const acceptPartyRequestMock = mock(() => Promise.resolve());
  const offMock = mock(() => {});

  const bot = {
    acceptPartyRequest: acceptPartyRequestMock,
    id,
    socket: {
      off: offMock,
      on: mock((event: string, cb: (data: InviteData) => void) => {
        if (event === 'request') requestListener = cb;
      }),
    },
  } as unknown as PingCompensatedCharacter;

  return {
    acceptPartyRequestMock,
    bot,
    emitRequest: (data: InviteData) => requestListener?.(data),
    getListener: () => requestListener,
    offMock,
  };
}

describe('PartyStrategy', () => {
  test('detaches only the removed bot listener without clearing the party leader listener', () => {
    const strategy = new PartyStrategy({ partyLeader: 'leader' });
    const leader = createMockBot('leader');
    const member = createMockBot('member');

    strategy.onApply(leader.bot);
    strategy.onApply(member.bot);

    const leaderListener = leader.getListener();
    expect(leaderListener).toBeDefined();
    expect(member.getListener()).toBeUndefined();

    // Removing a non-leader bot must not affect the leader's stored listener
    strategy.onRemove(member.bot);
    expect(member.offMock).not.toHaveBeenCalled();

    leader.emitRequest({ name: 'member' });
    expect(leader.acceptPartyRequestMock).toHaveBeenCalledWith('member');

    // Removing the leader still detaches its exact listener
    strategy.onRemove(leader.bot);
    expect(leader.offMock).toHaveBeenCalledWith('request', leaderListener!);
  });
});
