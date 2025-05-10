import type { Config } from "../../config/items.js";
import { wantToDestroy } from "../../src/utilities/items.js";

test("`wantToDestroy()` works", () => {
  // We don't have bows in our config
  let config: Config = {};
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(false);

  // We don't have bows set to be destroyed
  config = { bow: {} };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(false);

  // We want to destroy bows @ level 0
  config = { bow: { destroy: {} } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(false);

  // We want to destroy bows (including special ones) @ level 0
  config = { bow: { destroy: { destroySpecial: true } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(false);

  // We want to destroy bows up to level 1
  config = { bow: { destroy: { destroyUpToLevel: 1 } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 2 }, config)).toBe(false);

  // We want to destroy bows (including special ones) up to level 1
  config = { bow: { destroy: { destroySpecial: true, destroyUpToLevel: 1 } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 2 }, config)).toBe(false);
});
