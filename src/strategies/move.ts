import { type MonsterName, type PingCompensatedCharacter, Tools } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { noop } from '@/utils/noop';

import { IGNORED_MONSTERS } from './attack';

export interface MoveStrategyOptions {
  targetType: MonsterName;
}

export class MoveStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 250,
    },
  };

  public constructor(protected options: MoveStrategyOptions) {}

  protected async move(bot: BotType): Promise<void> {
    if (bot.isDisabled()) return;

    // Target nearest entity
    const target = bot.getEntity({
      ignoreIDs: [...IGNORED_MONSTERS.keys()],
      type: this.options.targetType,
      returnNearest: true,
    });
    if (!target) {
      // Move to spawn
      await bot.smartMove(this.options.targetType, { getWithin: 50 });
      return;
    }

    const distance = Tools.distance(bot, target);
    if (distance > bot.range - 25) {
      bot.smartMove(target, { getWithin: bot.range - 25 }).catch(noop);
    }
  }
}
