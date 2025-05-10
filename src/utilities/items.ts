import type { Character } from "alclient";
import type { GData, ItemInfo } from "typed-adventureland";
import Config, { type ItemConfig } from "../../config/items.js";

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

  if (gItem.markup !== undefined) value /= gItem.markup;
  if (item.expires !== undefined) value /= 8;
  if (item.level !== undefined && item.level > 0) {
    // TODO: Finish this
    throw new Error("TODO: Finish this");
  }
  return value;
}

export function getItemDescription(item: ItemInfo): string {
  let description = `${item.name}`;

  if (item.level !== undefined) {
    description = `Level ${item.level} ${description}`;
  }

  if (item.p) {
    description = `${item.p.replace(/\b\w/g, (s) => s.toUpperCase())} ${description}`;
  }

  return description;
}

export function wantToDestroy(item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't destroy locked items

  const itemConfig = config[item.name]?.destroy;
  if (!itemConfig) return false; // We have no destroy config for this item
  if (item.p && !itemConfig.destroySpecial) return false; // We don't want to destroy special items
  if (item.level !== undefined && item.level > 0) {
    if (itemConfig.destroyUpToLevel === undefined) return false; // We only want to destroy level 0 items
    if (item.level > itemConfig.destroyUpToLevel) return false; // This item is leveled higher than what we want to destroy
  }

  return true;
}

/**
 * @param character
 * @param item
 * @returns true if we want to hold the item on the character
 */
export function wantToHold(character: Character, item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return true;

  const itemConfig = config[item.name]?.hold;
  if (!itemConfig) return false; // We have no hold config for this item
  if (itemConfig.characterTypes === "all") return true; // We want all classes to hold this item
  if (!itemConfig.characterTypes.includes(character.ctype)) return false; // We don't want this class to hold this item

  return true;
}

/**
 * @param item
 * @returns true if we want to list the item for sale
 */
export function wantToList(item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't list locked items

  const itemConfig = config[item.name]?.list;
  if (!itemConfig) return false; // We have no list config for this item
  if (item.p && itemConfig.specialMultiplier === undefined) return false; // We don't want to list special items

  return true;
}

/**
 * @param item
 * @returns true if we want to mail the item
 */
export function wantToMail(item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't mail locked items

  const itemConfig = config[item.name]?.mail;
  if (!itemConfig) return false; // We have no mail config for this item
  if (item.p && !itemConfig.mailSpecial) return false; // We don't want to mail special items

  return true;
}

export function wantToReplenish(character: Character, item: ItemInfo, config = Config): number {
  if (!wantToHold(character, item)) return 0;

  const itemConfig = (config[item.name] as ItemConfig).hold;
  if (!itemConfig || itemConfig.replenish === undefined) return 0; // We don't want to replenish this item

  return Math.max(0, itemConfig.replenish - character.countItems({ name: item.name }));
}

/**
 * @param item
 * @param atPrice the price we are checking if we want to sell at
 * @returns true if we want to sell the item
 */
export function wantToSell(item: ItemInfo, atPrice: number | "npc" = "npc", config = Config): boolean {
  if (item.l !== undefined) return false; // We can't sell locked items

  const itemConfig = config[item.name]?.sell;
  if (!itemConfig) return false; // We have no sell config for this item
  if (item.p && itemConfig.specialMultiplier === 0) return false; // We don't want to sell special items
  if (!Array.isArray(itemConfig.sellPrice) && (item.level ?? 0) > 0) return false; // Only sell leveled items if we have sellPrice as an array

  if (
    (item.level ?? 0) === 0 &&
    (itemConfig.sellPrice === "npc" || (Array.isArray(itemConfig.sellPrice) && itemConfig.sellPrice["0"] === "npc")) &&
    atPrice === "npc"
  )
    return true; // We want to sell it at the NPC price

  return false; // TODO: Finish this
  // throw new Error("TODO: Finish this");

  // if (Array.isArray(config.sellPrice) && config.sellPrice[item.level ?? 0] !== undefined) {

  // }

  // if (
  //   (item.level ?? 0) === 0 &&
  //   (config.sellPrice === "npc" || (Array.isArray(config.sellPrice) && config.sellPrice[0]))
  // ) {
  //   // TODO
  // }

  // if (config.sellPrice === "npc" && atPrice === "npc")
  // TODO: Finish this

  //   if (atPrice !== undefined) {
  //     // const price = config.sellPrice === "npc" ?
  //     if (atPrice === "npc" && config.sellPrice !== "npc") return false; // We want more than what the NPC buys it for

  //     if (config.sellPrice < atPrice) return false; // We want more for it
  //   }

  //   return true;
}
