import {
  Character,
  Game,
  type Mage,
  type Merchant,
  type Paladin,
  type Priest,
  type Ranger,
  type Rogue,
  type Warrior,
} from "alclient";
import config from "../../config/config.js";

// Plugins
import type { MonsterKey, ServerKey } from "typed-adventureland";
import "../plugins/auto_reconnect.js";
import ServerData from "../plugins/data_tracker.js";
import "../plugins/g_cache.js";
import { getGFromCache } from "../plugins/g_cache.js";
import "../plugins/party.js";
import "../plugins/ping_compensation.js";
import { logError, logInformational } from "../utilities/logging.js";
import { checkMonsters, defaultMonster, strategies } from "./strategies.js";

// Config
const { server, email, password } = config.credentials;

let g = getGFromCache();
const game = new Game({ url: server, G: g });

const promises: Promise<unknown>[] = [game.updateServers()];
if (!g) promises.push(game.updateG());
await Promise.all(promises);
g = game.G;

const player = await game.login(email, password);

/** Servers we want to check for monsters on */
const checkServers = ["USI", "USII", "USIII", "EUI", "EUII", "ASIAI"] as const satisfies ServerKey[];
const defaultServer = "USIII" as const satisfies ServerKey;

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
const activeCharacters = new Set<Character>();

let currentTarget: [MonsterKey, ServerKey] = ["goblin", "USPVP"];

/**
 * Main logic loop that says what characters should be farming what
 */
const logicLoop = async () => {
  try {
    /** Potential monsters to farm (NOTE: Should be sorted highest priority first) */
    const potentialTargets: [MonsterKey, ServerKey][] = [];

    // Add monsters we're checking for
    for (const serverKey of checkServers) {
      const serverData = ServerData.get(serverKey);
      if (serverData === undefined) continue; // No data for this server

      for (const monsterKey of checkMonsters) {
        const monsterData = serverData.monsters[monsterKey];
        if (monsterData === undefined || monsterData.length === 0) continue;
        const gMonster = G.monsters[monsterKey];

        for (const monsterDatum of monsterData) {
          if (
            gMonster.cooperative !== true && // Monster is not cooperative (no credit)
            monsterDatum.target !== undefined // Monster has a target
          ) {
            continue; // Won't get credit
          }

          potentialTargets.push([monsterKey, serverKey]);
        }
      }
    }

    // Get target
    const lastTarget = [...currentTarget];
    currentTarget = potentialTargets.find((m) => Object.hasOwn(strategies, m[0])) ?? [defaultMonster, defaultServer];

    if (lastTarget[0] === currentTarget[0] && lastTarget[1] === currentTarget[1]) return; // Same target, already set up
    logInformational(
      `Switching from ${lastTarget[0]} on ${currentTarget[1]} to ${currentTarget[0]} on ${currentTarget[1]}...`,
    );

    const strategy = strategies[currentTarget[0] as keyof typeof strategies];
    for (const characterNames of strategy.characters) {
    }

    // TODO: From target, decide players & strategy
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logError(e);
  } finally {
    setTimeout(() => void logicLoop(), 1000);
  }
};
void logicLoop();

// for (const characterInfo of player.characters) {
//   let character: Character;
//   switch (characterInfo.type) {
//     case "merchant":
//       continue; // TODO: Get a merchant strategy
//     case "mage":
//     case "paladin":
//     case "priest":
//     case "ranger":
//     case "rogue":
//     case "warrior":
//       logDebug(`Creating ${characterInfo.name} (${characterInfo.type})`);
//       character = player.createCharacter(characterInfo.name);
//       break;
//   }
//   await character.start("ASIA", "I");

//   attackSetup(character, defaultMonster);
//   itemSetup(character);
//   lootSetup(character);
//   moveSetup(character, defaultMonster);
//   regenSetup(character);
// }
