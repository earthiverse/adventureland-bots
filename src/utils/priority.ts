import { Constants, type MonsterName, type PingCompensatedCharacter } from 'alclient';

import { DEFAULT_MONSTER } from '@/config/defaults';
import { ENABLE_MONSTER_HUNTS } from '@/config/flags';
import { state } from '@/state/state';

export interface PriorityOptions {
  typeList?: MonsterName[];
}

export function getPriority(bots: PingCompensatedCharacter[], options: PriorityOptions = {}): number {
  let priority = 0;

  // Increase priority if it's a default monster
  if (options.typeList?.includes(DEFAULT_MONSTER)) priority += 10;

  // Increase priority if it's a special monster and one of our party members can see it
  if (options.typeList?.some((t) => Constants.SPECIAL_MONSTERS.includes(t))) {
    for (const bot of bots) {
      if (!bot.getEntities({ typeList: options.typeList }).length) continue;
      priority += 11;
      break;
    }
  }

  // Increase priority if we're doing a monster hunt
  if (ENABLE_MONSTER_HUNTS) {
    for (const type of options.typeList ?? []) {
      for (const bot of bots) {
        const players = bot.party ? state.getBotsByParty(bot.party) : [bot];
        for (const player of players) {
          if (!player.s.monsterhunt) continue; // No monsterhunt on this player
          if (player.s.monsterhunt.c <= 0) continue; // Monsterhunt is already complete
          if (player.s.monsterhunt.id !== type) continue; // Different type
          if (player.s.monsterhunt.sn !== `${bot.server.region} ${bot.server.name}`) continue; // Monster hunt is for a different server

          // We have a monster hunt for this monster, increase priority
          priority += player.owner === bot.owner ? 100 : 50;
        }
      }
    }
  }

  return priority;
}
