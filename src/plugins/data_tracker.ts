import { EventBus } from "alclient";
import fs from "fs";
import path from "path";
import type { MapKey, MonsterKey, ServerKey } from "typed-adventureland";
import url from "url";
import { logWarning } from "../utilities/logging.js";

/**
 * This plugin tracks monsters and players
 */

const LOOP_INTERVAL_MS = 30_000; // 30 Seconds
const STALE_MS = 300_000; // 5 Minutes

// TODO: Review list
const WANT_TO_TRACK = new Set<MonsterKey>([
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
  "a7",
  "a8",
  "bgoo",
  "cutebee",
  "franky",
  "fvampire",
  "gbluepro",
  "ggreenpro",
  "gpurplepro",
  "gredpro",
  "goldenbat",
  "goldenbot",
  "greenjr",
  "icegolem",
  "jr",
  "mvampire",
  "rgoo",
  "rharpy",
  "skeletor",
  "snowman",
  "stompy",
  "spiderbl",
  "spiderbr",
  "spiderr",
  "vbat",
  "xmagefi",
  "xmagefz",
  "xmagen",
  "xmagex",
]);

type CharacterData = {
  lastSeen: number;
  x: number;
  y: number;
  map: MapKey;
  in: string;
};
type MonsterData = {
  id: string;
  lastSeen: number;
  x: number;
  y: number;
  map: MapKey;
  in: string;
  target?: string;
};
type ServerData = {
  characters: {
    [T in string]?: CharacterData;
  };
  monsters: {
    [T in MonsterKey]?: MonsterData[];
  };
};

const serverData = new Map<ServerKey, ServerData>();

EventBus.on("entities_updated", (observer, monsters, characters) => {
  const key = observer.server.key;
  const lastSeen = Date.now();

  // Get the server data
  let serverDatum = serverData.get(key);
  if (serverDatum === undefined) {
    serverDatum = {
      characters: {},
      monsters: {},
    };
    serverData.set(key, serverDatum);
  }

  // Update the server data with monsters we see
  for (const monster of monsters) {
    if (!WANT_TO_TRACK.has(monster.type)) continue;

    serverDatum.monsters[monster.type] ??= [];

    const existing = serverDatum.monsters[monster.type]!.find((m) => m.id === monster.id);
    if (existing) {
      // Update
      existing.lastSeen = lastSeen;
      existing.map = monster.map;
      existing.in = monster.in;
      existing.x = monster.x;
      existing.y = monster.y;
    } else {
      // Add
      serverDatum.monsters[monster.type]!.push({
        id: monster.id,
        lastSeen,
        map: monster.map,
        in: monster.in,
        x: monster.x,
        y: monster.y,
        target: monster.target,
      });
    }
  }

  // Update the server data with characters we see
  for (const character of characters) {
    serverDatum.characters[character.id] = {
      lastSeen,
      x: character.x,
      y: character.y,
      map: character.map,
      in: character.in,
    };
  }
});

EventBus.on("monster_death", (observer, monster) => {
  const key = observer.server.key;

  const serverDatum = serverData.get(key);

  if (serverDatum?.monsters[monster.type] === undefined) return; // No data

  const existing = serverDatum.monsters[monster.type]!.find((m) => m.id === monster.id);
  if (existing === undefined) return;

  // Remove it
  serverDatum.monsters[monster.type]!.splice(serverDatum.monsters[monster.type]!.indexOf(existing), 1);
});

const DATA_FOLDER = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../../data");
const MONSTER_DATA_FOLDER = path.join(DATA_FOLDER, `monsters`);
const CHARACTER_DATA_FOLDER = path.join(DATA_FOLDER, `characters`);
fs.mkdirSync(MONSTER_DATA_FOLDER, { recursive: true });
fs.mkdirSync(CHARACTER_DATA_FOLDER, { recursive: true });

// Load the monsters from the data folder
for (const serverKey of fs.readdirSync(MONSTER_DATA_FOLDER)) {
  const serverDatum: ServerData = {
    characters: {},
    monsters: {},
  };
  serverData.set(serverKey as ServerKey, serverDatum);

  const serverFolder = path.join(MONSTER_DATA_FOLDER, serverKey);
  for (const type of fs.readdirSync(serverFolder)) {
    serverDatum.monsters[type as MonsterKey] = JSON.parse(
      fs.readFileSync(path.join(serverFolder, type), "utf8"),
    ) as MonsterData[];
  }
}

// Load the characters from the data folder
for (const serverKey of fs.readdirSync(MONSTER_DATA_FOLDER)) {
  let serverDatum = serverData.get(serverKey as ServerKey);
  if (serverDatum === undefined) {
    serverDatum = {
      characters: {},
      monsters: {},
    };
    serverData.set(serverKey as ServerKey, serverDatum);
  }

  const serverFolder = path.join(CHARACTER_DATA_FOLDER, serverKey);
  for (const id of fs.readdirSync(serverFolder)) {
    serverDatum.characters[id] = JSON.parse(fs.readFileSync(path.join(serverFolder, id), "utf8")) as CharacterData;
  }
}

const loop = () => {
  try {
    /** If we haven't seen the monster since this timestamp, it's stale */
    const staleCutoff = Date.now() - STALE_MS;

    for (const [serverKey, serverDatum] of serverData.entries()) {
      // Ensure the base directories exist
      const monsterServerFolder = path.join(MONSTER_DATA_FOLDER, serverKey as string);
      const characterServerFolder = path.join(CHARACTER_DATA_FOLDER, serverKey as string);
      fs.mkdirSync(monsterServerFolder, { recursive: true });
      fs.mkdirSync(characterServerFolder, { recursive: true });

      for (const [type, monsters] of Object.entries(serverDatum.monsters)) {
        // Remove stale monsters
        serverDatum.monsters[type as MonsterKey] = monsters.filter((monster) => monster.lastSeen >= staleCutoff);

        for (const monster of monsters) {
          if (monster.lastSeen < staleCutoff) {
            // Remove it
            monsters.splice(monsters.indexOf(monster), 1);
          }
        }

        // Cache the monsters
        fs.writeFileSync(path.join(monsterServerFolder, type), JSON.stringify(monsters));
      }

      for (const [id, character] of Object.entries(serverDatum.characters)) {
        // Remove stale characters
        if (character!.lastSeen < staleCutoff) {
          delete serverDatum.characters[id];
          continue;
        }

        // Cache the characters
        const characterPath = path.join(characterServerFolder, id);
        if (fs.existsSync(characterPath)) {
          const existing = JSON.parse(fs.readFileSync(characterPath, "utf8")) as CharacterData;
          if (existing.lastSeen >= character!.lastSeen) {
            // We have newer data saved
            character!.map = existing.map;
            character!.in = existing.in;
            character!.x = existing.x;
            character!.y = existing.y;
            continue;
          }
        }
        fs.writeFileSync(characterPath, JSON.stringify(character));
      }
    }
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logWarning(e);
  } finally {
    setTimeout(loop, LOOP_INTERVAL_MS);
  }
};

void loop();

export default serverData;
