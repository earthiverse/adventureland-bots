import { type HitData, Pathfinder, type PingCompensatedCharacter } from 'alclient';

import { state } from '@/state/state';
import type { Strategy, StrategyLoops } from '@/types/strategy';

export interface AvoidStackingStrategyOptions {
  /**
   * Distance threshold to consider entities stacked.
   * Defaults to 10.
   */
  distance?: number;
}

export class AvoidStackingStrategy<
  BotType extends PingCompensatedCharacter = PingCompensatedCharacter,
> implements Strategy<BotType> {
  public readonly priority = -10;

  protected readonly onHitListeners = new Map<string, (data: HitData) => Promise<void>>();

  public readonly loops: StrategyLoops<BotType> = {
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 250,
    },
  };

  public constructor(protected options: AvoidStackingStrategyOptions = {}) {}

  protected async move(bot: BotType): Promise<false | void> {
    if (bot.isDisabled() || bot.moving || bot.smartMoving) return; // Can't move, or already moving

    const withinRange = this.options.distance ?? 10;
    const players = bot.getPlayers({ isDead: false, withinRange });
    if (players.length === 0) return; // Nobody else is near

    // If the other player is one we control, it should move itself if it has the same strategy
    const other = players[0]!;
    if (state.bots.some((b) => b.id === other.id) && bot.id <= other.id) return;

    await this.avoid(bot);
    return false;
  }

  protected async avoid(bot: BotType): Promise<void> {
    for (let index = 0; index < 5; index++) {
      // eslint-disable-next-line sonarjs/pseudo-random
      const x = -25 + Math.round(50 * Math.random());
      // eslint-disable-next-line sonarjs/pseudo-random
      const y = -25 + Math.round(50 * Math.random());
      const destination = { map: bot.map, x: bot.x + x, y: bot.y + y };
      if (Pathfinder.canStand(destination)) {
        try {
          await bot.move(destination.x, destination.y);
          return;
        } catch {
          // Ignore move failure and try another offset
        }
      }
    }
  }

  public onApply(bot: BotType): void {
    const onHit = async (data: HitData): Promise<void> => {
      if (data.id !== bot.id) return; // Not us
      if (!data.stacked?.includes(bot.id)) return; // Not stacked
      if (bot.isDisabled() || bot.moving || bot.smartMoving) return; // Can't move, or already moving

      await this.avoid(bot);
    };

    this.onHitListeners.set(bot.id, onHit);
    bot.socket.on('hit', onHit);
  }

  public onRemove(bot: BotType): void {
    const onHit = this.onHitListeners.get(bot.id);
    if (!onHit) return;

    bot.socket.off('hit', onHit);
    this.onHitListeners.delete(bot.id);
  }
}
