import { EventBus } from "alclient";
import fs from "fs";
import path from "path";
import { G_CACHE_FOLDER } from "../utilities/cache.js";

/**
 * This plugin caches G data
 */

// Create the cache folder
fs.mkdirSync(G_CACHE_FOLDER, { recursive: true });

// Cache G data when it gets updated
EventBus.on("g_updated", (_game, g) => {
  const destination = path.join(G_CACHE_FOLDER, `${g.version}.json`);
  fs.writeFileSync(destination, JSON.stringify(g, null, 2));
});
