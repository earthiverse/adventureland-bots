import { Constants, type ItemName, type PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export interface RegenStrategyOptions {
  /**
   * Number of potions to buy for regen
   * By default, we will buy 9999 potions
   */
  numPotionsToBuy?: number;

  /**
   * Which potions to buy for regen
   * By default, we will buy hpot1 and mpot1
   */
  potionsToBuy?: ItemName[];

  /**
   * Which potions to use for regen
   * By default, we will use hpot0, mpot0, hpot1, and mpot1
   */
  potionsToUse?: ItemName[];
}

export class RegenStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  protected options: Required<RegenStrategyOptions>;
  public readonly priority = 10;

  public readonly loops: StrategyLoops<BotType> = {
    item: {
      fn: (bot) => this.buyPotions(bot),
      getDelay: () => 1000,
    },
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 60_000,
    },
    regen: {
      fn: (bot) => this.regen(bot),
      getDelay: (bot) => this.getRegenDelay(bot),
    },
  };

  public constructor(options: RegenStrategyOptions = {}) {
    this.options = {
      numPotionsToBuy: options.numPotionsToBuy ?? 9999,
      potionsToBuy: options.potionsToBuy ?? ['hpot1', 'mpot1'],
      potionsToUse: options.potionsToUse ?? ['hpot0', 'mpot0', 'hpot1', 'mpot1'],
    };
  }

  protected async buyPotions(bot: BotType): Promise<false | void> {
    const potions = this.options.potionsToBuy;
    const maxPotions = this.options.numPotionsToBuy;
    if (!potions.length) return; // Not buying
    if (!bot.canBuy(potions[0]!)) return; // Can't buy potions

    const itemData = bot.G.items;
    const currentCounts = new Map(potions.map((p) => [p, bot.countItem(p)]));
    const plannedCounts = new Map(potions.map((p) => [p, Math.min(maxPotions, currentCounts.get(p)!)]));

    // Top up the potions we have the least of
    let remainingGold = bot.gold;
    while (remainingGold > 0) {
      const lowestCount = Math.min(...plannedCounts.values());
      const lowestPotions = potions.filter((p) => plannedCounts.get(p) === lowestCount);

      const higherCounts = [...plannedCounts.values()].filter((c) => c > lowestCount);
      const nextHigherCount = Math.min(maxPotions, ...higherCounts);

      const gap = nextHigherCount - lowestCount;
      const costPerRound = lowestPotions.reduce((sum, p) => sum + itemData[p].g, 0);
      const roundsToBuy = Math.min(gap, Math.floor(remainingGold / costPerRound));
      if (roundsToBuy <= 0) break;

      for (const potion of lowestPotions) {
        plannedCounts.set(potion, lowestCount + roundsToBuy);
      }
      remainingGold -= roundsToBuy * costPerRound;
    }

    // Buy potions
    for (const potion of potions) {
      const numToBuy = plannedCounts.get(potion)! - currentCounts.get(potion)!;
      if (numToBuy > 0) await bot.buy(potion, numToBuy);
    }
  }

  protected async move(bot: BotType): Promise<false | void> {
    if (bot.rip) return; // Dead, don't try to move
    if (!this.options.potionsToBuy.length) return; // Not buying
    const firstPotion = this.options.potionsToBuy[0]!;
    if (bot.canBuy(firstPotion)) return; // We can buy potions where we are, no need to move

    // Check if we still have potions
    if (this.getLowestPotionToBuyCount(bot) > 10) return;

    // Check if we have enough gold to buy potions
    const averagePrice =
      this.options.potionsToBuy.reduce((acc, potion) => acc + bot.G.items[potion].g, 0) /
      this.options.potionsToBuy.length;
    const numCanBuy = bot.gold / averagePrice;
    if (numCanBuy < 50) return; // Not enough gold to buy potions

    // Move to town to buy potions
    await bot.smartMove(firstPotion, { getWithin: Constants.NPC_INTERACTION_DISTANCE });
    return false; // Don't move anywhere until we get potions
  }

  protected async regen(bot: BotType): Promise<void> {
    if (bot.rip) return; // Dead, don't try to regen
    if (!bot.canUse('use_hp')) return; // Can't use yet

    const missingHP = bot.max_hp - bot.hp;
    const missingMP = bot.max_mp - bot.mp;

    if (missingHP === 0 && missingMP === 0) return; // We have full HP and MP

    let bestHpGain = Math.min(bot.G.skills.regen_hp.output ?? 50, missingHP); // If we use `regen_hp` skill
    let bestHpSource: ItemName | 'regen_hp' = 'regen_hp';
    let bestMpGain = Math.min(bot.G.skills.regen_mp.output ?? 100, missingMP); // If we use `regen_mp` skill
    let bestMpSource: ItemName | 'regen_mp' = 'regen_mp';
    let bestCombinedGain = Math.max(bestHpGain, bestMpGain);
    let bestCombinedSource: ItemName | undefined = undefined;

    const hpRatio = bot.hp / bot.max_hp;
    const mpRatio = bot.mp / bot.max_mp;

    if (bot.c.town || bot.c.fishing || bot.c.mining || bot.c.pickpocket) {
      // Channeled skills will stop channelling if you use a potion
      if (hpRatio <= mpRatio) return bot.regenHP();
      else return bot.regenMP();
    }

    for (const potion of this.options.potionsToUse) {
      const itemData = bot.G.items[potion];
      if (!itemData?.gives) continue; // It's missing give information!?
      if (!bot.hasItem(potion)) continue; // We don't have any
      let hpGain = 0;
      let mpGain = 0;
      for (const [stat, amount] of itemData.gives) {
        if (stat === 'hp') hpGain += Math.max(0, Math.min(amount, missingHP));
        else if (stat === 'mp') mpGain += Math.max(0, Math.min(amount, missingMP));
      }
      if (hpGain > bestHpGain) {
        bestHpGain = hpGain;
        bestHpSource = potion;
      }
      if (mpGain > bestMpGain) {
        bestMpGain = mpGain;
        bestMpSource = potion;
      }
      const combinedGain = hpGain + mpGain;
      if (combinedGain > bestCombinedGain) {
        bestCombinedGain = combinedGain;
        bestCombinedSource = potion;
      }
    }

    if (Math.abs(hpRatio - mpRatio) < 0.25) {
      // Our ratios are pretty similar, prefer both
      if (bestCombinedSource) return this.useFromSmallestStack(bot, bestCombinedSource);
    }

    if (hpRatio <= mpRatio) {
      // HP ratio is the same, or lower than the MP ratio, prefer HP
      if (bestHpSource === 'regen_hp') return bot.regenHP();
      else return this.useFromSmallestStack(bot, bestHpSource);
    }

    // MP ratio is lower, prefer MP
    if (bestMpSource === 'regen_mp') return bot.regenMP();
    else return this.useFromSmallestStack(bot, bestMpSource);
  }

  protected getRegenDelay(bot: BotType): number {
    const cooldown = bot.getCooldown('use_hp');
    if (cooldown > 0) return Math.max(50, cooldown);
    return 250; // Not on cooldown (we probably have full MP & HP)
  }

  /**
   * Returns the quantity of the potions we have the least of.
   * Only considers the potions we want to buy.
   */
  protected getLowestPotionToBuyCount(bot: BotType): number {
    return Math.min(9999, ...this.options.potionsToBuy.map((p) => bot.countItem(p)));
  }

  /**
   * Uses the potion from the stack with the fewest items
   */
  protected useFromSmallestStack(bot: BotType, potion: ItemName) {
    return bot.usePotion(bot.locateItem(potion, bot.items, { returnLowestQuantity: true }));
  }
}
