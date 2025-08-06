import { Game } from "alclient";
import type { GData } from "typed-adventureland";
import type { Config } from "../../config/items.js";
import { getGFromCache } from "../../src/plugins/g_cache.js";
import { adjustItemConfig, wantToDestroy, wantToSell } from "../../src/utilities/items.js";

let g: GData | undefined = undefined;
beforeAll(async () => {
  g = getGFromCache() ?? (await new Game().updateG());
}, 15_000);

test("`wantToDestroy()` does not destroy items that are not in the config", () => {
  const config: Config = {};
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(false);
});

test("`wantToDestroy()` does not destroy items that have a config, but do not have a destroy config", () => {
  const config: Config = { bow: {} };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(false);
});

test("`wantToDestroy()` destroys only non-special level 0 items when destroy config is set, but empty", () => {
  const config: Config = { bow: { destroy: {} } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(false);
});

test("`wantToDestroy()` destroys special and non-special level 0 items when destroySpecial is set", () => {
  const config: Config = { bow: { destroy: { destroySpecial: true } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(false);
});

test("`wantToDestroy()` destroys items up to the set level", () => {
  const config: Config = { bow: { destroy: { destroyUpToLevel: 1 } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 2 }, config)).toBe(false);
});

test("`wantToDestroy()` destroys special and non-special items up to the set level when destroySpecial is set", () => {
  const config: Config = { bow: { destroy: { destroySpecial: true, destroyUpToLevel: 1 } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 2 }, config)).toBe(false);
});

test("`wantToSell()` does not sell items that are not in the config", () => {
  const config: Config = {};
  expect(wantToSell({ name: "hbow", level: 0 }, g as GData, "npc", config)).toBe(false);
});

test("`wantToSell()` does not sell items that have a config, but do not have a sell config", () => {
  const config: Config = { bow: {} };
  expect(wantToSell({ name: "bow", level: 0 }, g as GData, "npc", config)).toBe(false);
});

test("`wantToSell()` sells only non-special level 0 items when sellPrice is not an object", () => {
  const config: Config = { bow: { sell: { sellPrice: "npc" } } };
  expect(wantToSell({ name: "bow", level: 0 }, g as GData, "npc", config)).toBe(true);
  expect(wantToSell({ name: "bow", level: 0, p: "shiny" }, g as GData, "npc", config)).toBe(false);
  expect(wantToSell({ name: "bow", level: 1 }, g as GData, "npc", config)).toBe(false);
});

test("`adjustItemConfig()` computes the buyPrice for `g`", () => {
  // Buy price should be set from "g"
  const config: Config = {
    hbow: {
      buy: {
        buyPrice: "g",
      },
    },
  };
  adjustItemConfig(config, g as GData);
  expect(g!.items.hbow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g!.items.hbow.g);
});

test("`adjustItemConfig()` computes the buyPrice for `goblin`", () => {
  // Buy price should be set from "g"
  const config: Config = {
    hbow: {
      buy: {
        buyPrice: "goblin",
      },
    },
  };
  adjustItemConfig(config, g as GData);
  expect(g!.items.hbow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g!.items.hbow.g * g!.multipliers.lostandfound_mult);
});

test("`adjustItemConfig()` computes the buyPrice for `ponty`", () => {
  // Buy price should be set from "g"
  const config: Config = {
    hbow: {
      buy: {
        buyPrice: "ponty",
      },
    },
  };
  adjustItemConfig(config, g as GData);
  expect(g!.items.hbow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g!.items.hbow.g * g!.multipliers.secondhands_mult);
});

test("`adjustItemConfig()` computes the buyPrice for `npc`", () => {
  // Buy price should be set from "g"
  const config: Config = {
    hbow: {
      buy: {
        buyPrice: "npc",
      },
    },
  };
  adjustItemConfig(config, g as GData);
  expect(g!.items.hbow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g!.items.hbow.g * g!.multipliers.buy_to_sell);
});

test("`adjustItemConfig()` computes the buyPrice for multiplier (`x${number}`)", () => {
  // Buy price should be set from "g"
  const config: Config = {
    hbow: {
      buy: {
        buyPrice: "x2.5",
      },
    },
  };
  adjustItemConfig(config, g as GData);
  expect(g!.items.hbow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g!.items.hbow.g * 2.5);
});
