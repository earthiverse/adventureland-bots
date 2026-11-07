import { Tools } from 'alclient';

import type { TargetPrioritizer } from '@/types/targeting';

/**
 * Default entity prioritization for combat targeting.
 */
export const defaultPrioritization: TargetPrioritizer = (bot) => (a, b) => {
  // Prioritize monsters that can't burn to death
  const aWillBurn = a.couldBurnToDeath();
  const bWillBurn = b.couldBurnToDeath();
  if (aWillBurn && !bWillBurn) return 1;
  if (!aWillBurn && bWillBurn) return -1;

  // Prioritize monsters that aren't guaranteed to die to projectiles
  const aCouldDie = a.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities);
  const bCouldDie = b.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities);
  if (aCouldDie && !bCouldDie) return 1;
  if (!aCouldDie && bCouldDie) return -1;

  // Prioritize monsters with a target
  if (a.target && !b.target) return -1;
  // eslint-disable-next-line unicorn/prefer-ternary
  if (!a.target && b.target) return 1;

  // Prioritize monsters with lower HP
  return a.hp - b.hp;
};

/**
 * Entity prioritization based purely on furthest distance from the bot.
 */
export const furthestPrioritization: TargetPrioritizer = (bot) => (a, b) => {
  return Tools.distance(bot, b) - Tools.distance(bot, a);
};
