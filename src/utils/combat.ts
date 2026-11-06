import type { PingCompensatedCharacter } from 'alclient';

/**
 * Checks whether a character can attack without triggering physical damage return (dreturn).
 */
export function canAvoidDreturn(bot: Pick<PingCompensatedCharacter, 'damage_type' | 'range'>): boolean {
  return bot.damage_type !== 'physical' || bot.range >= 75;
}
