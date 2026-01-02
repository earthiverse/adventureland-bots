import { EventBus } from "alclient";
import fs from "fs";
import path from "path";
import type {
  BankPackTypeItemsOnly,
  GData,
  ItemInfo,
  MapKey,
  MonsterKey,
  ServerKey,
  ServerToClient_server_info_live,
  ServerToClient_server_info_notlive,
} from "typed-adventureland";
import url from "url";
import { WANT_TO_TRACK } from "../../config/monsters.js";
import { logWarning } from "../utilities/logging.js";

/**
 * This plugin tracks various data
 */

const LOOP_INTERVAL_MS = 30_000; // 30 Seconds
const STALE_MS = 300_000; // 5 Minutes

type CharacterData = {
  lastSeen: number;
  x: number;
  y: number;
  map: MapKey;
  in: string;
};
type MonsterData = {
  firstSeen: number;
  lastSeen: number;
  id?: string;
  x?: number;
  y?: number;
  map?: MapKey;
  in?: string;
  target?: string;
  hp?: number;
};
type ServerData = {
  /** Recently seen characters */
  characters: {
    [T in string]?: CharacterData;
  };
  /** Recently seen monsters */
  monsters: {
    [T in MonsterKey]?: MonsterData[];
  };
  /** Time the next monster will spawn */
  spawns: {
    [T in MonsterKey]?: number;
    // TODO: Add location where it died
    // TODO: Track temporal orb usage
  };
};

export const serverData = new Map<ServerKey, ServerData>();
export const itemData = new Map<string, (ItemInfo | null)[]>();

function getServerData(key: ServerKey): ServerData {
  let serverDatum = serverData.get(key);
  if (serverDatum === undefined) {
    serverDatum = {
      characters: {},
      monsters: {},
      spawns: {},
    };
    serverData.set(key, serverDatum);
  }
  return serverDatum;
}

