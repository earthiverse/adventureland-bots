import { Constants, type PingCompensatedCharacter, Tools } from 'alclient';

import { DEFAULT_ITEMS_CONFIG } from '@/config/items';
import { state } from '@/state/state';
import type { ItemsConfig } from '@/types/items';
import type { Strategy, StrategyLoops } from '@/types/strategy';
import { shouldHold } from '@/utils/items/checks';

export interface ItemStrategyOptions {
  config?: ItemsConfig | undefined;
}

export class ItemStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  protected readonly options: Required<ItemStrategyOptions>;
  public readonly priority = 60;

  public readonly loops: StrategyLoops<BotType> = {
    item: {
      fn: (bot) => this.processItems(bot),
      getDelay: () => 1000,
    },
  };

  public constructor(options: ItemStrategyOptions = {}) {
    this.options = { config: DEFAULT_ITEMS_CONFIG, ...options };
  }

  protected async processItems(bot: BotType): Promise<void> {
    await this.stackInventory(bot);
    await this.stackWithNearby(bot);

    // TODO: Upgrade

    // TODO: Compound

    // TODO: More things
  }

  /** Stacks items within own inventory */
  protected async stackInventory(bot: BotType): Promise<void> {
    for (let i = 0; i < bot.isize - 1; i++) {
      const item = bot.items[i];
      if (!item) continue; // No item
      if (!item.q) continue; // Not stackable

      const gItem = bot.G.items[item.name];

      for (let j = i + 1; j < bot.isize; j++) {
        const item2 = bot.items[j];
        if (!item2) continue; // No item
        if (!item2.q) continue; // Not stackable

        if (item.name !== item2.name) continue; // Different item
        if (item.p !== item2.p) continue; // Different title
        if (!!item.v !== !!item2.v) continue; // One is PVP marked, and the other isn't

        if (item.q + item2.q > gItem.s!) continue; // Too many to stack

        try {
          await bot.swapItems(j, i);
          break;
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  /** Stacks items across bots */
  protected async stackWithNearby(bot: BotType): Promise<void> {
    const friends = state.getBotsByOwner(bot.owner).toSorted((a, b) => a.id.localeCompare(b.id));
    for (const friend of friends) {
      if (!friend.ready) continue; // Not ready
      if (friend.id >= bot.id) continue; // Prevent circular transfers
      if (friend.serverData.name !== bot.serverData.name || friend.serverData.region !== bot.serverData.region)
        continue; // Different server
      if (Tools.distance(bot, friend) > Constants.NPC_INTERACTION_DISTANCE) continue; // Too far

      for (let i = 0; i < bot.isize; i++) {
        const item = bot.items[i];
        if (!item) continue; // No item
        if (!item.q) continue; // Not stackable

        if (shouldHold(item, bot.ctype, this.options.config)) continue; // Want to hold

        const gItem = bot.G.items[item.name];

        for (let j = 0; j < friend.isize; j++) {
          const item2 = friend.items[j];
          if (!item2) continue; // No item
          if (!item2.q) continue; // Not stackable

          if (item.name !== item2.name) continue; // Different item
          if (item.p !== item2.p) continue; // Different title
          if (!!item.v !== !!item2.v) continue; // One is PVP marked, and the other isn't

          if (item.q + item2.q > gItem.s!) continue; // Too many to stack

          try {
            await bot.sendItem(friend.id, i, item.q);
            break;
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }
}
