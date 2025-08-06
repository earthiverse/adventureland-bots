import type { Character, Mage, Merchant, Paladin, Priest, Ranger, Rogue, Warrior } from "alclient";
import { Game } from "alclient";
import config from "../../config/config.js";
import { setup as attackSetup } from "../setups/attack/attack.js";
import { setup as itemSetup } from "../setups/item/config.js";
import { setup as lootSetup } from "../setups/loot/simple.js";
import { setup as moveSetup } from "../setups/move/spread_out.js";
import { setup as regenSetup } from "../setups/regen/simple.js";

// Plugins
import type { MonsterKey, ServerKey } from "typed-adventureland";
import { checkMonsters, defaultMonster } from "./strategies.js";
import "../plugins/auto_reconnect.js";
import ServerData from "../plugins/data_tracker.js";
import "../plugins/g_cache.js";
import { getGFromCache } from "../plugins/g_cache.js";
import "../plugins/party.js";
import "../plugins/ping_compensation.js";
import { logDebug, logError } from "../utilities/logging.js";

// Config
const { server, email, password } = config.credentials;

const g = getGFromCache();
const game = new Game({ url: server, G: g });

const promises: Promise<unknown>[] = [game.updateServers()];
if (!g) promises.push(game.updateG());
await Promise.all(promises);

const player = await game.login(email, password);

/** Servers we want to check for monsters on */
const checkServers = ["USI", "USII", "USIII", "EUI", "EUII", "ASIAI"] as const satisfies ServerKey[];

/** Character objects for all of our  */
export const characters = Object.freeze({
  // Mages
  earthMag: player.createCharacter<Mage>("earthMag"),
  earthMag2: player.createCharacter<Mage>("earthMag2"),
  earthMag3: player.createCharacter<Mage>("earthMag3"),
  // Merchants
  earthMer: player.createCharacter<Merchant>("earthMer"),
  earthMer2: player.createCharacter<Merchant>("earthMer2"),
  earthMer3: player.createCharacter<Merchant>("earthMer3"),
  // Paladins
  earthPal: player.createCharacter<Paladin>("earthPal"),
  // Priests
  earthPri: player.createCharacter<Priest>("earthPri"),
  earthPri2: player.createCharacter<Priest>("earthPri2"),
  // Rangers
  earthiverse: player.createCharacter<Ranger>("earthiverse"),
  earthRan2: player.createCharacter<Ranger>("earthRan2"),
  earthRan3: player.createCharacter<Ranger>("earthRan3"),
  // Rogues
  earthRog: player.createCharacter<Rogue>("earthRog"),
  earthRog2: player.createCharacter<Rogue>("earthRog2"),
  earthRog3: player.createCharacter<Rogue>("earthRog3"),
  // Warriors
  earthWar: player.createCharacter<Warrior>("earthWar"),
  earthWar2: player.createCharacter<Warrior>("earthWar2"),
  earthWar3: player.createCharacter<Warrior>("earthWar3"),
});

/** A list of our active characters */
const activeCharacters: Character[] = [];

let targetMonster: MonsterKey = defaultMonster;
let targetServer: ServerKey = checkServers[0];

/**
 * Main logic loop that says what characters should be farming what
 */
const logicLoop = async () => {
  try {
    for (const serverKey of checkServers) {
      const serverData = ServerData.get(serverKey);
      if (serverData === undefined) continue; // No data for this server

      for (const monsterKey of checkMonsters) {
        const monsterData = serverData.monsters[monsterKey];
        if (monsterData === undefined || monsterData.length === 0) continue;

        for (const monsterDatum of monsterData) {
          if (monsterDatum.target !== undefined) continue;

          // TODO: Add to potential targets
        }
      }
    }
    // TODO: Get target

    // TODO: From target, decide players & strategy
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logError(e);
  } finally {
    setTimeout(() => void logicLoop(), 1000);
  }
};

void logicLoop();

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
      logDebug(`Creating ${characterInfo.name} (${characterInfo.type})`);
      character = player.createCharacter(characterInfo.name);
      break;
  }
  await character.start("ASIA", "I");

  attackSetup(character, defaultMonster);
  itemSetup(character);
  lootSetup(character);
  moveSetup(character, defaultMonster);
  regenSetup(character);
}
