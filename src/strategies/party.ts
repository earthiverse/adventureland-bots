import type { InviteData, PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export interface PartyStrategyOptions {
  /**
   * If set, we will ONLY accept requests from these character IDs
   */
  allowIds?: string[];

  /**
   * If set, we will deny requests from these character IDs
   */
  denyIds?: string[];

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

  protected onRequest: ((data: InviteData) => Promise<void>) | undefined = undefined;

  public constructor(protected options: PartyStrategyOptions) {}

  protected async joinParty(bot: BotType): Promise<void> {
    if (bot.id === this.options.partyLeader) return; // The party doesn't join their own party
    if (bot.partyData?.list.includes(this.options.partyLeader)) return; // Already in party

    try {
      await bot.sendPartyRequest(this.options.partyLeader);
    } catch {
      // Ignore
    }
  }

  public onApply(bot: BotType): void {
    if (bot.id !== this.options.partyLeader) return; // Only the party leader listens for invites

    this.onRequest = async (data: InviteData) => {
      if (this.options.allowIds && !this.options.allowIds.includes(data.name)) return; // Not in allow list
      if (this.options.denyIds && this.options.denyIds.includes(data.name)) return; // In deny list

      try {
        await bot.acceptPartyRequest(data.name);
      } catch {
        // Ignore
      }
    };
    bot.socket.on('request', this.onRequest);
  }

  public onRemove(bot: BotType): void {
    if (this.onRequest) bot.socket.off('request', this.onRequest);
    this.onRequest = undefined;
  }

  public getDelay(bot: BotType): number {
    if (bot.id === this.options.partyLeader) return 600_000;
    return bot.partyData?.list.includes(this.options.partyLeader) ? 10_000 : 2500;
  }
}
