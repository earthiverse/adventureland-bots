import { type IPosition, type MapName, type PingCompensatedCharacter, Tools } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { ignoreErrors } from '@/utils/errors';

export interface HoldPositionMoveStrategyOptions {
  /** Location to move to  */
  location: IPosition & { map: MapName };
}

/**
 * A strategy for moving to a door and moving through it when a monster is targeting the bot.
 * We will get a small cooldown penalty every time we enter through the door, but we should be able to kill it eventually.
 */
export class HoldPositionMoveStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    move: {
      fn: (bot) => this.move(bot),
      getDelay: () => 1000,
    },
  };

  public constructor(protected options: HoldPositionMoveStrategyOptions) {}

  protected async move(bot: BotType): Promise<void> {
    if (bot.isDisabled()) return;

    // Go to the location if we're not near
    if (Tools.distance(bot, this.options.location) > 1) await ignoreErrors(bot.smartMove(this.options.location));
  }
}
