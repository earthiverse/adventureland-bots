import { EventBus } from "alclient";
import type { GData } from "typed-adventureland";
import Config from "../../config/items.js";
import { adjustItemConfig } from "../utilities/items.js";
import { logError } from "../utilities/logging.js";

/**
 * This plugin will adjust our item config based on the G data we receive.
 * It will also adjust our item config based on merchant prices we see in the game.
 */

let configAdjusted = false;
function adjust(g: GData) {
  if (configAdjusted) return; // Already adjusted
  try {
    adjustItemConfig(Config, g, { buyKeys: "x2" });
    configAdjusted = true;
  } catch (e) {
    logError("Failed to adjust item config with empty G data. Please check your item config.");
    logError(e as Error);
  }
}

// Adjust our item config when we get G data
EventBus.on("game_created", (game) => {
  try {
    adjust(game.G);
  } catch {
    // Probably failed because we didn't create Game with G data. Should be updated in `g_updated`.
  }
});
EventBus.on("g_updated", (_game, g) => adjust(g));

// Adjust our item config based on what prices players are selling/buying for
EventBus.on("entities_updated", (_observer, _monsters, characters) => {
  for (const character of characters) {
    // TODO: If we see a merchant that is selling for less than we are buying for, we should lower the price to match it.
    // TODO: If we see a merchant that is buying for more than we are selling for, we should up the price to match it.
    // TODO: We may have an issue if the merchant adds a silly amount that is way more than they can afford, so they can't actually buy it.
    //       We could add a block-list of merchants that we know do this to help avoid this issue
  }
});
