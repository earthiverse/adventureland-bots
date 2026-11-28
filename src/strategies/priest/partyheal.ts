import type { CMData, Priest } from 'alclient';
import z from 'zod';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { getVisiblePlayers } from '@/utils/players';

export const listenerDataSchema = z.object({
  request: z.literal('partyheal'),
  hp: z.int().positive().max(10_000).optional(),
});

export interface PartyHealStrategyOptions {
  /**
   * If set, we will not enable the CM listener for heal requests
   */
  disableCmListener?: true;

  /**
   * If set, we will party heal if any character is missing >= specified HP
   * If set to 'optimal', we will party heal if any character is missing >= how much we can party heal at our current level
   */
  healIfMissingHp?: number | 'optimal';

  /**
   * Ratio must be 0 < Ratio < 1
   * If set, we will party heal if any character has HP / Max HP below the specified ratio
   */
  healIfHpRatioBelow?: number;
}

export class PartyHealStrategy implements Strategy<Priest> {
  public readonly loops: StrategyLoops<Priest> = {
    regen: {
      fn: (bot) => this.partyHeal(bot),
      getDelay: (bot) => this.getDelay(bot),
    },
  };
  public readonly priority = 20;

  protected readonly onCmListeners = new Map<string, (data: CMData) => void>();
  protected readonly listenerHealAmounts = new Map<string, number>();

  public constructor(protected options: PartyHealStrategyOptions) {
    if (options.disableCmListener && options.healIfMissingHp === undefined && options.healIfHpRatioBelow === undefined)
      throw new Error('No PartyHealStrategyOptions options are set');
    if (typeof options.healIfMissingHp === 'number' && options.healIfMissingHp <= 0)
      throw new Error('healIfMissingHp must be > 0');
    if (
      options.healIfHpRatioBelow !== undefined &&
      (options.healIfHpRatioBelow <= 0 || options.healIfHpRatioBelow >= 1)
    )
      throw new Error('healIfHpRatioBelow must be > 0 and < 1');
  }

  protected async partyHeal(bot: Priest): Promise<void> {
    if (!bot.party) return; // Not in a party, don't party heal
    if (!bot.canUse('partyheal')) return; // Can't use partyheal

    if (await this.tryCmPartyHeal(bot)) return;
    await this.tryVisiblePartyHeal(bot);
  }

  protected async tryCmPartyHeal(bot: Priest): Promise<boolean> {
    const requestedHeal = this.listenerHealAmounts.get(bot.id) ?? 0;
    if (requestedHeal <= 0) return false; // No pending CM heal requests

    const healAmount = this.getPartyHealAmount(bot);
    if (!healAmount) return false; // Won't heal anything

    await bot.partyHeal();
    // Re-read after await in case a larger CM request arrived while casting
    const remaining = Math.max(0, (this.listenerHealAmounts.get(bot.id) ?? 0) - healAmount);
    if (remaining > 0) this.listenerHealAmounts.set(bot.id, remaining);
    else this.listenerHealAmounts.delete(bot.id); // Clear completed request
    return true;
  }

  protected async tryVisiblePartyHeal(bot: Priest): Promise<boolean> {
    if (!bot.party) return false; // Not in a party

    const partyMembers = getVisiblePlayers({
      party: bot.party,
      isDead: false,
      isMissingHp: true,
      serverIdentifier: bot.serverData.name,
      serverRegion: bot.serverData.region,
    });
    if (!partyMembers.length) return false; // Nobody (that we can see) needs healing

    // healIfMissingHp
    let healAmount: number | 'optimal' | undefined = this.options.healIfMissingHp;
    if (healAmount === 'optimal') {
      healAmount = this.getPartyHealAmount(bot);
      if (!healAmount) return false; // Won't heal anything
    }
    if (healAmount && partyMembers.some((c) => c.max_hp - c.hp >= healAmount)) {
      await bot.partyHeal();
      return true;
    }

    // healIfHpRatioBelow
    if (
      this.options.healIfHpRatioBelow !== undefined &&
      partyMembers.some((c) => c.hp / c.max_hp < this.options.healIfHpRatioBelow!)
    ) {
      await bot.partyHeal();
      return true;
    }

    return false;
  }

  public getDelay(bot: Priest): number {
    return Math.max(50, bot.getCooldown('partyheal'));
  }

  public onApply(bot: Priest): void {
    if (this.options.disableCmListener) return;

    const listener = (data: CMData) => {
      if (!bot.party) return; // We are not in a party
      if (!bot.partyData?.list?.includes(data.name)) return; // They're not in our party

      try {
        const json: unknown = JSON.parse(data.message);
        const request = listenerDataSchema.safeParse(json);
        if (!request.success) return;

        const current = this.listenerHealAmounts.get(bot.id) ?? 0;
        this.listenerHealAmounts.set(bot.id, Math.max(current, request.data.hp ?? this.getPartyHealAmount(bot)));
      } catch {
        // Invalid JSON
      }
    };
    bot.socket.on('cm', listener);
    this.onCmListeners.set(bot.id, listener);
  }

  public onRemove(bot: Priest): void {
    const listener = this.onCmListeners.get(bot.id);
    if (listener) bot.socket.off('cm', listener);
    this.onCmListeners.delete(bot.id);
    this.listenerHealAmounts.delete(bot.id);
  }

  /**
   * Returns the amount that the character can party heal
   */
  private getPartyHealAmount(bot: Priest): number {
    return bot.G.skills.partyheal.levels!.findLast(([level]) => bot.level >= level)?.[1] ?? 0;
  }
}
