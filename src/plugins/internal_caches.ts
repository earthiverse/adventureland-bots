import { EventBus } from "alclient";
import type { GData } from "typed-adventureland";
import { getNpcPurchasableItems } from "../utilities/items/npc.js";
import { getScrollAndOfferingPricesFromG } from "../utilities/items/upgrade.js";
import { logDebug } from "../utilities/logging.js";

/**
 * This plugin will adjust our caches that are based on data from G if GData gets updated.
 */

function updateCaches(g: GData) {
  getNpcPurchasableItems(g);
  getScrollAndOfferingPricesFromG(g);
}

// Adjust our item config when we get G data
EventBus.on("game_created", (game) => {
  try {
    updateCaches(game.G);
  } catch {
    // Probably failed because we didn't create Game with G data. Should be updated in `g_updated`.
    logDebug("Failed to update caches on `game_created`.");
  }
});
EventBus.on("g_updated", (_game, g) => updateCaches(g));
