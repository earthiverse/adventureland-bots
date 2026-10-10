import { type PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

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

    await bot.respawn().catch(console.error);
  }
}
