import { Game, Observer } from "alclient";
import type { ServerIdentifier, ServerRegion } from "typed-adventureland";

// Plugins
import "./plugins/data_tracker.js";
import "./plugins/g_cache.js";
import { logDebug, logError } from "./utilities/logging.js";

const game = new Game();

logDebug("Getting G...");
await game.updateG();

logDebug("Getting Servers...");
await game.updateServers();

for (const [server, region] of [
  ["US", "I"],
  ["US", "II"],
  ["US", "III"],
  ["US", "PVP"],
  ["EU", "I"],
  ["EU", "II"],
  ["EU", "PVP"],
  ["ASIA", "I"],
] as [ServerRegion, ServerIdentifier][]) {
  logDebug(`Observing ${server}${region}...`);
  const o = new Observer(game);
  o.start(server, region).catch(logError);
}
