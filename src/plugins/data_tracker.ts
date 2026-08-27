import { EventBus } from "alclient";
import { and, eq, lt } from "drizzle-orm";
import type {
  BankPackTypeItemsOnly,
  GData,
  MonsterKey,
  ServerToClient_server_info_live,
  ServerToClient_server_info_notlive,
} from "typed-adventureland";
import { WANT_TO_TRACK } from "../../config/monsters.js";
import { db } from "../db/index.js";
import {
  characters as dbCharacters,
  items as dbItems,
  monsters as dbMonsters,
  spawns as dbSpawns,
} from "../db/schema.js";
import { logWarning } from "../utilities/logging.js";

/**
 * This plugin tracks various data
 */

const LOOP_INTERVAL_MS = 30_000; // 30 Seconds
const STALE_MS = 300_000; // 5 Minutes

EventBus.on("entities_updated", (observer, monsters, characters) => {
  const serverKey = observer.server.key;
  const lastSeen = new Date();

  // Update the server data with monsters we see
  for (const monster of monsters) {
    if (!WANT_TO_TRACK.has(monster.type)) continue;

    db.insert(dbMonsters)
      .values({
        id: monster.id,
        serverKey,
        type: monster.type,
        firstSeen: lastSeen,
        lastSeen,
        x: monster.x,
        y: monster.y,
        map: monster.map,
        in: monster.in,
        target: monster.target,
        hp: monster.hp,
      })
      .onConflictDoUpdate({
        target: [dbMonsters.id, dbMonsters.serverKey],
        set: {
          lastSeen,
          x: monster.x,
          y: monster.y,
          map: monster.map,
          in: monster.in,
          target: monster.target,
          hp: monster.hp,
        },
      })
      .run();

    // Clear the spawn time
    db.delete(dbSpawns)
      .where(and(eq(dbSpawns.type, monster.type), eq(dbSpawns.serverKey, serverKey)))
      .run();
  }

  // Update the server data with characters we see
  for (const character of characters) {
    const insertValues: typeof dbCharacters.$inferInsert = {
      id: character.id,
      serverKey,
      lastSeen,
      x: character.x,
      y: character.y,
      map: character.map,
      in: character.in,
    };
    if (character.owner !== undefined) insertValues.owner = character.owner;
    if (character.slots !== undefined) insertValues.slots = character.slots;

    const setValues: Partial<typeof dbCharacters.$inferInsert> = {
      lastSeen,
      x: character.x,
      y: character.y,
      map: character.map,
      in: character.in,
    };
    if (character.owner !== undefined) setValues.owner = character.owner;
    if (character.slots !== undefined) setValues.slots = character.slots;

    db.insert(dbCharacters)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [dbCharacters.id, dbCharacters.serverKey],
        set: setValues,
      })
      .run();
  }
});

function getNextSpawn(g: GData, type: MonsterKey): number | undefined {
  const gMonster = g.monsters[type];
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

  let nextSpawn: Date | number | undefined = getNextSpawn(observer.game.G, monster.type);
  if (nextSpawn === undefined) return; // Doesn't respawn
  nextSpawn = new Date(nextSpawn);

  const serverKey = observer.server.key;

  // Remove it from the monsters DB
  db.delete(dbMonsters)
    .where(and(eq(dbMonsters.id, monster.id), eq(dbMonsters.serverKey, serverKey)))
    .run();

  // Update the next spawn time
  db.insert(dbSpawns)
    .values({
      type: monster.type,
      serverKey,
      nextSpawn,
    })
    .onConflictDoUpdate({
      target: [dbSpawns.type, dbSpawns.serverKey],
      set: {
        nextSpawn,
      },
    })
    .run();
});

EventBus.on("server_info_updated", (observer, serverInfo) => {
  const key = observer.server.key;
  const lastSeen = new Date();

  for (const type of Object.keys(serverInfo) as MonsterKey[]) {
    if (!WANT_TO_TRACK.has(type)) continue;

    const gMonster = observer.game.G.monsters[type];
    if (gMonster === undefined) continue; // Not a valid monster key

    const data = serverInfo[type] as ServerToClient_server_info_live | ServerToClient_server_info_notlive;
    if (data.live) {
      const update: Partial<typeof dbMonsters.$inferInsert> = {
        lastSeen,
      };
      if (data.x !== undefined) update.x = data.x;
      if (data.y !== undefined) update.y = data.y;
      if (data.map !== undefined) {
        update.map = data.map;
        update.in = data.map;
      }
      if (data.hp !== undefined) update.hp = data.hp;
      if (data.target !== undefined) update.target = data.target;

      db.update(dbMonsters)
        .set(update)
        .where(and(eq(dbMonsters.type, type), eq(dbMonsters.serverKey, key)))
        .run();
    } else {
      if (!data.spawn) return; // No data for next spawn
      const nextSpawn = new Date(Date.parse(data.spawn));

      db.insert(dbSpawns)
        .values({
          type,
          serverKey: key,
          nextSpawn,
        })
        .onConflictDoUpdate({
          target: [dbSpawns.type, dbSpawns.serverKey],
          set: {
            nextSpawn,
          },
        })
        .run();
    }
  }
});

EventBus.on("bank_updated", (_character, bank) => {
  for (const packName in bank) {
    if (!packName.startsWith("items")) continue; // Not items
    const items = bank[packName as BankPackTypeItemsOnly];
    db.insert(dbItems)
      .values({
        key: packName,
        items,
      })
      .onConflictDoUpdate({
        target: dbItems.key,
        set: { items },
      })
      .run();
  }
});

EventBus.on("items_updated", (character, items) => {
  db.insert(dbItems)
    .values({
      key: character.id,
      items,
    })
    .onConflictDoUpdate({
      target: dbItems.key,
      set: { items },
    })
    .run();
});

const loop = () => {
  try {
    /** If we haven't seen the monster since this timestamp, it's stale */
    const staleCutoff = new Date(Date.now() - STALE_MS);

    // Don't delete stale characters, only monsters

    db.delete(dbMonsters).where(lt(dbMonsters.lastSeen, staleCutoff)).run();
    db.delete(dbSpawns).where(lt(dbSpawns.nextSpawn, staleCutoff)).run();
  } catch (e) {
    if (e instanceof Error || typeof e === "string") logWarning(e);
  } finally {
    setTimeout(loop, LOOP_INTERVAL_MS);
  }
};

void loop();
