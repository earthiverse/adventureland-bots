import type { Priest } from "alclient";
import { Game, type Character } from "alclient";
import type { MapKey, MonsterKey, ServerIdentifier, ServerRegion } from "typed-adventureland";
import config from "../config/config.js";
import { setup as itemSetup } from "./setups/item/config.js";
import { setup as lootSetup } from "./setups/loot/simple.js";
import { setup as merchantSetup } from "./setups/merchant/merchant.js";
import { setup as avoidStackingSetup } from "./setups/move/avoid_stacking.js";
import { setup as partyHealSetup } from "./setups/priest/partyheal.js";
import { setup as regenSetup } from "./setups/regen/simple.js";
import { setup as simpleSetup } from "./setups/simple.js";

// Plugins
import "./plugins/auto_reconnect.js";
import "./plugins/data_tracker.js";
import "./plugins/g_cache.js";
import { getGFromCache } from "./plugins/g_cache.js";
import "./plugins/internal_caches.js";
import "./plugins/item_config_adjust.js";
import "./plugins/party.js";
import "./plugins/ping_compensation.js";
import { logDebug, logInformational } from "./utilities/logging.js";

// Config
const { server, email, password } = config.credentials;
const { useBasement, useUnderground } = config.banking;
const MONSTERS: MonsterKey[] = ["tortoise", "phoenix"];
const SERVER_REGION: ServerRegion = "ASIA";
const SERVER_IDENTIFIER: ServerIdentifier = "I";

logDebug("Getting G from Cache...");
const g = getGFromCache();
const game = new Game({ url: server, G: g });

logDebug("Getting Servers...");
const promises: Promise<unknown>[] = [game.updateServers()];
if (!g) promises.push(game.updateG());
await Promise.all(promises);

const ignoreMaps: MapKey[] = [
  "abtesting",
  "cgallery",
  "d2",
  "d_e",
  "shellsisland",
  "ship0",
  "test",
  "old_bank",
  "old_main",
  "original_main",
  "resort",
  "resort_e",
];
if (!useBasement) ignoreMaps.push("bank_b");
if (!useUnderground) ignoreMaps.push("bank_u");
game.preparePathfinder(ignoreMaps);

logDebug("Logging in...");
const player = await game.login(email, password);
const ideal = ["Ranzair", "Magzair", "Prizair"];

const playerCharacters = [...player.characters];
playerCharacters.sort((a, b) => {
  // Prefer ideal characters
  if (ideal.includes(a.name) && !ideal.includes(b.name)) return -1;
  if (!ideal.includes(a.name) && ideal.includes(b.name)) return 1;

  return b.level - a.level; // Prioritize characters with higher levels
  // return a.level - b.level; // Prioritize characters with lower levels
});

let merchantStarted = false;
const characters: Character[] = [];

for (const characterInfo of playerCharacters) {
  if (characters.length >= 4) {
    // Already started maximum number of characters
    logDebug("breaking!");
    break; // Started three characters and a merchant
  }

  let character: Character;
  switch (characterInfo.type) {
    case "merchant":
      if (merchantStarted) continue; // Already have a merchant
      logDebug(`Creating ${characterInfo.name} (merchant)`);
      character = player.createCharacter(characterInfo.name);
      logInformational(
        `Starting ${characterInfo.name} (${characterInfo.type}) on ${SERVER_REGION} ${SERVER_IDENTIFIER}`,
      );
      await character.start(SERVER_REGION, SERVER_IDENTIFIER);
      merchantSetup(character, {
        characters,
        defaultPosition: { map: "main", in: "main", x: -100, y: -100 },
        enableGoldTransfer: {
          whenGoldIsOverAmount: 1_100_000,
          whenGoldIsUnderAmount: 900_000,
          amountToHold: 1_000_000,
        },
        enableItemTransfer: {
          whenNumEmptySlotsUnderAmount: 5,
        },
      });
      itemSetup(character);
      lootSetup(character);
      regenSetup(character);

      merchantStarted = true;
      break;
    case "mage":
    case "paladin":
    case "priest":
    case "ranger":
    case "rogue":
    case "warrior":
      if (characters.length >= (merchantStarted ? 4 : 3)) continue; // Already started 3 characters
      logDebug(`Creating ${characterInfo.name} (${characterInfo.type})`);
      character = player.createCharacter(characterInfo.name);
      logInformational(
        `Starting ${characterInfo.name} (${characterInfo.type}) on ${SERVER_REGION} ${SERVER_IDENTIFIER}`,
      );
      await character.start(SERVER_REGION, SERVER_IDENTIFIER);
      simpleSetup(character, MONSTERS);

      if (character.ctype === "priest") {
        partyHealSetup(character as Priest, characters);
      }
      break;
  }

  avoidStackingSetup(character);
  characters.push(character);
}
