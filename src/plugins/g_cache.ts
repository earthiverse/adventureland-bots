import { EventBus } from "alclient";
import fs from "fs";
import path from "path";
import url from "url";

/**
 * This plugin caches G data
 */

const G_CACHE_FOLDER = path.join(
  path.dirname(url.fileURLToPath(import.meta.url)),
  "../../data/g/"
);

// Create the cache folder
fs.mkdirSync(G_CACHE_FOLDER, { recursive: true });

// Cache G data when it gets updated
EventBus.on("g_updated", (_game, g) => {
  const destination = path.join(G_CACHE_FOLDER, `${g.version}.json`);
  fs.writeFileSync(destination, JSON.stringify(g, null, 2));
});
