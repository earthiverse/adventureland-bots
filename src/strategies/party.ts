import { type InviteData, type PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { noop } from '@/utils/noop';

export interface PartyStrategyOptions {
  /**
   * If set, we will only accept requests from these character IDs
   */
  allowList?: string[];

  /**
   * If set, we will deny requests from these character IDs
   */
  denyList?: string[];

  /**
   * The leader of the party.
   * If this strategy is applied to them, they will listen for party requests and accept them.
   */
  partyLeader: string;
}

export class PartyStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    party: {
      fn: (bot) => this.joinParty(bot),
      getDelay: (bot) => this.getDelay(bot),
    },
  };
  public readonly priority = -100;

  protected onRequest: ((data: { name: string }) => Promise<void>) | undefined = undefined;

  public constructor(protected options: PartyStrategyOptions) {}

  protected async joinParty(bot: BotType): Promise<void> {
    if (bot.id === this.options.partyLeader) return; // The party doesn't join their own party
    if (bot.partyData?.list.includes(this.options.partyLeader)) return; // Already in party

    await bot.sendPartyRequest(this.options.partyLeader).catch(noop);
  }

  public async onApply(bot: BotType) {
    if (bot.id !== this.options.partyLeader) return; // Only the party leader listens for invites

    this.onRequest = async (data: InviteData) => {
      if (this.options.allowList && !this.options.allowList.includes(data.name)) return; // Not in allow list
      if (this.options.denyList && this.options.denyList.includes(data.name)) return; // In deny list

      await bot.acceptPartyRequest(data.name).catch(console.error);
    };
    bot.socket.on('request', this.onRequest);
  }

  public async onRemove(bot: BotType) {
    if (this.onRequest) bot.socket.off('request', this.onRequest);
    this.onRequest = undefined;
  }

  public getDelay(bot: BotType): number {
    if (bot.id === this.options.partyLeader) return 600_000;
    if (bot.partyData?.list.includes(this.options.partyLeader)) return 10_000;
    return 2500;
  }
}
