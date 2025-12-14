import type { Character } from "alclient";
import {
  getCraftableItems,
  getItemDescription,
  wantToDestroy,
  wantToExchange,
  wantToList,
  wantToMail,
  wantToReplenish,
  wantToSell,
} from "../../utilities/items.js";
import { Level, log, logDebug } from "../../utilities/logging.js";

const CHECK_EVERY_MS = 1000;
const CRAFT_LOG_LEVEL = Level.Notice;
const DESTROY_LOG_LEVEL = Level.Notice;
const SELL_LOG_LEVEL = Level.Notice;

type ActiveData = {
  cancelled: boolean;
};
const active = new Map<Character, ActiveData>();

/**
 * Starts the item logic for the given character
 * @param character
 */
export const setup = (character: Character) => {
  // Cancel any existing item logic for this character
  if (active.has(character)) active.get(character)!.cancelled = true;

  const activeData: ActiveData = { cancelled: false };
  active.set(character, activeData);

  /**
   * For buying, selling, destroying, listing, mailing items
   */
  const itemLoop = async () => {
    if (activeData.cancelled) return;

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
          if (e instanceof Error || typeof e === "string") logDebug(`itemLoop: ${e}`);
        }
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`itemLoop: ${e}`);
    } finally {
      setTimeout(() => void itemLoop(), CHECK_EVERY_MS);
    }
  };
  void itemLoop();

  const craftLoop = async () => {
    if (activeData.cancelled) return;

    try {
      if (character.socket.disconnected) return;

      for (const [itemName, itemIndexes] of getCraftableItems(character.items, character.game.G)) {
        const gCraft = character.game.G.craft[itemName];
        if (!gCraft) continue; // Uncraftable
        if (gCraft.cost > character.gold) continue; // Not enough gold
        // TODO: Add buying logic for missing items
        if (itemIndexes.some((i) => i === "npc")) continue; // Can't craft unless we buy the item from an NPC
        log(`${character.id} crafting ${itemName}...`, CRAFT_LOG_LEVEL);
        await character.craft(itemName, itemIndexes as number[]);
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`craftLoop: ${e}`);
    } finally {
      setTimeout(() => void craftLoop(), CHECK_EVERY_MS);
    }
  };
  void craftLoop();

  const exchangeLoop = async () => {
    if (activeData.cancelled) return;
    let checkMs = CHECK_EVERY_MS;

    try {
      if (character.socket.disconnected) return;
      if (character.q.exchange) {
        checkMs = character.q.exchange.ms;
        return; // Already exchanging
      }

      for (let index = 0; index < character.items.length; index++) {
        const item = character.items[index];
        if (!item) continue;
        if (!wantToExchange(item, character.esize, character.game.G)) continue;

        await character.exchange(index);
        return;
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`exchangeLoop: ${e}`);
    } finally {
      setTimeout(() => void exchangeLoop(), checkMs);
    }
  };
  void exchangeLoop();

  // TODO: upgradeLoop

  // TODO: compoundLoop
};

/**
 * Stops the item logic for the given character
 * @param character
 */
export function teardown(character: Character) {
  if (active.has(character)) active.get(character)!.cancelled = true;
  active.delete(character);
}
