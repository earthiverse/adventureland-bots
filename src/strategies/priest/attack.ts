import type { PingCompensatedCharacter, Player } from 'alclient';
import type { Priest } from 'alclient';

import { ignoreErrors } from '@/utils/errors';

import { AttackStrategy, type AttackStrategyOptions } from '../attack';

export interface PriestAttackStrategyOptions extends AttackStrategyOptions {
  /**
   * If set, we will not use heal
   */
  disableHeal?: boolean;

  /**
   * If set, we will not heal other characters with the same owner
   */
  disableHealOwner?: boolean;

  /**
   * If set, we will not heal party members
   */
  disableHealParty?: boolean;

  /**
   * If set, we will not use heal on ourself
   */
  disableHealSelf?: boolean;

  /**
   * If set, we will also heal strangers
   */
  enableStrangers?: boolean;

  /**
   * If set, we will heal if any character is missing >= specified HP
   * If set to 'optimal', we will heal if any character is missing >= how much we can heal at our current level
   */
  healIfMissingHp?: number | 'optimal';

  /**
   * Ratio must be 0 < Ratio < 1
   * If set, we will heal if any character has HP / Max HP below the specified ratio
   */
  healIfHpRatioBelow?: number;
}

export class PriestAttackStrategy extends AttackStrategy<Priest, PriestAttackStrategyOptions> {
  constructor(options: PriestAttackStrategyOptions = {}) {
    if (typeof options.healIfMissingHp === 'number' && options.healIfMissingHp <= 0)
      throw new Error('healIfMissingHp must be > 0');
    if (
      options.healIfHpRatioBelow !== undefined &&
      (options.healIfHpRatioBelow <= 0 || options.healIfHpRatioBelow >= 1)
    )
      throw new Error('healIfHpRatioBelow must be > 0 and < 1');

    // Set optimal healing by default
    if (options.healIfMissingHp === undefined && options.healIfHpRatioBelow === undefined)
      options.healIfMissingHp = 'optimal';
    super(options);
  }

  protected override async attack(bot: Priest): Promise<void> {
    const healed = await this.tryHeal(bot);
    if (!healed) await this.tryBasicAttack(bot);
  }

  protected async tryHeal(bot: Priest): Promise<boolean> {
    if (this.options.disableHeal) return false;
    if (!bot.canUse('heal')) return false;

    const potentialTargets: (Player | PingCompensatedCharacter)[] = [];

    for (const c of [bot, ...bot.getPlayers({ isDead: false, isNPC: false, withinRange: 'heal' })]) {
      if (c.hp >= c.max_hp) continue; // full hp
      if (c.id === bot.id) {
        if (this.options.disableHealSelf) continue;
      } else if (!this.options.enableStrangers) {
        let considerHealing = false;
        if (!this.options.disableHealParty && bot.party && c.party === bot.party) considerHealing = true;
        if (!this.options.disableHealOwner && bot.owner === c.owner) considerHealing = true;
        if (!considerHealing) continue;
      }

      // healIfMissingHp
      let healAmount: number | 'optimal' | undefined = this.options.healIfMissingHp;
      if (healAmount === 'optimal') {
        healAmount = bot.calculateDamageRange(c, 'heal')[0];
      }
      if (healAmount && c.max_hp - c.hp >= healAmount) {
        potentialTargets.push(c);
        continue;
      }

      // healIfHpRatioBelow
      if (this.options.healIfHpRatioBelow !== undefined && c.hp / c.max_hp < this.options.healIfHpRatioBelow) {
        potentialTargets.push(c);
      }
    }

    if (potentialTargets.length === 0) return false; // Nobody needs healing

    potentialTargets.sort((a, b) => {
      // Prioritize same owner
      const aIsSameOwner = bot.owner === a.owner;
      const bIsSameOwner = bot.owner === b.owner;
      if (aIsSameOwner && !bIsSameOwner) return -1;
      if (bIsSameOwner && !aIsSameOwner) return 1;

      // Prioritize same party
      const aIsSameParty = bot.party && bot.party === a.party;
      const bIsSameParty = bot.party && bot.party === b.party;
      if (aIsSameParty && !bIsSameParty) return -1;
      if (bIsSameParty && !aIsSameParty) return 1;

      // Prioritize lower HP ratio
      const aRatio = a.hp / a.max_hp;
      const bRatio = b.hp / b.max_hp;
      return aRatio - bRatio;
    });

    await ignoreErrors(bot.healSkill(potentialTargets[0]!.id));
    return true;
  }
}
