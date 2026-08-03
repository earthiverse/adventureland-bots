import { Game, type Character } from "alclient";
import type { MapKey, MonsterKey } from "typed-adventureland";
import config from "../config/config.js";
import { setup as attackSetup, teardown as attackTeardown } from "./setups/attack/attack.js";
import { setup as itemSetup } from "./setups/item/config.js";
import { setup as lootSetup } from "./setups/loot/simple.js";
import { setup as merchantSetup } from "./setups/merchant/merchant.js";
import { setup as avoidStackingSetup } from "./setups/move/avoid_stacking.js";
import { setup as moveSetup, teardown as moveTeardown } from "./setups/move/spread_out.js";
import { setup as regenSetup } from "./setups/regen/simple.js";

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
const MONSTERS: MonsterKey[] = [
  "armadillo",
  "bee",
  "croc",
  "crab",
  "frog",
  "goo",
  "minimush",
  "osnake",
  "poisio",
  "porcupine",
  "snake",
  "rat",
  "scorpion",
  "spider",
  "squig",
  "squigtoad",
  "tortoise",
];

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
      logInformational(`Starting ${characterInfo.name} (${characterInfo.type}) on ASIA I`);
      await character.start("ASIA", "I");
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
      logInformational(`Starting ${characterInfo.name} (${characterInfo.type}) on ASIA I`);
      await character.start("ASIA", "I");
      itemSetup(character);
      lootSetup(character);
      regenSetup(character);
      break;
  }

  avoidStackingSetup(character);
  characters.push(character);
}

const logicLoop = async () => {
  try {
    // Build the list of monsters we're hunting for quests (prioritized by least time left)
    const activeQuests: { monster: MonsterKey; ms: number }[] = [];
    for (const character of characters) {
      if (character.ctype === "merchant") continue;

      if (!character.s.monsterhunt) continue;
      if (character.s.monsterhunt.c <= 0) continue; // Finished
      if (!MONSTERS.includes(character.s.monsterhunt.id)) continue; // Monster isn't in our list
      const currentSn = `${character.server.region} ${character.server.name}`;
      if (character.s.monsterhunt.sn !== currentSn) continue; // Different server
      activeQuests.push({ monster: character.s.monsterhunt.id, ms: character.s.monsterhunt.ms });
    }
    activeQuests.sort((a, b) => a.ms - b.ms);
    const monsterHuntMonsters: MonsterKey[] = [];
    for (const quest of activeQuests) {
      if (!monsterHuntMonsters.includes(quest.monster)) {
        monsterHuntMonsters.push(quest.monster);
      }
    }
    const monsters = monsterHuntMonsters.length ? monsterHuntMonsters : MONSTERS;

    for (const character of characters) {
      if (character.ctype === "merchant") continue;

      const needNewHunt = character.s.monsterhunt === undefined;
      const finishedHunt = !needNewHunt && character.s.monsterhunt!.c <= 0;
      if (needNewHunt || finishedHunt) {
        logInformational(`${character.id}: getting new monster hunt quest`);
        moveTeardown(character);
        attackTeardown(character);
        await character.smartMove("monsterhunter");
        if (finishedHunt && character.s.monsterhunt) {
          // TODO: Add time it took
          logInformational(`${character.id}: finishing monster hunt quest for ${character.s.monsterhunt.id}`);
          await character.finishMonsterHuntQuest();
        }
        const quest = await character.getMonsterHuntQuest();
        logInformational(`${character.id}: got new monster hunt quest for ${quest.c} ${quest.id}`);
      }

      attackSetup(character, { monsters: MONSTERS });
      moveSetup(character, [monsters[0]!]);
    }
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logDebug(`logicLoop: ${e}`);
  } finally {
    setTimeout(() => void logicLoop(), 1_000);
  }
};
void logicLoop();
