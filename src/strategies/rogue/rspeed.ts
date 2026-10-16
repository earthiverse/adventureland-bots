import { type Rogue, Tools } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export interface RspeedStrategyOptions {
  /**
   * If set, we will ONLY rspeed these character IDs
   */
  allowIds?: string[];

  /**
   * If set, we will not rspeed these character IDs
   */
  denyIds?: string[];

  /**
   * If set, we will not give rspeed to party members
   */
  disableGiveToPartyMembers?: boolean;

  /**
   * If set, we will not give rspeed to ourself
   */
  disableGiveToSelf?: boolean;

  /**
   * If set, we will give rspeed to nearby strangers, too
   */
  giveToStrangers?: boolean;

  /**
   * If set, we will give rspeed when the buff has less than the specified # of ms left
   * Defaults to 30,000 ms
   */
  giveWhenMsLessThan?: number;
}

export class RspeedStrategy implements Strategy<Rogue> {
  public readonly priority = 10;
  protected readonly options: RspeedStrategyOptions & Required<Pick<RspeedStrategyOptions, 'giveWhenMsLessThan'>>;

  public readonly loops: StrategyLoops<Rogue> = {
    rspeed: {
      fn: (bot) => this.rspeed(bot),
      getDelay: (bot) => this.getRspeedDelay(bot),
    },
  };

  public constructor(options: RspeedStrategyOptions = {}) {
    if (options.giveWhenMsLessThan !== undefined) {
      if (options.giveWhenMsLessThan <= 0) throw new Error('giveWhenMsLessThan must be > 0');
    }

    this.options = {
      ...options,
      giveWhenMsLessThan: options.giveWhenMsLessThan ?? 30_000,
    };
  }

  protected async rspeed(bot: Rogue): Promise<false | void> {
    if (!bot.canUse('rspeed')) return;
    if (bot.s.invis) return; // We're invisible

    const candidates = [...(this.options.disableGiveToSelf ? [] : [bot]), ...bot.players.values()];
    for (const player of candidates) {
      if (Tools.distance(bot, player) > bot.G.skills.rspeed.range!) continue; // Too far away
      if (this.options.allowIds?.includes(player.id) === false) continue; // Not in allow list
      if (this.options.denyIds?.includes(player.id)) continue; // In deny list
      if ((player.s.rspeed?.ms ?? 0) >= this.options.giveWhenMsLessThan) continue; // They still have the buff for a while

      // NOTE: players can receieve rspeed even if they are dead

      if (
        (!this.options.disableGiveToSelf && player.id === bot.id) ||
        (!this.options.disableGiveToPartyMembers && bot.party && player.party === bot.party) ||
        this.options.allowIds?.includes(player.id) ||
        this.options.giveToStrangers
      ) {
        await bot.rspeed(player.id);
        return;
      }
    }
  }

  protected getRspeedDelay(bot: Rogue): number {
    const cooldown = bot.getCooldown('rspeed');
    if (cooldown > 0) return Math.max(50, cooldown);
    return 1000; // Not on cooldown
  }
}
