import { Constants, type PingCompensatedCharacter, Tools } from 'alclient';

import { state } from '@/state/state';
import type { Strategy, StrategyLoops } from '@/types/strategy';

export class LootStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    loot: {
      fn: (bot) => this.loot(bot),
      getDelay: () => 250,
    },
  };

  public constructor() {}

  protected loot(bot: BotType): void {
    for (const chest of bot.chests.values()) {
      if (state.lootedChests.has(chest.id)) continue; // Another character is looting

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
        .toSorted((a, b) => b.goldm - a.goldm)[0];
      if (!bestNearbyLooter) continue;

      state.lootedChests.set(chest.id, true);
      void bestNearbyLooter.openChest(chest.id).catch(() => state.lootedChests.delete(chest.id));
    }
  }
}
