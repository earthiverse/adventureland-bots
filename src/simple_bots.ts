import { Game, type Character } from "alclient";
import config from "config";
import { setup } from "./setups/simple/base.js";
import { getGFromCache } from "./utilities/cache.js";

// Plugins
import "./plugins/auto_reconnect.js";
import "./plugins/g_cache.js";
import "./plugins/party.js";
import "./plugins/ping_compensation.js";

// Config
const server = config.get<string>("credentials.server");
const email = config.get<string>("credentials.email");
const password = config.get<string>("credentials.password");

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
    default:
      console.debug(`Creating ${characterInfo.name} (${characterInfo.type})`);
      character = player.createCharacter(characterInfo.name);
      break;
  }
  await character.start("EU", "I");
  setup(character);
}
