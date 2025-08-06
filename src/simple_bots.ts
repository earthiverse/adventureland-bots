import { Game, type Character } from "alclient";
import type { MonsterKey } from "typed-adventureland";
import config from "../config/config.js";
import { setup } from "./setups/simple.js";

// Plugins
import "./plugins/auto_reconnect.js";
import "./plugins/data_tracker.js";
import "./plugins/g_cache.js";
import { getGFromCache } from "./plugins/g_cache.js";
import "./plugins/party.js";
import "./plugins/ping_compensation.js";
import { logDebug, logInformational } from "./utilities/logging.js";

// Config
const { server, email, password } = config.credentials;
const MONSTER: MonsterKey = "goo";

logDebug("Getting G from Cache...");
const g = getGFromCache();
const game = new Game({ url: server, G: g });

logDebug("Getting Servers...");
const promises: Promise<unknown>[] = [game.updateServers()];
if (!g) promises.push(game.updateG());
await Promise.all(promises);

logDebug("Logging in...");
const player = await game.login(email, password);

player.characters.sort((a, b) => {
  return a.level - b.level; // Prioritize characters with lower levels
});

let merchantStarted = false;
let numStarted = 0;
for (const characterInfo of player.characters) {
  let character: Character;
  switch (characterInfo.type) {
    case "merchant":
      if (merchantStarted) continue; // Already have a merchant
      merchantStarted = true;
      // TODO: Get a merchant strategy (then break instead of continue)
      continue;
    case "mage":
    case "paladin":
    case "priest":
    case "ranger":
    case "rogue":
    case "warrior":
      logDebug(`Creating ${characterInfo.name} (${characterInfo.type})`);
      character = player.createCharacter(characterInfo.name);
      break;
  }

  if (numStarted >= 3) {
    // Already started maximum number of characters
    if (merchantStarted) break; // Started three characters and a merchant
    continue;
  }

  logInformational(`Starting ${characterInfo.name} (${characterInfo.type}) on ASIA I`);
  await character.start("ASIA", "I");
  numStarted++;

  setup(character, MONSTER);
}
