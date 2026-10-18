import type { MonsterName, PingCompensatedCharacter } from 'alclient';

import { ENABLE_MONSTER_HUNTS } from '@/config/flags';

export interface PriorityOptions {
  typeList?: MonsterName[];
}

export function getPriority(bots: PingCompensatedCharacter[], options: PriorityOptions = {}): number {
  let priority = 0;

  if (ENABLE_MONSTER_HUNTS) {
    for (const type of options.typeList ?? []) {
      for (const bot of bots) {
        if (!bot.s.monsterhunt) continue; // No monsterhunt on this bot
        if (bot.s.monsterhunt.id !== type) continue; // Different type
        if (bot.s.monsterhunt.sn !== `${bot.server.region} ${bot.server.name}`) continue; // Monster hunt is for a different server

        // We have a monster hunt for this monster, increase priority
        priority += 100;
      }
    }
  }

  return priority;
}
