import type { PingCompensatedCharacter } from 'alclient';

/**
 * One loop will be run for each LoopName in the Strategy.
 * Loops run in parallel.
 */
export type LoopName = 'attack' | 'item' | 'loot' | 'move' | 'party' | 'regen';

/**
 * Loop definition for a Strategy
 */
export interface LoopDefinition<BotType extends PingCompensatedCharacter> {
  /**
   * Logic to run in the loop.
   * If `false`, we will skip running lower priority functions in the loop.
   */
  fn: (bot: BotType) => Promise<false | void>;

  /**
   * Returns ms to wait before running the loop again.
   */
  getDelay: (bot: BotType) => number;
}
