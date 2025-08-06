import type { Character } from "alclient";
import type { GData, ItemInfo } from "typed-adventureland";
import Config, { type ItemConfig, type Price } from "../../config/items.js";
import {
  buyKeys,
  calculateBuyPrices,
  calculateSellPrices,
  ensureBuyPriceLessThanSellPrice,
  ensureSellMultiplierAtLeastOne,
  ensureSellPriceAtLeastNpcPrice,
  optimizeUpgrades,
} from "./items/adjust.js";
import { logError } from "./logging.js";

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

export function calculatePrice(item: ItemInfo, g: GData, price: Price): number {
  if (typeof price === "number") return price; // Price is already defined

  // Multiplier-based buy price
  if (price.startsWith("x")) {
    const multiplier = parseFloat(price.slice(1));
    if (isNaN(multiplier) || multiplier <= 0) {
      logError(`Invalid multiplier in buy price: ${price} for item ${item.name}`);
      return Number.POSITIVE_INFINITY;
    }
    return calculateItemValue(item, g, multiplier);
  }

  // String-based buy price
  switch (price) {
    case "g":
      return calculateItemValue(item, g);
    case "goblin":
      return calculateLostAndFoundSellPrice(item, g);
    case "npc":
      return calculateNpcBuyPrice(item, g);
    case "ponty":
      return calculatePontySellPrice(item, g);
    default:
      logError(`Unknown buy price: ${price} for item ${item.name}`);
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
 * @returns the amount we want to list the item for on our stand, or `false` if we don't want to list it
 */
export function wantToList(item: ItemInfo, g: GData, config = Config): false | number {
  if (item.l !== undefined) return false; // We can't list locked items

  const itemConfig = config[item.name]?.list;
  if (!itemConfig) return false; // We have no list config for this item
  if (item.p && itemConfig.specialMultiplier === undefined) return false; // We don't want to list special items

  let wantToListForPrice: Price | undefined;
  if (typeof itemConfig.listPrice === "object") {
    wantToListForPrice = itemConfig.listPrice[item.level ?? 0];
  } else if ((item.level ?? 0) === 0) {
    wantToListForPrice = itemConfig.listPrice;
  }
  if (wantToListForPrice === undefined) return false; // We don't want to list this item at this level

  // TODO: Calculate the price
  return calculatePrice(item, g, wantToListForPrice); // We want to list this item for this price
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
  if (item.level !== undefined && item.level > itemConfig.mailUntilLevel) return false; // We only want to mail items up to a certain level

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
 * @param g
 * @param canSellForPrice the price someone is willing to buy the item for
 * @param config
 * @returns true if we want to sell the item
 */
export function wantToSell(item: ItemInfo, g: GData, canSellForPrice: Price = "npc", config = Config): boolean {
  if (item.l !== undefined) return false; // We can't sell locked items

  const itemConfig = config[item.name]?.sell;
  if (!itemConfig) return false; // We have no sell config for this item
  if (item.p && itemConfig.specialMultiplier === undefined) return false; // We don't want to sell special items

  let wantToSellForPrice: Price | undefined;
  if (typeof itemConfig.sellPrice === "object") {
    wantToSellForPrice = itemConfig.sellPrice[item.level ?? 0];
  } else if ((item.level ?? 0) === 0) {
    wantToSellForPrice = itemConfig.sellPrice;
  }
  if (wantToSellForPrice === undefined) return false; // We don't want to sell this item at this level
  if (
    calculatePrice(item, g, canSellForPrice) <
    calculatePrice(item, g, wantToSellForPrice) *
      (item.p ? (itemConfig.specialMultiplier ?? Number.POSITIVE_INFINITY) : 1)
  )
    return false; // We want more for it

  return true; // We're OK selling this item for this price
}

export function adjustItemConfig(
  config = Config,
  g: GData,
  options: { buyKeys?: Exclude<Price, number>; optimizeUpgrades?: true } = {},
) {
  if (options.buyKeys !== undefined) buyKeys(config, g, options.buyKeys);
  calculateBuyPrices(config, g);
  calculateSellPrices(config, g);
  ensureSellPriceAtLeastNpcPrice(config, g);
  ensureSellMultiplierAtLeastOne(config);
  ensureBuyPriceLessThanSellPrice(config);
  if (options.optimizeUpgrades === true) optimizeUpgrades(config);
}
