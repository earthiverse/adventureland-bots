import { Character } from "alclient";
import type { GData, ItemInfo } from "typed-adventureland";
import Config from "../../config/items.js";

/**
 * Returns how much gold you would get if you sold the item to an NPC
 * @param g
 * @param item
 * @returns
 */
export function calculateNpcBuyPrice(item: ItemInfo, g: GData): number {
  if (item.gift) return 1;

  const gItem = g.items[item.name];
  let value = gItem.g * g.multipliers.buy_to_sell;

  if (gItem.markup) value /= gItem.markup;
  if (item.expires) value /= 8;
  if (item.level) {
    // TODO: Finish this
    throw new Error("TODO: Finish this");
  }
  return value;
}

/**
 * @param character
 * @param item
 * @returns true if we want to hold the item on the character
 */
export function wantToHold(character: Character, item: ItemInfo): boolean {
  if (item.l) return true;

  const config = Config[item.name];
  if (!config || config.action !== "hold") return false; // We have no hold config for this item
  if (config.characterTypes === "all") return true; // We want all classes to hold this item
  return config.characterTypes.includes(character.ctype);
}

/**
 * @param item
 * @returns true if we want to list the item for sale
 */
export function wantToList(item: ItemInfo): boolean {
  if (item.l) return false; // We can't list locked items

  const config = Config[item.name];
  if (!config || config.action !== "list") return false; // We have no list config for this item
  if (item.p && !config.specialMultiplier) return false; // We don't want to list special items

  return true;
}

/**
 * @param item
 * @returns true if we want to mail the item
 */
export function wantToMail(item: ItemInfo): boolean {
  if (item.l) return false; // We can't mail locked items

  const config = Config[item.name];
  if (!config || config.action !== "mail") return false; // We have no mail config for this item
  if (item.p && !config.mailSpecial) return false; // We don't want to mail special items

  return true;
}

/**
 * @param item
 * @param atPrice the price we are checking if we want to sell at
 * @returns true if we want to sell the item
 */
export function wantToSell(item: ItemInfo, atPrice?: number | "npc"): boolean {
  if (item.l) return false; // We can't sell locked items

  const config = Config[item.name];
  if (!config || config.action !== "sell") return false; // We have no sell config for this item
  if (item.p && !config.specialMultiplier) return false; // We don't want to sell special items

  // TODO: Finish this
  throw new Error("TODO: Finish this");

  //   if (atPrice !== undefined) {
  //     // const price = config.sellPrice === "npc" ?
  //     if (atPrice === "npc" && config.sellPrice !== "npc") return false; // We want more than what the NPC buys it for

  //     if (config.sellPrice < atPrice) return false; // We want more for it
  //   }

  //   return true;
}
