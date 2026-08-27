import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { CharacterEntitySlotsInfos, ItemInfo } from "typed-adventureland";

export const characters = sqliteTable(
  "characters",
  {
    id: text(),
    serverKey: text(),
    lastSeen: integer({ mode: "timestamp_ms" }),
    x: real(),
    y: real(),
    map: text(),
    in: text(),
    owner: text(),
    slots: text({ mode: "json" }).$type<CharacterEntitySlotsInfos | undefined>(),
  },
  (table) => [primaryKey({ columns: [table.id, table.serverKey] })],
);

export const monsters = sqliteTable(
  "monsters",
  {
    id: text(),
    serverKey: text(),
    type: text(),
    firstSeen: integer({ mode: "timestamp_ms" }),
    lastSeen: integer({ mode: "timestamp_ms" }),
    x: real(),
    y: real(),
    map: text(),
    in: text(),
    target: text(),
    hp: integer(),
  },
  (table) => [primaryKey({ columns: [table.id, table.serverKey] })],
);

export const spawns = sqliteTable(
  "spawns",
  {
    type: text(),
    serverKey: text(),
    nextSpawn: integer({ mode: "timestamp_ms" }),
  },
  (table) => [primaryKey({ columns: [table.type, table.serverKey] })],
);

export const items = sqliteTable("items", {
  key: text().primaryKey(),
  items: text({ mode: "json" }).$type<(ItemInfo | null)[]>().notNull(),
});
