import { EventBus } from "alclient";
import type { GData, TradeItemInfo } from "typed-adventureland";
import Config from "../../config/items.js";
import { adjustItemConfig, getItemDescription } from "../utilities/items.js";
import { logDebug, logError, logInformational } from "../utilities/logging.js";

/**
 * This plugin will adjust our item config based on the G data we receive.
 * It will also adjust our item config based on merchant prices we see in the game.
 */

let configAdjusted = false;
function adjust(g: GData, logFail = true) {
  if (configAdjusted) return; // Already adjusted
  try {
    adjustItemConfig(Config, g, { buyKeys: "x2" });
    configAdjusted = true;
  } catch (e) {
    if (logFail) {
      logError("Failed to adjust item config");
      logError(e as Error);
    }
  }
}

// Adjust our item config when we get G data
EventBus.on("game_created", (game) => {
  try {
    adjust(game.G, false);
  } catch {
    // Probably failed because we didn't create Game with G data. Should be updated in `g_updated`.
    logDebug("Failed to adjust item config on `game_created`");
  }
});
EventBus.on("g_updated", (_game, g) => adjust(g));

// Adjust our item config based on what prices players are selling/buying for
EventBus.on("entities_updated", (_observer, _monsters, characters) => {
  for (const character of characters) {
    for (const key in character.slots) {
      if (!key.startsWith("trade")) continue;
      const item = character.slots[key as keyof typeof character.slots] as TradeItemInfo;
      if (item === null || item === undefined) continue; // No item in this slot
      item.level ??= 0;

      const configItem = Config[item.name];
      if (configItem === undefined) continue; // We don't have this item in our config

      if (configItem.sell !== undefined && item.b === true) {
        // TODO: Check for unrealistic prices (too high, they would never have the money)
        // They are buying, and we are selling, check if we can increase our prices

        // TODO: Consider adding a blacklist of players we won't deal with
        if (
          typeof configItem.sell.sellPrice === "number" &&
          item.level === 0 &&
          item.price > configItem.sell.sellPrice
        ) {
          logInformational(
            `${character.id} is buying ${getItemDescription(item)} at ${item.price}. Increasing our sell price from ${configItem.sell.sellPrice}.`,
          );
          configItem.sell.sellPrice = item.price;
        }
        if (
          typeof configItem.sell.sellPrice === "object" &&
          typeof configItem.sell.sellPrice[item.level] === "number" &&
          item.price > (configItem.sell.sellPrice[item.level] as number)
        ) {
          logInformational(
            `${character.id} is buying ${getItemDescription(item)} at ${item.price}. Increasing our sell price from ${configItem.sell.sellPrice[item.level]}.`,
          );
          configItem.sell.sellPrice[item.level] = item.price;
        }
      }

      if (configItem.buy !== undefined && item.b !== true) {
        // They are selling, and we are buying, check if we can lower our prices
        if (typeof configItem.buy.buyPrice === "number" && item.level === 0 && item.price < configItem.buy.buyPrice) {
          logInformational(
            `${character.id} is selling ${getItemDescription(item)} at ${item.price}. Decreasing our buy price from ${configItem.buy.buyPrice}.`,
          );
          configItem.buy.buyPrice = item.price;
        }
        if (
          typeof configItem.buy.buyPrice === "object" &&
          typeof configItem.buy.buyPrice[item.level] === "number" &&
          item.price < (configItem.buy.buyPrice[item.level] as number)
        ) {
          logInformational(
            `${character.id} is selling ${getItemDescription(item)} at ${item.price}. Decreasing our buy price from ${configItem.buy.buyPrice[item.level]}.`,
          );
          configItem.buy.buyPrice[item.level] = item.price;
        }
      }
    }
  }
});
