import type { PingCompensatedCharacter, Player, Priest } from 'alclient';

import { state } from '@/state/state';
import type { Strategy, StrategyLoops } from '@/types/strategy';

export interface PartyHealStrategyOptions {
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

  public constructor(protected options: PartyHealStrategyOptions) {
    if (options.healIfMissingHp === undefined && options.healIfHpRatioBelow === undefined)
      throw new Error('No PartyHealStrategyOptions options are set');
    if (typeof options.healIfMissingHp === 'number' && options.healIfMissingHp <= 0)
      throw new Error('healIfMissingHp must be > 0');
    if (options.healIfHpRatioBelow !== undefined) {
      if (options.healIfHpRatioBelow <= 0 || options.healIfHpRatioBelow >= 1)
        throw new Error('healIfHpRatioBelow must be > 0 and < 1');
    }
  }

  protected async partyHeal(bot: Priest): Promise<void> {
    if (!bot.party) return; // Not in a party, don't party heal
    if (!bot.canUse('partyheal')) return; // Can't use partyheal

    const partyMembers = this.getHealablePartyMembers(bot);
    if (!partyMembers.length) return; // Nobody needs healing

    // healIfMissingHp
    let healAmount: number | 'optimal' | undefined = this.options.healIfMissingHp;
    if (healAmount === 'optimal') {
      healAmount = bot.G.skills.partyheal.levels!.findLast(([level]) => bot.level >= level)?.[1];
      if (!healAmount) return; // We aren't a high enough level to partyheal
    }
    if (healAmount) {
      if (partyMembers.some((c) => c.max_hp - c.hp >= healAmount)) {
        await bot.partyHeal();
        return;
      }
    }

    // healIfHpRatioBelow
    if (this.options.healIfHpRatioBelow !== undefined) {
      if (partyMembers.some((c) => c.hp / c.max_hp < this.options.healIfHpRatioBelow!)) {
        await bot.partyHeal();
        return;
      }
    }
  }

  public getDelay(bot: Priest): number {
    return Math.max(50, bot.getCooldown('partyheal'));
  }

  /**
   * Returns a list of party members that we can see that we could heal
   */
  private getHealablePartyMembers(bot: Priest): (PingCompensatedCharacter | Player)[] {
    if (!bot.party) return []; // Not in a party

    // Get context bots that are alive and missing HP
    const contextBots = state.getBotsByParty(bot.party);

    // Get nearby party members from our contexts that are alive and missing hp
    const nearbyPartyMembers: Player[] = [];
    for (const contextBot of contextBots) {
      for (const player of contextBot.players.values()) {
        if (player.rip) continue; // Player is dead
        if (player.party !== bot.party) continue; // Different party
        if (player.hp >= player.max_hp) continue; // Player has full HP
        if (contextBots.some((c) => c.id === player.id)) continue; // One of our characters
        if (nearbyPartyMembers.some((c) => c.id === player.id)) continue; // Already in the list
        nearbyPartyMembers.push(player);
      }
    }
    return [...contextBots.filter((c) => !c.rip && c.hp < c.max_hp), ...nearbyPartyMembers];
  }
}
