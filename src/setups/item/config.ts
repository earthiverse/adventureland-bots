import type { Character } from "alclient";
import {
  getCraftableItems,
  getItemDescription,
  wantToDestroy,
  wantToList,
  wantToMail,
  wantToReplenish,
  wantToSell,
} from "../../utilities/items.js";
import { Level, log, logDebug } from "../../utilities/logging.js";

const CHECK_EVERY_MS = 1000;
const DESTROY_LOG_LEVEL = Level.Notice;
const SELL_LOG_LEVEL = Level.Notice;

const active = new Set<Character>();

/**
 * Starts the item logic for the given character
 * @param character
 */
export const setup = (character: Character) => {
  active.add(character);

  /**
   * For buying, selling, destroying, listing, mailing items
   */
  const itemLoop = async () => {
    if (!active.has(character)) return;

    try {
      if (character.socket.disconnected) return;

      for (let index = 0; index < character.items.length; index++) {
        const item = character.items[index];
        if (!item) continue;

        try {
          const numToReplenish = wantToReplenish(character, item);
          if (numToReplenish) {
            await character.buy(item.name, numToReplenish);
          }

          if (wantToDestroy(item)) {
            await character.destroy(index);
            log(`${character.id} destroyed ${getItemDescription(item)}`, DESTROY_LOG_LEVEL);
          }

          const listPrice = wantToList(item, character.game.G);
          if (listPrice !== false) {
            // TODO: List
          }

          if (wantToMail(item)) {
            // TODO: Mail
          }

          if (wantToSell(item, character.game.G)) {
            await character.sell(index, item.q ?? 1);
            log(`${character.id} sold ${getItemDescription(item)} to NPC`, SELL_LOG_LEVEL);
          }
        } catch (e) {
          if (e instanceof Error || typeof e === "string") logDebug(e);
        }
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(e);
    } finally {
      setTimeout(() => void itemLoop(), CHECK_EVERY_MS);
    }
  };
  void itemLoop();

  const craftLoop = async () => {
    if (!active.has(character)) return;

    try {
      if (character.socket.disconnected) return;

      for (const [itemName, itemIndexes] of getCraftableItems(character.items, character.game.G)) {
        const gCraft = character.game.G.craft[itemName];
        if (!gCraft) continue; // Uncraftable
        if (gCraft.cost > character.gold) continue; // Not enough gold

        // TODO: Craft item
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(e);
    } finally {
      setTimeout(() => void craftLoop(), CHECK_EVERY_MS);
    }
  };
  void craftLoop();

  // TODO: exchangeLoop

  // TODO: upgradeLoop

  // TODO: compoundLoop
};

/**
 * Stops the item loop for the given character
 * @param character
 */
export function teardown(character: Character) {
  active.delete(character);
}
