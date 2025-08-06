import { Character, type Mage, type Merchant, type Paladin, type Priest, type Ranger, type Rogue, type Warrior } from "alclient";
import { Game } from "alclient";
import config from "../../config/config.js";
import { setup as attackSetup } from "../setups/attack/attack.js";
import { setup as itemSetup } from "../setups/item/config.js";
import { setup as lootSetup } from "../setups/loot/simple.js";
import { setup as moveSetup } from "../setups/move/spread_out.js";
import { setup as regenSetup } from "../setups/regen/simple.js";

// Plugins
import type { ServerKey } from "typed-adventureland";
import "../plugins/auto_reconnect.js";
import ServerData from "../plugins/data_tracker.js";
import "../plugins/g_cache.js";
import { getGFromCache } from "../plugins/g_cache.js";
import "../plugins/party.js";
import "../plugins/ping_compensation.js";
import { logError, logInformational } from "../utilities/logging.js";
import {
  checkMonsters,
  defaultMonster,
  getIdealCharacters,
  strategies,
  type StrategyMonsterKey,
} from "./strategies.js";

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
const activeCharacters = new Set<Character>();

const currentTarget: [StrategyMonsterKey, ServerKey] = ["goo", "USIII"];

/**
 * Main logic loop that says what characters should be farming what
 */
const logicLoop = async () => {
  try {
    /** Potential monsters to farm (NOTE: Should be sorted highest priority first) */
    const potentialTargets: [StrategyMonsterKey, ServerKey][] = [];

    // Add monsters we're checking for
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

    // Get target
    const nextTarget = potentialTargets.find((m) => Object.hasOwn(strategies, m[0])) ?? [defaultMonster, defaultServer];
    if (currentTarget[0] === nextTarget[0] && currentTarget[1] === nextTarget[1]) return; // Same target, already set up

    // Get characters
    const strategy = strategies[nextTarget[0]];
    const idealCharacters = getIdealCharacters(strategy);
    if (idealCharacters === undefined) return; // Unable to get ideal characters
    
    logInformational(
      `Switching from ${currentTarget[0]} on ${currentTarget[1]} to ${nextTarget[0]} on ${nextTarget[1]}...`,
    );
    currentTarget[0] = nextTarget[0];
    currentTarget[1] = nextTarget[1];

    // Adjust characters
    const newActiveCharacters = new Set<Character>(idealCharacters.map((name) => characters[name]))
    const charactersToStop = activeCharacters.difference(newActiveCharacters)
    for (const characterToStop of charactersToStop) characterToStop.stop();
    const charactersToStart = newActiveCharacters.difference(activeCharacters)
    for (const characterToStart of charactersToStart) await characterToStart.start(, nextTarget[0]);

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
