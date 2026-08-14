import { beforeEach, expect, test } from "bun:test";
import { pushSQLiteSchema } from "drizzle-kit/api";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { db } from "../../../src/db/index.js";
import * as schema from "../../../src/db/schema.js";
import { items as dbItems } from "../../../src/db/schema.js";
import { getEmptyBankSlotsCount } from "../../../src/utilities/items.js";

beforeEach(async () => {
  // Clear DB to ensure a fresh state
  const { apply } = await pushSQLiteSchema(schema, db as unknown as LibSQLDatabase<typeof schema>);
  await apply();
});

test("`getEmptyBankSlotsCount()` counts empty bank slots correctly", () => {
  db.insert(dbItems)
    .values([
      { key: "items0", items: [null, null, { name: "hpot1" }] },
      { key: "items10", items: [null, { name: "mpot1" }, null, null] },
      { key: "items30", items: [null, null, null, null] },
      { key: "character1", items: [null, null] },
    ])
    .run();

  expect(getEmptyBankSlotsCount("bank")).toBe(2);
  expect(getEmptyBankSlotsCount("bank_b")).toBe(3);
  expect(getEmptyBankSlotsCount("bank_u")).toBe(4);
  expect(getEmptyBankSlotsCount()).toBe(9);
});
