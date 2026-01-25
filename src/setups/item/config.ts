import { Utilities, type Character } from "alclient";
import type { ItemKey } from "typed-adventureland";
import Config from "../../../config/items.js";
import {
  getCraftableItems,
  getItemDescription,
  getNextUpgradeParams,
  wantToDestroy,
  wantToExchange,
  wantToList,
  wantToMail,
  wantToMakeShiny,
  wantToReplenish,
  wantToSell,
  wantToUpgrade,
} from "../../utilities/items.js";
import { Level, log, logDebug, logError } from "../../utilities/logging.js";

// TODO: Move these to config
const CHECK_EVERY_MS = 1000;
const BUY_LOG_LEVEL = Level.Informational;
const CRAFT_LOG_LEVEL = Level.Notice;
const DESTROY_LOG_LEVEL = Level.Notice;
const EXCHANGE_LOG_LEVEL = Level.Informational;
const SELL_LOG_LEVEL = Level.Notice;
const UPGRADE_LOG_LEVEL = Level.Notice;

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

  // TODO: merchantLoop
  // for buying, selling, & joining giveaways

  /**
   * For buying (NPC), selling (NPC), destroying, listing, mailing items
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
          if (numToReplenish !== false) {
            if (numToReplenish > 0) {
              // TODO: Buy as many as we can if we can't buy all
              await character.buy(item.name, numToReplenish);
              log(`${character.id} bought ${numToReplenish} ${getItemDescription(item)}`, BUY_LOG_LEVEL);
            }
            continue;
          }

          if (wantToDestroy(character, item)) {
            await character.destroy(index);
            log(`${character.id} destroyed ${getItemDescription(item)}`, DESTROY_LOG_LEVEL);
            continue;
          }

          const listPrice = wantToList(item, character.game.G);
          if (listPrice !== false) {
            // TODO: List
            continue;
          }

          if (wantToMail(item)) {
            // TODO: Mail
            continue;
          }

          if (wantToSell(item, character.game.G)) {
            if (character.canSell()) {
              await character.sell(index, item.q ?? 1);
              log(`${character.id} sold ${getItemDescription(item)} to NPC`, SELL_LOG_LEVEL);
            }
            continue;
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
        await character.craft(itemName, itemIndexes as number[]);
        log(`${character.id} crafted ${itemName}`, CRAFT_LOG_LEVEL);
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
        log(`${character.id} exchanged ${getItemDescription(item)}`, EXCHANGE_LOG_LEVEL);
        return;
      }
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`exchangeLoop: ${e}`);
    } finally {
      setTimeout(() => void exchangeLoop(), checkMs);
    }
  };
  void exchangeLoop();

  const upgradeLoop = async () => {
    if (activeData.cancelled) return;
    let checkMs = CHECK_EVERY_MS;

    try {
      if (character.socket.disconnected) return;
      if (character.q.upgrade) {
        checkMs = character.q.upgrade.ms;
        return; // Already upgrading
      }

      for (let itemPos = 0; itemPos < character.items.length; itemPos++) {
        const item = character.items[itemPos];
        if (!item) continue; // No item in this slot

        if (wantToMakeShiny(item)) {
          const grade = Utilities.getItemGrade(item, character.game.G);
          // TODO: Move this logic to wantToMakeShiny
          let offering: ItemKey;
          switch (grade) {
            case 0:
              offering = "bronzeingot";
              break;
            case 1:
              offering = "goldingot";
              break;
            case 2:
              offering = "platinumingot";
              break;
            default:
              // NOTE: Higher grades are currently not possible to make shiny
              //       (But I don't think any currently exist in the game, either)
              continue;
            case undefined:
              // TODO: This should be a function in the adjust file instead
              logError(`${item.name} has no grade, but itemConfig.makeShinyBeforeUpgrading is set`);
              delete Config[item.name]?.upgrade?.makeShinyBeforeUpgrading;
              continue;
          }

          const offeringPos = character.locateItem({ name: offering });
          if (offeringPos === undefined) continue;
          // TODO: Log wether it succeeded or failed
          await character.upgrade(itemPos, undefined, offeringPos);
          log(
            `${character.id} used ${offering} to attempt to make ${getItemDescription(item)} shiny`,
            UPGRADE_LOG_LEVEL,
          );
          return;
        }

        if (!wantToUpgrade(item, character.game.G)) continue; // No item to upgrade
        if (!character.canUpgrade()) continue; // Can't upgrade

        // TODO: Lucky slot logic

        // Calculate best upgrade
        const nextUpgrade = await getNextUpgradeParams(character, itemPos, character.game.G);
        if (nextUpgrade === undefined) continue;
        const scrollPos =
          nextUpgrade.scroll !== undefined ? (character.locateItem({ name: nextUpgrade.scroll }) ?? false) : undefined;
        const offeringPos =
          nextUpgrade.offering !== undefined
            ? (character.locateItem({ name: nextUpgrade.offering }) ?? false)
            : undefined;

        if (scrollPos === false || offeringPos === false) continue; // We don't have what we want to upgrade

        // TODO: Log wether it succeeded or failed
        await character.upgrade(itemPos, scrollPos, offeringPos);
        log(`${character.id} upgraded ${getItemDescription(item)}`, EXCHANGE_LOG_LEVEL);
        return;
      }

      checkMs = 10_000; // Didn't find anything to upgrade
    } catch (e) {
      if (e instanceof Error || typeof e === "string") logDebug(`upgradeLoop: ${e}`);
    } finally {
      setTimeout(() => void upgradeLoop(), checkMs);
    }
  };
  void upgradeLoop();

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
