import type { DismantleKey, GData, ItemKey } from "typed-adventureland";
import type { ItemsConfig, Price } from "../../../config/items.js";
import { calculateNpcBuyPrice, calculatePrice, wantToList, wantToSell } from "../items.js";
import { logDebug, logError } from "../logging.js";

/**
 * Changes the config to buy keys at the given price.
 */
export function buyKeys(config: ItemsConfig, g: GData, price: Exclude<Price, number>) {
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
export function calculateBuyPrices(config: ItemsConfig, g: GData) {
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
export function calculateSellPrices(config: ItemsConfig, g: GData) {
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
 * Ensures that the buy price is less than the sell price for each item.
 *
 * NOTE: Run {@see calculateBuyPrices} and {@see calculateSellPrices} before this function
 */
export function ensureBuyPriceLessThanSellPrice(config: ItemsConfig) {
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

/**
 * Ensures that the special multiplier for selling items is at least 1.
 */
export function ensureSellMultiplierAtLeastOne(config: ItemsConfig) {
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
 * Ensures that we are selling items for at least the price an NPC would buy them for.
 */
export function ensureSellPriceAtLeastNpcPrice(config: ItemsConfig, g: GData) {
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

export function optimizeUpgrades(config: ItemsConfig) {
  // TODO: Optimize upgrades
  // TODO: Look for primling price, make sure we have it defined
  if (config.offeringp?.buy?.buyPrice === undefined) {
    logError("`offeringp` buy price is not defined in our item config");
    return;
  }

  // TODO: Look in the config for items that we're upgrading, and use Aria's helper to calculate when to primstack, and what scrolls to use
}

export function removeDestroyableWithoutBenefit(config: ItemsConfig, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.destroy === undefined) continue; // No destroy config
    const gItem = g.items[name];
    if (gItem.upgrade === undefined) {
      logError(`Item ${name} is not upgradable, but has a destroy config`);
      delete itemConfig.destroy;
      continue;
    }
  }
}

/**
 * If items are marked as dismantlable in the config, but not in the game data, we remove them from the config.
 *
 * NOTE: Compoundable items are also dismantlable
 */
export function removeNonDismantlable(config: ItemsConfig, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.dismantle === undefined) continue; // No dismantle config
    const gDismantle = g.dismantle[name as DismantleKey];
    const gItem = g.items[name];
    if (gDismantle === undefined && gItem.compound === undefined) {
      logError(`Item ${name} is not dismantlable, but has a dismantle config`);
      delete itemConfig.dismantle;
      continue;
    }
  }
}

/**
 * If items are marked as craftable in the config, but not in the game data, we remove them from the config.
 */
export function removeUncraftable(config: ItemsConfig, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.craft === undefined) continue; // No craft config
    const gCraft = g.craft[name];

    if (gCraft === undefined) {
      logError(`Item ${name} is not craftable, but has a craft config`);
      delete itemConfig.craft;
      continue;
    }

    for (const [, needName, needLevel] of gCraft.items) {
      const needConfig = config[needName];
      if (needConfig === undefined) continue; // No config
      if (needConfig.destroy) {
        logError(`Item ${needName} is needed to craft ${name}, but has a destroy config`);
      }
      if (needConfig.mail) {
        logError(`Item ${needName} is needed to craft ${name}, but has a mail config`);
      }
      for (let level = 0; level <= (needLevel ?? 0); level++) {
        if (wantToSell({ name: needName, level: level === 0 ? undefined : level }, g, "npc", config)) {
          logError(
            `Item ${needName} is needed to craft ${name}, but has a sell config that sells it at NPC price at level ${level}`,
          );
        }
        if (typeof wantToList({ name: needName, level: level === 0 ? undefined : level }, g, config) === "number") {
          logError(`Item ${needName} is needed to craft ${name}, but has a list config at level ${level}.`);
        }
      }
    }

    continue; // Item is craftable
  }
}

/**
 * If items are marked as exchangable in the config, but not in the game data, we remove them from the config.
 */
export function removeUnexchangable(config: ItemsConfig, g: GData) {
  for (const name of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[name];
    if (itemConfig === undefined) continue; // No config
    if (itemConfig.exchange === undefined) continue; // No exchange config
    const gItem = g.items[name];
    if (gItem.e !== undefined) continue; // Item is exchangable

    if (
      itemConfig.exchange.exchangeAtLevel !== undefined &&
      gItem.upgrade === undefined &&
      gItem.compound === undefined
    ) {
      logError(
        `Item ${name} is not upgradable, but has an exchange config with exchangeAtLevel set to ${itemConfig.exchange.exchangeAtLevel}`,
      );
      delete itemConfig.exchange.exchangeAtLevel;
      continue;
    }

    logError(`Item ${name} is not exchangable, but has an exchange config`);
    delete itemConfig.exchange;
  }
}
