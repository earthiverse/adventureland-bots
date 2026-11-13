import type { MonsterName, PingCompensatedCharacter } from 'alclient';

/**
 * Checks whether a character can attack without triggering physical damage return (dreturn).
 */
export function canAvoidDreturn(bot: Pick<PingCompensatedCharacter, 'damage_type' | 'range'>): boolean {
  return bot.damage_type !== 'physical' || bot.range >= 75;
}

export function canKite(
  bot: Pick<PingCompensatedCharacter, 'G' | 'speed' | 'range'>,
  monsterName: MonsterName,
): boolean {
  const gMonster = bot.G.monsters[monsterName];
  return bot.range > gMonster.range && bot.speed > (gMonster.charge ?? gMonster.speed);
}
