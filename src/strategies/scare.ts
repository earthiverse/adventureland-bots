import type { PingCompensatedCharacter } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export interface ScareStrategyOptions {
  condition: (bot: PingCompensatedCharacter) => boolean;

  /** If set, we will prevent attacking if we can't use scare */
  blockAttackIfCantUse?: boolean | undefined;
}

// TODO: Add equipping logic

export class ScareStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    attack: {
      fn: (bot) => this.scare(bot),
      getDelay: () => 100,
    },
  };

  public readonly priority = 10_000;

  public constructor(protected options: ScareStrategyOptions) {}

  protected async scare(bot: BotType): Promise<void | false> {
    if (!bot.canUse('scare')) return this.options.blockAttackIfCantUse ? false : undefined; // Can't scare
    if (!bot.targets) return; // Scare won't do anything
    if (!this.options.condition(bot)) return; // Don't want to scare

    await bot.scare();
    return false;
  }
}
