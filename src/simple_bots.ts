import { Game, type Character } from "alclient";
import config from "../config/config.js";
import { setup } from "./setups/simple.js";

// Plugins
import "./plugins/auto_reconnect.js";
import "./plugins/g_cache.js";
import { getGFromCache } from "./plugins/g_cache.js";
import "./plugins/party.js";
import "./plugins/ping_compensation.js";

// Config
const { server, email, password } = config.credentials;

const g = getGFromCache();
const game = new Game({ url: server, G: g });

const promises: Promise<unknown>[] = [game.updateServers()];
if (!g) promises.push(game.updateG());
await Promise.all(promises);

const player = await game.login(email, password);

for (const characterInfo of player.characters) {
  let character: Character;
  switch (characterInfo.type) {
    case "merchant":
      continue; // TODO: Get a merchant strategy
    case "mage":
    case "paladin":
    case "priest":
    case "ranger":
    case "rogue":
    case "warrior":
      console.debug(`Creating ${characterInfo.name} (${characterInfo.type})`);
      character = player.createCharacter(characterInfo.name);
      break;
  }
  await character.start("ASIA", "I");
  setup(character);
}