EventBus.on("entities_updated", (observer, monsters, characters) => {
  const key = observer.server.key;
  const lastSeen = Date.now();

  const serverDatum = getServerData(key);

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
      existing.hp = monster.hp;
    } else {
      // Add
      serverDatum.monsters[monster.type]!.push({
        id: monster.id,
        firstSeen: lastSeen,
        lastSeen,
        map: monster.map,
        in: monster.in,
        x: monster.x,
        y: monster.y,
        target: monster.target,
        hp: monster.hp,
      });
    }

    delete serverDatum.spawns[monster.type]; // Clear the spawn time
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

function getNextSpawn(G: GData, type: MonsterKey): number | undefined {
  const gMonster = G.monsters[type];
  if (gMonster.respawn < 0) {
    return undefined; // It doesn't respawn
  } else if (gMonster.respawn <= 200) {
    // If respawn is <= 200s, it respawns at that time
    return Date.now() + gMonster.respawn * 1000;
  } else {
    // Otherwise, it respawns randomly between 28% early and 10% late (we'll use the late value)
    return Date.now() + gMonster.respawn * 1100;
  }
}

EventBus.on("monster_death", (observer, monster) => {
  if (!WANT_TO_TRACK.has(monster.type)) return;

  const key = observer.server.key;

  const serverDatum = getServerData(key);

  const existing = serverDatum.monsters[monster.type]?.find((m) => m.id === monster.id);

  // Update the next spawn time
  serverDatum.spawns[monster.type] = getNextSpawn(observer.game.G, monster.type);

  if (existing !== undefined)
    // Remove it
    serverDatum.monsters[monster.type]!.splice(serverDatum.monsters[monster.type]!.indexOf(existing), 1);
});

EventBus.on("server_info_updated", (observer, serverInfo) => {
  const key = observer.server.key;
  const lastSeen = Date.now();

  const serverDatum = getServerData(key);

  for (const monsterKey of Object.keys(serverInfo) as MonsterKey[]) {
    if (!WANT_TO_TRACK.has(monsterKey)) continue;

    const gMonster = observer.game.G.monsters[monsterKey];
    if (gMonster === undefined) continue; // Not a valid monster key

    serverDatum.monsters[monsterKey] ??= [];

    const data = serverInfo[monsterKey] as ServerToClient_server_info_live | ServerToClient_server_info_notlive;
    if (data.live === true) {
      const existing = serverDatum.monsters[monsterKey][0];
      if (existing) {
        // Update
        existing.lastSeen = lastSeen;
        if (data.map !== undefined) {
          existing.map = data.map;
          existing.in = data.map;
        }
        if (data.x !== undefined) existing.x = data.x;
        if (data.y !== undefined) existing.y = data.y;
        if (data.target !== undefined) existing.target = data.target;
        if (data.hp !== undefined) existing.hp = data.hp;
      } else {
        // Add
        serverDatum.monsters[monsterKey].push({
          firstSeen: lastSeen,
          lastSeen,
          map: data.map,
          in: data.map,
          x: data.x,
          y: data.y,
          target: data.target,
          hp: data.hp,
        });
      }
    } else {
      const existing = serverDatum.monsters[monsterKey][0];

      // Update the next spawn time
      if (data.spawn) {
        serverDatum.spawns[monsterKey] = Date.parse(data.spawn);
      } else if (existing !== undefined) {
        serverDatum.spawns[monsterKey] = getNextSpawn(observer.game.G, monsterKey);
      }

      serverDatum.monsters[monsterKey] = []; // Remove it
    }
  }
});

EventBus.on("bank_updated", (_character, bank) => {
  for (const packName in bank) {
    if (!packName.startsWith("items")) continue; // Not items
    const items = bank[packName as BankPackTypeItemsOnly];
    itemData.set(packName, items);
  }
});

EventBus.on("items_updated", (character, items) => {
  itemData.set(character.id, items);
});

const DATA_FOLDER = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../../data");
const CHARACTER_DATA_FOLDER = path.join(DATA_FOLDER, `characters`);
const MONSTER_DATA_FOLDER = path.join(DATA_FOLDER, `monsters`);
const SPAWN_DATA_FOLDER = path.join(DATA_FOLDER, `spawns`);
fs.mkdirSync(CHARACTER_DATA_FOLDER, { recursive: true });
fs.mkdirSync(MONSTER_DATA_FOLDER, { recursive: true });
fs.mkdirSync(SPAWN_DATA_FOLDER, { recursive: true });

// Load the monsters from the data folder
for (const serverKey of fs.readdirSync(MONSTER_DATA_FOLDER)) {
  const serverDatum = getServerData(serverKey as ServerKey);
  const serverFolder = path.join(MONSTER_DATA_FOLDER, serverKey);

  for (const type of fs.readdirSync(serverFolder)) {
    serverDatum.monsters[type as MonsterKey] = JSON.parse(
      fs.readFileSync(path.join(serverFolder, type), "utf8"),
    ) as MonsterData[];
  }
}

// Load the characters from the data folder
for (const serverKey of fs.readdirSync(CHARACTER_DATA_FOLDER)) {
  const serverDatum = getServerData(serverKey as ServerKey);
  const serverFolder = path.join(CHARACTER_DATA_FOLDER, serverKey);

  for (const id of fs.readdirSync(serverFolder)) {
    serverDatum.characters[id] = JSON.parse(fs.readFileSync(path.join(serverFolder, id), "utf8")) as CharacterData;
  }
}

// Load the spawns from the data folder
for (const serverKey of fs.readdirSync(SPAWN_DATA_FOLDER)) {
  const serverDatum = getServerData(serverKey as ServerKey);
  const serverFolder = path.join(SPAWN_DATA_FOLDER, serverKey);

  for (const type of fs.readdirSync(serverFolder)) {
    serverDatum.spawns[type as MonsterKey] = Number.parseInt(fs.readFileSync(path.join(serverFolder, type), "utf8"));
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
      const respawnServerFolder = path.join(SPAWN_DATA_FOLDER, serverKey as string);
      fs.mkdirSync(monsterServerFolder, { recursive: true });
      fs.mkdirSync(characterServerFolder, { recursive: true });
      fs.mkdirSync(respawnServerFolder, { recursive: true });

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

      for (const [type, spawnTime] of Object.entries(serverDatum.spawns)) {
        // Remove stale spawns
        if (spawnTime < staleCutoff || spawnTime === undefined) {
          delete serverDatum.spawns[type as MonsterKey];
          continue;
        }

        // Cache the spawns
        fs.writeFileSync(path.join(SPAWN_DATA_FOLDER, serverKey, type), spawnTime.toString());
      }
    }
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logWarning(e);
  } finally {
    setTimeout(loop, LOOP_INTERVAL_MS);
  }
};

void loop();
