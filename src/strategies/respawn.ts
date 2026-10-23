import type { PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

// TODO: Should we put this at a high priority,
//       and have a move / attack loop hooks that return `false` if dead?

export class RespawnStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    move: {
      fn: (bot) => this.respawn(bot),
      getDelay: () => 1000,
    },
  };
  public readonly priority = -100;

  public constructor() {}

  protected async respawn(bot: BotType): Promise<void> {
    if (!bot.rip) return; // Not dead

    // TODO: Logic if we can respawn or not

    await bot.respawn();
  }
}
