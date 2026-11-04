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
  if (
    options.typeList?.some((t) => Constants.SPECIAL_MONSTERS_SET.has(t)) &&
    bots.some((bot) => bot.getEntities({ typeList: options.typeList }).length > 0)
  ) {
    priority += 1000;
  }

  // Increase priority if we're doing a monster hunt
  if (ENABLE_MONSTER_HUNTS && options.typeList?.length) {
    const types = new Set(options.typeList);

    for (const bot of bots) {
      const serverName = `${bot.server.region} ${bot.server.name}`;
      const players = bot.party ? state.getBotsByParty(bot.party) : [bot];
      for (const player of players) {
        const hunt = player.s.monsterhunt;
        if (!hunt || hunt.c <= 0) continue; // No hunt, or already finished
        if (!types.has(hunt.id)) continue; // Different type
        if (hunt.sn !== serverName) continue; // Different server

        // We have a monster hunt for this monster, increase priority
        priority += (player.owner === bot.owner ? 100 : 50) - hunt.ms / 1_800_000;
      }
    }
  }

  return priority;
}
