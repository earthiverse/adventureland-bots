import { type DoorInfo, type IPosition, type MapName, type PingCompensatedCharacter, Tools } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { ignoreErrors } from '@/utils/errors';

export interface CheeseDoorMoveStrategyOptions {
  /** Location near a door to  */
  location: IPosition & { map: MapName };
}

/**
 * A strategy for moving to a door and moving through it when a monster is targeting the bot.
 * We will get a small cooldown penalty every time we enter through the door, but we should be able to kill it eventually.
 */
export class CheeseDoorMoveStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 100,
    },
  };

  public constructor(protected options: CheeseDoorMoveStrategyOptions) {}

  protected doorMap: MapName | undefined;
  protected doorSpawn: number | undefined;

  protected async move(bot: BotType): Promise<void> {
    if (bot.isDisabled()) return;

    // Go to the location if we're not near
    if (Tools.distance(bot, this.options.location) > 1) await ignoreErrors(bot.smartMove(this.options.location));

    const nearestEntity = bot.getEntity({ returnNearest: true, targetingMe: true, willDieToProjectiles: false });
    if (!nearestEntity) return;

    if (Tools.distance(bot, nearestEntity) <= nearestEntity.range + nearestEntity.charge * ((bot.ping * 2) / 1000)) {
      // We are in danger, go through the door
      await bot.transport(this.doorMap!, this.doorSpawn!);
    }
  }

  public onApply(bot: BotType): void {
    if (typeof this.doorMap === 'string') return; // Already found

    const gMap = bot.G.maps[this.options.location.map];
    let closest: DoorInfo | undefined;
    let closestDistanceSq = Infinity;
    for (const door of gMap.doors) {
      const dx = this.options.location.x - door[0];
      const dy = this.options.location.y - door[1];
      const distSq = dx * dx + dy * dy;
      if (distSq < closestDistanceSq) {
        closest = door;
        closestDistanceSq = distSq;
      }
    }

    if (closest === undefined || closestDistanceSq > 2500)
      throw new Error(
        `No door found within 50 units of (${this.options.location.x}, ${this.options.location.y}) on map ${this.options.location.map}`,
      );

    this.doorMap = closest[4] as MapName;
    this.doorSpawn = closest[5];
  }
}
