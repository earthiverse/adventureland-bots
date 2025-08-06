import type { Character } from "alclient";
import type { GData, ItemInfo, ItemKey } from "typed-adventureland";
import Config, { type BuyPrice, type ItemConfig } from "../../config/items.js";
import { logDebug, logError } from "./logging.js";

export function calculateItemValue(item: ItemInfo, g: GData, multiplier = 1): number {
  if (item.gift) return 1;

  const gItem = g.items[item.name];
  let value = typeof gItem.cash === "number" ? gItem.g : gItem.g * multiplier;

  if (gItem.markup !== undefined) value /= gItem.markup;
  if (item.expires !== undefined) value /= 8;

  if (item.level !== undefined && item.level > 0) {
    if (gItem.compound !== undefined) {
      const grades = gItem.grades || [11, 12];
      for (let i = 1; i <= item.level; i++) {
        const grade = i > grades[1] ? 2 : i > grades[0] ? 1 : 0;
        value *= typeof gItem.cash === "number" ? 1.5 : 3.2;
        if (gItem.type !== "booster") {
          value += g.items[`cscroll${grade}`].g / 2.4;
        } else {
          value *= 0.75;
        }
      }
    } else if (gItem.upgrade !== undefined) {
      const grades = gItem.grades || [11, 12];
      let s_value = 0;

      for (let i = 1; i <= item.level; i++) {
        const grade = i > grades[1] ? 2 : i > grades[0] ? 1 : 0;
        s_value += g.items[`scroll${grade}`].g / 2;

        if (i >= 7) {
          value *= 3;
          s_value *= 1.32;
        } else if (i === 6) {
          value *= 2.4;
        } else if (i >= 4) {
          value *= 2;
        }

        if (i === 9) {
          value *= 2.64;
          value += 400000;
        }

        if (i === 10) value *= 5;
        if (i === 12) value *= 0.8;
      }

      value += s_value;
    }
  }

  return value;
}

/**
 * Returns how much gold you would get if you sold the item to an NPC
 * @param g
 * @param item
 * @returns
 */
export function calculateNpcBuyPrice(item: ItemInfo, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.buy_to_sell);
}

export function calculateLostAndFoundSellPrice(item: ItemInfo, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.lostandfound_mult);
}

export function calculatePontySellPrice(item: ItemInfo, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.secondhands_mult);
}

export function calculateBuyPrice(item: ItemInfo, g: GData, buyPrice: BuyPrice): number {
  if (typeof buyPrice === "number") return buyPrice; // Price is already defined

  // Multiplier-based buy price
  if (buyPrice.startsWith("x")) {
    const multiplier = parseFloat(buyPrice.slice(1));
    if (isNaN(multiplier) || multiplier <= 0) {
      logError(`Invalid multiplier in buy price: ${buyPrice} for item ${item.name}`);
      return Number.POSITIVE_INFINITY;
    }
    return calculateItemValue(item, g, multiplier);
  }

  // String-based buy price
  switch (buyPrice) {
    case "g":
      return calculateItemValue(item, g);
    case "goblin":
      return calculateLostAndFoundSellPrice(item, g);
    case "npc":
      return calculateNpcBuyPrice(item, g);
    case "ponty":
      return calculatePontySellPrice(item, g);
    default:
      logError(`Unknown buy price: ${buyPrice} for item ${item.name}`);
      return Number.POSITIVE_INFINITY;
  }
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

export function adjustItemConfig(
  config = Config,
  g: GData,
  options: { buyKeys?: Exclude<BuyPrice, number>; optimizeUpgrades?: true } = {},
) {
  if (options.buyKeys !== undefined) {
    for (const itemName of Object.keys(g.items) as ItemKey[]) {
      const gItem = g.items[itemName];
      if (gItem.type !== "bank_key" && gItem.type !== "dungeon_key") continue; // Not a key
      if (config[itemName]?.buy !== undefined) {
        logDebug(`Item ${itemName} already has a buy config, skipping buyKeys...`);
        continue; // Already has a buy config
      }
      if (!config[itemName]) {
        config[itemName] = {};
      }
      const buyPrice = calculateBuyPrice({ name: itemName }, g, options.buyKeys);
      logDebug(`Adding buy config for ${itemName} to buy for ${buyPrice}`);
      config[itemName].buy = { buyPrice: buyPrice };
    }
  }

  if (options.optimizeUpgrades === true) {
    // TODO: Optimize upgrades
    // TODO: Look for primling price, make sure we have it defined
    if (config.offeringp?.buy?.buyPrice === undefined) {
      logError("`offeringp` buy price is not defined in our item config");
    } else {
      // Look in the config for items that we're upgrading, and use Aria's helper to calculate when to primstack, and what scrolls to use
    }
  }

  // Calculate buy prices from string values
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.buy === undefined) continue; // No buy config
    if (typeof itemConfig.buy.buyPrice === "number") continue; // Already has a buy price

    if (typeof itemConfig.buy.buyPrice === "string") {
      const buyPrice = calculateBuyPrice({ name }, g, itemConfig.buy.buyPrice);
      logDebug(`Setting buy price for item ${name} to ${buyPrice}`);
      itemConfig.buy.buyPrice = buyPrice;
    } else if (typeof itemConfig.buy.buyPrice === "object") {
      for (const levelKey of Object.keys(itemConfig.buy.buyPrice)) {
        const level = parseInt(levelKey, 10);
        if (isNaN(level)) {
          logError(`Invalid level number (${levelKey}) in buy price for item ${name}`);
          continue;
        }
        if (itemConfig.buy.buyPrice[level] === undefined) {
          logError(`No buy price defined for item ${name} at level ${level}`);
          continue;
        }
        if (typeof itemConfig.buy.buyPrice[level] === "number") continue; // Already has a buy price

        const buyPrice = calculateBuyPrice({ name, level }, g, itemConfig.buy.buyPrice[level]);
        logDebug(`Setting buy price for item ${name} at level ${level} to ${buyPrice}`);
        itemConfig.buy.buyPrice[level] = buyPrice;
      }
    }
  }
}
