import type { PingCompensatedCharacter } from 'alclient';

import type { LoopDefinition, LoopName } from '@/types/loops';

export type StrategyLoops<BotType extends PingCompensatedCharacter = PingCompensatedCharacter> = Partial<
  Record<LoopName, LoopDefinition<BotType>>
>;

export interface Strategy<BotType extends PingCompensatedCharacter = PingCompensatedCharacter> {
  /**
   * Priority of the strategy. Higher priority strategies will be executed first.
   * Defaults to 0 if not specified.
   */
  priority?: number;

  /**
   * Loops that this strategy will run.
   * Each loop has its own fn and delay.
   */
  loops?: StrategyLoops<BotType>;

  /**
   * Callend when the strategy is applied to a bot.
   * Can be used to perform any necessary actions before the loops start running.
   */
  onApply?: (bot: BotType) => Promise<void>;

  /**
   * Callend when the strategy is removed from a bot.
   * Can be used to perform any necessary cleanup after the loops stop running.
   */
  onRemove?: (bot: BotType) => Promise<void>;
}
