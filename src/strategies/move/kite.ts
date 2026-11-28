import { type Entity, type MonsterName, Pathfinder, type PingCompensatedCharacter, Tools } from 'alclient';

import { IGNORED_MONSTERS } from '@/strategies/attack';
import type { Strategy, StrategyLoops } from '@/types/strategy';
import { ignoreErrors } from '@/utils/errors';
import { calculateKiteDistance, findKitePosition } from '@/utils/kiting';

export interface KiteMoveStrategyOptions {
  type?: MonsterName | undefined;
  typeList?: MonsterName[] | undefined;
  distance?: number | undefined;
  /** Distance threshold to the kite position required to trigger a move (defaults to 1). */
  moveThreshold?: number | undefined;
}

export class KiteMoveStrategy<
  BotType extends PingCompensatedCharacter = PingCompensatedCharacter,
> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 250,
    },
  };

  public constructor(protected readonly options: KiteMoveStrategyOptions = {}) {}

  protected async move(bot: BotType): Promise<void> {
    if (bot.isDisabled()) return;

    const target = this.getTarget(bot);
    if (!target) {
      const spawnMonster = this.options.type ?? this.options.typeList?.[0];
      if (spawnMonster && !bot.smartMoving) void ignoreErrors(bot.smartMove(spawnMonster, { getWithin: 50 }));
      return;
    }

    if (bot.map !== target.map) {
      if (!bot.smartMoving) {
        void ignoreErrors(
          bot.smartMove(target, {
            getWithin: Math.max(50, bot.range - 25),
            useBlink: true,
          }),
        );
      }
      return;
    }

    const kiteDistance = calculateKiteDistance(bot.range, target, this.options.distance);
    const kitePos = findKitePosition({
      botPosition: bot,
      kiteDistance,
      targetPosition: target,
    });

    if (!kitePos) {
      if (!bot.smartMoving) void ignoreErrors(bot.smartMove(target, { getWithin: bot.range - 25 }));
      return;
    }

    if (Pathfinder.canWalkPath(bot, kitePos)) {
      if (bot.smartMoving) {
        await ignoreErrors(bot.stopSmartMove());
      }

      const distance = Tools.distance(bot, kitePos);
      if (distance > (this.options.moveThreshold ?? 1)) {
        await ignoreErrors(bot.move(kitePos.x, kitePos.y, { resolveOnStart: true }));
      }
      return;
    }

    // Avoid restarting smartMove mid-corner for small shifts in kitePos
    if (!bot.smartMoving || Tools.distance(bot.smartMoving, kitePos) > Math.max(50, kiteDistance * 0.5)) {
      void ignoreErrors(
        bot.smartMove(kitePos, {
          avoidTownWarps: true,
          resolveOnFinalMoveStart: true,
        }),
      );
    }
  }

  protected getTarget(bot: BotType): Entity | undefined {
    const ignoreIDs = [...IGNORED_MONSTERS.keys()];
    const aggroTarget = bot.getEntity({
      couldGiveCredit: true,
      ignoreIDs,
      returnNearest: true,
      targetingMe: true,
      type: this.options.type,
      typeList: this.options.typeList,
    });
    if (aggroTarget) return aggroTarget;

    return bot.getEntity({
      ignoreIDs,
      returnNearest: true,
      type: this.options.type,
      typeList: this.options.typeList,
    });
  }

  public onRemove(bot: BotType): void {
    if (bot.smartMoving) {
      void ignoreErrors(bot.stopSmartMove());
    }
  }
}
