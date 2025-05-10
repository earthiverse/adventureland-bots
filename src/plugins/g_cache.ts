import { EventBus } from "alclient";
import fs from "fs";
import path from "path";
import type { GData } from "typed-adventureland";
import url from "url";
import { logDebug, logNotice, logWarning } from "../utilities/logging.js";

/**
 * This plugin will cache G data when it's updated,
 * and will update G if our current cache is outdated
 */

export const G_CACHE_FOLDER = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../../data/g/");

export function getGFromCache(): GData | undefined {
  const files = fs.readdirSync(G_CACHE_FOLDER);
  if (files.length === 0) return undefined;
  const newestVersion = files.reduce((a, b) => {
    const versionA = parseInt(a.substring(0, a.indexOf(".")));
    const versionB = parseInt(b.substring(0, b.indexOf(".")));

    return versionA > versionB ? a : b;
  });
  return JSON.parse(
    fs.readFileSync(path.join(G_CACHE_FOLDER, newestVersion), {
      encoding: "utf8",
    }),
  ) as GData;
}

// Create the cache folder
fs.mkdirSync(G_CACHE_FOLDER, { recursive: true });

// Update G if we have a version mismatch
EventBus.on("version_mismatch", (observer, newestVersion) => {
  logDebug(`Version mismatch! Local: ${observer.game.version}, Server: ${newestVersion}`);
  logDebug("Updating G...");
  observer.game
    .updateG()
    .then((g) => logNotice(`Updated G to v${g.version}!`))
    .catch(logWarning);
});

// Cache G data when it gets updated
EventBus.on("g_updated", (_game, g) => {
  const destination = path.join(G_CACHE_FOLDER, `${g.version}.json`);
  fs.writeFileSync(destination, JSON.stringify(g, null, 2));
});
