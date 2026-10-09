import { Constants, type PingCompensatedCharacter, Tools } from 'alclient';
import { LRUCache } from 'lru-cache/raw';

import { state } from '@/state/state';
import type { Strategy, StrategyLoops } from '@/types/strategy';

const LOOTED_CHESTS = new LRUCache<string, true>({
  max: 500,
  ttl: 10_000,
});

export class LootStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    loot: {
      fn: (bot) => this.loot(bot),
      getDelay: () => 250,
    },
  };

  public constructor() {}

  protected async loot(bot: BotType): Promise<void> {
    for (const chest of bot.chests.values()) {
      if (LOOTED_CHESTS.has(chest.id)) continue; // Another character is looting

      // Get the best nearby looter
      const bestNearbyLooter = state
        .getBotsByOwner(bot.owner)
        .filter(
          (c) =>
            c.ready &&
            c.serverData.region === bot.serverData.region &&
            c.serverData.name === bot.serverData.name &&
            Tools.distance(c, chest) <= Constants.NPC_INTERACTION_DISTANCE,
        )
        .sort((a, b) => b.goldm - a.goldm)[0];
      if (!bestNearbyLooter) continue;

      LOOTED_CHESTS.set(chest.id, true);
      bestNearbyLooter.openChest(chest.id).catch(() => LOOTED_CHESTS.delete(chest.id));
    }
  }
}
