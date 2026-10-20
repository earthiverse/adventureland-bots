import { Constants, type PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export class MonsterHuntStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    attack: {
      fn: (bot) => this.attack(bot),
      getDelay: () => 1000,
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
    if (bot.s.monsterhunt && bot.s.monsterhunt.c > 0) return; // We're not traveling to the monster hunter

    if (bot.canUse('scare')) {
      await bot.scare();
      return;
    }

    if (bot.canUse('scare', { ignoreEquipped: true })) {
      const jackoSlot = bot.locateItem('jacko');
      if (jackoSlot !== undefined) {
        await bot.equip(jackoSlot);
      }
    }
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
