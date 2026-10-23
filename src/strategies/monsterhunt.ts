import { Constants, type PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export class MonsterHuntStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    attack: {
      fn: (bot) => this.attack(bot),
      getDelay: (bot) => this.getAttackDelay(bot),
    },
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 1000,
    },
  };
  public readonly priority = 100;

  public constructor() {}

  protected async attack(bot: BotType): Promise<false | void> {
    if (!bot.isScared()) return;
    if (bot.isOnCooldown('scare')) return;
    if (bot.s.monsterhunt && bot.s.monsterhunt.c > 0) return; // We're not traveling to the monster hunter

    if (bot.canUse('scare')) {
      await bot.scare();
      return;
    }

    // Equip jacko if we need
    if (bot.slots.orb?.name === 'jacko') return false;
    const jackoSlot = bot.locateItem('jacko');
    if (jackoSlot === undefined) return;
    await bot.equip(jackoSlot);
    return false;
  }

  protected getAttackDelay(bot: BotType): number {
    const cooldown = bot.getCooldown('scare');
    return cooldown > 0 ? Math.max(50, cooldown) : 1000;
  }

  protected async move(bot: BotType): Promise<false | void> {
    if (bot.s.monsterhunt && bot.s.monsterhunt.c <= 0) {
      // Go turn in monster hunt
      try {
        await bot.smartMove('monsterhunter', { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 });
        await bot.finishMonsterHuntQuest();
      } catch {
        return false;
      }
    }

    if (!bot.s.monsterhunt) {
      // Go get a monster hunt
      try {
        await bot.smartMove('monsterhunter', { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 });
        await bot.getMonsterHuntQuest();
      } catch {
        return false;
      }
    }
  }
}
