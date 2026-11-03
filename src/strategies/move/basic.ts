import { type MonsterName, Pathfinder, type PingCompensatedCharacter, Tools } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { ignoreErrors } from '@/utils/errors';

import { IGNORED_MONSTERS } from '../attack';

export interface MoveStrategyOptions {
  type?: MonsterName;
  typeList?: MonsterName[];
}

export class BasicMoveStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
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
      type: this.options.type,
      typeList: this.options.typeList,
      returnNearest: true,
    });
    if (!target) {
      // Move to spawn
      const spawnMonster = this.options.type ?? this.options.typeList?.[0];
      if (spawnMonster) {
        await ignoreErrors(bot.smartMove(spawnMonster, { getWithin: 50 }));
      }
      return;
    }

    const distance = Tools.distance(bot, target);
    if (distance <= bot.range - 25) return; // Already close

    if (Pathfinder.canWalkPath(bot, target)) {
      if (bot.smartMoving) void ignoreErrors(bot.stopSmartMove());
      void ignoreErrors(bot.move(target.x, target.y));
      return;
    }

    if (!bot.smartMoving) void ignoreErrors(bot.smartMove(target, { getWithin: bot.range - 25 }));
  }

  public onRemove(bot: BotType): void {
    if (!bot.smartMoving) return;
    void ignoreErrors(bot.stopSmartMove());
  }
}
