import type { GData, ItemKey } from "typed-adventureland";
import type { Config, Price } from "../../../config/items.js";
import { calculateNpcBuyPrice, calculatePrice } from "../items.js";
import { logDebug, logError } from "../logging.js";

/**
 * Changes the config to buy keys at the given price.
 */
export function buyKeys(config: Config, g: GData, price: Exclude<Price, number>) {
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
    const buyPrice = calculatePrice({ name: itemName }, g, price);
    logDebug(`Adding buy config for ${itemName} to buy for ${buyPrice}`);
    config[itemName].buy = { buyPrice: buyPrice };
  }
}

/**
 * Calculates the buy prices (changes them to numbers) for items based on their config.
 */
export function calculateBuyPrices(config: Config, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.buy === undefined) continue; // No buy config
    if (typeof itemConfig.buy.buyPrice === "number") continue; // Already has a buy price

    if (typeof itemConfig.buy.buyPrice === "string") {
      const buyPrice = calculatePrice({ name }, g, itemConfig.buy.buyPrice);
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

        const buyPrice = calculatePrice({ name, level }, g, itemConfig.buy.buyPrice[level]);
        logDebug(`Setting buy price for item ${name} at level ${level} to ${buyPrice}`);
        itemConfig.buy.buyPrice[level] = buyPrice;
      }
    }
  }
}

/**
 * Calculates the sell prices (changes them to numbers) for items based on their config.
 */
export function calculateSellPrices(config: Config, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.sell === undefined) continue; // No sell config

    if (typeof itemConfig.sell.sellPrice === "object") {
      for (const levelKey of Object.keys(itemConfig.sell.sellPrice)) {
        const level = parseInt(levelKey, 10);
        if (isNaN(level)) {
          logError(`Invalid level number (${levelKey}) in sell price for item ${name}`);
          continue;
        }
        if (itemConfig.sell.sellPrice[level] === undefined) {
          logError(`No sell price defined for item ${name} at level ${level}`);
          continue;
        }
        if (typeof itemConfig.sell.sellPrice[level] === "number") continue; // Already has a sell price

        const sellPrice = calculatePrice({ name, level }, g, itemConfig.sell.sellPrice[level]);
        logDebug(`Setting sell price for item ${name} at level ${level} to ${sellPrice}`);
        itemConfig.sell.sellPrice[level] = sellPrice;
      }
    } else if (typeof itemConfig.sell.sellPrice !== "number") {
      const sellPrice = calculatePrice({ name }, g, itemConfig.sell.sellPrice);
      logDebug(`Setting sell price for item ${name} to ${sellPrice}`);
      itemConfig.sell.sellPrice = sellPrice;
    }
  }
}

/**
 * Ensures that we are selling items for at least the price an NPC would buy them for.
 */
export function ensureSellPriceAtLeastNpcPrice(config: Config, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (typeof itemConfig?.sell?.sellPrice === "number") {
      const npcBuyPrice = calculateNpcBuyPrice({ name }, g);
      if (itemConfig.sell.sellPrice < npcBuyPrice) {
        logError(
          `Sell price for ${name} is less than what an NPC would pay for it. Increasing from ${itemConfig.sell.sellPrice} to ${npcBuyPrice}`,
        );
        itemConfig.sell.sellPrice = npcBuyPrice;
      }
    } else if (typeof itemConfig?.sell?.sellPrice === "object") {
      for (const levelKey of Object.keys(itemConfig.sell.sellPrice)) {
        const level = parseInt(levelKey, 10);
        if (isNaN(level)) {
          logError(`Invalid level number (${levelKey}) in sell price for item ${name}`);
          continue;
        }
        if (itemConfig.sell.sellPrice[level] === undefined) {
          logError(`No sell price defined for item ${name} at level ${level}`);
          continue;
        }
        if (typeof itemConfig.sell.sellPrice[level] !== "number") continue; // Already has a sell price

        const npcBuyPrice = calculateNpcBuyPrice({ name, level }, g);
        if (itemConfig.sell.sellPrice[level] < npcBuyPrice) {
          logError(
            `Sell price for ${name} at level ${level} is less than what an NPC would pay for it. Increasing from ${itemConfig.sell.sellPrice[level]} to ${npcBuyPrice}`,
          );
          itemConfig.sell.sellPrice[level] = npcBuyPrice;
        }
      }
    }
  }
}

/**
 * Ensures that the special multiplier for selling items is at least 1.
 */
export function ensureSellMultiplierAtLeastOne(config: Config) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.sell === undefined) continue; // No sell config
    if (itemConfig.sell.specialMultiplier === undefined) continue; // No special multiplier
    if (itemConfig.sell.specialMultiplier < 1) {
      logError(`Special multiplier for ${name} is less than 1, setting to 1`);
      itemConfig.sell.specialMultiplier = 1;
    }
  }
}

/**
 * Ensures that the buy price is less than the sell price for each item.
 *
 * NOTE: Run {@see calculateBuyPrices} and {@see calculateSellPrices} before this function
 */
export function ensureBuyPriceLessThanSellPrice(config: Config) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.buy === undefined || itemConfig.sell === undefined) continue; // Missing buy or sell config

    if (typeof itemConfig.buy?.buyPrice === "number") {
      if (typeof itemConfig.sell?.sellPrice === "number") {
        if (itemConfig.buy.buyPrice >= itemConfig.sell.sellPrice) {
          const newSellPrice = itemConfig.buy.buyPrice + 1;
          logError(`Buy price for ${name} is >= sell price. Setting sell price to ${newSellPrice}`);
          itemConfig.sell.sellPrice = newSellPrice;
        }
      } else if (typeof itemConfig.sell?.sellPrice === "object") {
        // TODO: Number - Object
      }
    } else if (typeof itemConfig.buy?.buyPrice === "object") {
      if (typeof itemConfig.sell?.sellPrice === "number") {
        // TODO: Object - Number
      } else if (typeof itemConfig.sell?.sellPrice === "object") {
        // TODO: Object - Object
      }
    }
  }
}

export function optimizeUpgrades(config: Config) {
  // TODO: Optimize upgrades
  // TODO: Look for primling price, make sure we have it defined
  if (config.offeringp?.buy?.buyPrice === undefined) {
    logError("`offeringp` buy price is not defined in our item config");
  } else {
    // Look in the config for items that we're upgrading, and use Aria's helper to calculate when to primstack, and what scrolls to use
  }
}
