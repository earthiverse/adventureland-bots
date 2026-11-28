import { Constants, type MonsterName, type PingCompensatedCharacter } from 'alclient';

import { botsConfig } from '@/config/bots';
import { state } from '@/state/state';

export interface PriorityOptions {
  typeList?: MonsterName[];
}

export function getPriority(bots: PingCompensatedCharacter[], options: PriorityOptions = {}): number {
  let priority = 0;

  // Increase priority if it's the primary default monster
  const primaryDefault = botsConfig.defaultMonsters[0];
  if (primaryDefault && options.typeList?.includes(primaryDefault)) priority += 10;

  // Increase priority if it's a special monster and one of our party members can see it
  if (
    options.typeList?.some((t) => Constants.SPECIAL_MONSTERS_SET.has(t)) &&
    bots.some((bot) => bot.getEntities({ typeList: options.typeList }).length > 0)
  ) {
    priority += 1000;
  }

  // Increase priority if we're doing a monster hunt
  if (botsConfig.flags.enableMonsterHunts && options.typeList?.length) {
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
