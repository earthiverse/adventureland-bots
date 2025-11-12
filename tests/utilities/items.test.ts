import { Game } from "alclient";
import type { DismantleKey, GData, ItemInfo, ItemKey } from "typed-adventureland";
import { CRAFT, DISMANTLE, EXCHANGE, type ItemsConfig } from "../../config/items.js";
import { getGFromCache } from "../../src/plugins/g_cache.js";
import {
  adjustItemConfig,
  getCraftableItems,
  wantToDestroy,
  wantToDismantle,
  wantToSell,
} from "../../src/utilities/items.js";

let g: GData | undefined = undefined;
const itemsToCraftOrbOfAdventures: ItemInfo[] = [
  {
    name: "orboffire",
    level: 0,
  },
  {
    name: "orboffrost",
    level: 0,
  },
  {
    name: "orbofplague",
    level: 0,
  },
  {
    name: "orbofresolve",
    level: 0,
  },
];
beforeAll(async () => {
  g = getGFromCache() ?? (await new Game().updateG());
}, 15_000);

test("`getCraftableItems()` returns an empty array when we don't have any craft config", () => {
  const config: ItemsConfig = {};
  if (g === undefined) throw new Error("G data is not available");
  const result = getCraftableItems(itemsToCraftOrbOfAdventures, g, config);
  expect(result).toEqual([]);
});

test("`getCraftableItems()` checks quantities in recipes", () => {
  const config: ItemsConfig = {
    cake: {
      ...CRAFT,
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  const result = getCraftableItems(
    [
      {
        name: "whiteegg",
        q: 9, // Not enough for crafting
      },
    ],
    g,
    config,
  );
  expect(result).toEqual([]);
});

test("`getCraftableItems()` returns craftable items", () => {
  const config: ItemsConfig = {
    cake: {
      ...CRAFT,
    },
    orba: {
      ...CRAFT,
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  expect(getCraftableItems(itemsToCraftOrbOfAdventures, g, config)).toEqual([["orba", [0, 1, 2, 3]]]);

  expect(
    getCraftableItems(
      [
        ...itemsToCraftOrbOfAdventures,
        {
          name: "whiteegg",
          q: 10,
        },
      ],
      g,
      config,
    ),
  ).toEqual([
    ["cake", [4]],
    ["orba", [0, 1, 2, 3]],
  ]);
});

test("`wantToDestroy()` does not destroy items that are not in the config", () => {
  const config: ItemsConfig = {};
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(false);
});

test("`wantToDestroy()` does not destroy items that have a config, but do not have a destroy config", () => {
  const config: ItemsConfig = { bow: {} };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(false);
});

test("`wantToDestroy()` destroys only non-special level 0 items when destroy config is set, but empty", () => {
  const config: ItemsConfig = { bow: { destroy: {} } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(false);
});

test("`wantToDestroy()` destroys special and non-special level 0 items when destroySpecial is set", () => {
  const config: ItemsConfig = { bow: { destroy: { destroySpecial: true } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(false);
});

test("`wantToDestroy()` destroys items up to the set level", () => {
  const config: ItemsConfig = { bow: { destroy: { destroyUpToLevel: 1 } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(false);
  expect(wantToDestroy({ name: "bow", level: 2 }, config)).toBe(false);
});

test("`wantToDestroy()` destroys special and non-special items up to the set level when destroySpecial is set", () => {
  const config: ItemsConfig = { bow: { destroy: { destroySpecial: true, destroyUpToLevel: 1 } } };
  expect(wantToDestroy({ name: "bow", level: 0 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 0, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1 }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 1, p: "shiny" }, config)).toBe(true);
  expect(wantToDestroy({ name: "bow", level: 2 }, config)).toBe(false);
});

test("`wantToDismantle()` does not dismantle items that are not in the config", () => {
  const config: ItemsConfig = {};
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToDismantle({ name: "orba", level: 1 }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config)).toBe(
    false,
  );
});

test("`wantToDismantle()` dismantles only non-special items when dismantleSpecial is not set", () => {
  const config: ItemsConfig = {
    orba: { dismantle: {} },
  };
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToDismantle({ name: "orba", level: 1 }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config)).toBe(
    true,
  );
  expect(
    wantToDismantle(
      { name: "orba", level: 1, p: "shiny" },
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      g,
      config,
    ),
  ).toBe(false);
});

test("`wantToDismantle()` dismantles special and non-special items when dismantleSpecial is set", () => {
  const config: ItemsConfig = {
    orba: { dismantle: { dismantleSpecial: true } },
  };
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToDismantle({ name: "orba", level: 1 }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config)).toBe(
    true,
  );
  expect(
    wantToDismantle(
      { name: "orba", level: 1, p: "shiny" },
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      g,
      config,
    ),
  ).toBe(true);
});

test("`wantToDismantle()` does not dismantle items that have a config, but do not have a dismantle config", () => {
  const config: ItemsConfig = {
    orba: {},
  };
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToDismantle({ name: "orba", level: 1 }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config)).toBe(
    false,
  );
});

test("`wantToDismantle()` dismantles compoundable items", () => {
  const config: ItemsConfig = {
    lostearring: { dismantle: {} },
    orba: { dismantle: {} },
  };
  if (g === undefined) throw new Error("G data is not available");
  // Level 0 compoundables cannot be dismantled (unless set in G.dismantle, but orba is not)
  expect(wantToDismantle({ name: "orba", level: 0 }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config)).toBe(
    false,
  );

  // lostearring is also dismantleable at level 0
  expect(
    wantToDismantle({ name: "lostearring", level: 0 }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config),
  ).toBe(true);

  // Leveled compoundables can be dismantled
  for (const itemName of ["orba", "lostearring"] as ItemKey[]) {
    for (let level = 1; level <= 5; level++) {
      expect(
        wantToDismantle({ name: itemName, level }, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, g, config),
      ).toBe(true);
    }
  }
});

test("`wantToSell()` does not sell items that are not in the config", () => {
  const config: ItemsConfig = {};
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToSell({ name: "hbow", level: 0 }, g, "npc", config)).toBe(false);
});

test("`wantToSell()` does not sell items that have a config, but do not have a sell config", () => {
  const config: ItemsConfig = { bow: {} };
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToSell({ name: "bow", level: 0 }, g, "npc", config)).toBe(false);
});

test("`wantToSell()` sells only non-special level 0 items when sellPrice is not an object", () => {
  const config: ItemsConfig = { bow: { sell: { sellPrice: "npc" } } };
  if (g === undefined) throw new Error("G data is not available");
  expect(wantToSell({ name: "bow", level: 0 }, g, "npc", config)).toBe(true);
  expect(wantToSell({ name: "bow", level: 0, p: "shiny" }, g, "npc", config)).toBe(false);
  expect(wantToSell({ name: "bow", level: 1 }, g, "npc", config)).toBe(false);
});

test("`adjustItemConfig()` computes the buyPrice and sellPrice for `g`", () => {
  const config: ItemsConfig = {
    hbow: {
      buy: {
        buyPrice: "g",
      },
    },
    t2bow: {
      sell: {
        sellPrice: "g",
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);
  expect(g.items.hbow.g).toBeGreaterThan(0);
  expect(g.items.t2bow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g.items.hbow.g);
  expect(config.t2bow!.sell!.sellPrice).toBe(g.items.t2bow.g);
});

test("`adjustItemConfig()` computes the buyPrice and sellPrice for `goblin`", () => {
  // Buy price should be set from "g"
  const config: ItemsConfig = {
    hbow: {
      buy: {
        buyPrice: "goblin",
      },
    },
    t2bow: {
      sell: {
        sellPrice: "goblin",
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);
  expect(g.items.hbow.g).toBeGreaterThan(0);
  expect(g.items.t2bow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g.items.hbow.g * g.multipliers.lostandfound_mult);
  expect(config.t2bow!.sell!.sellPrice).toBe(g.items.t2bow.g * g.multipliers.lostandfound_mult);
});

test("`adjustItemConfig()` computes the buyPrice and sellPrice for `ponty`", () => {
  const config: ItemsConfig = {
    hbow: {
      buy: {
        buyPrice: "ponty",
      },
    },
    t2bow: {
      sell: {
        sellPrice: "ponty",
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);
  expect(g.items.hbow.g).toBeGreaterThan(0);
  expect(g.items.t2bow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g.items.hbow.g * g.multipliers.secondhands_mult);
  expect(config.t2bow!.sell!.sellPrice).toBe(g.items.t2bow.g * g.multipliers.secondhands_mult);
});

test("`adjustItemConfig()` computes the buyPrice and sellPrice for `npc`", () => {
  // Buy price should be set from "g"
  const config: ItemsConfig = {
    hbow: {
      buy: {
        buyPrice: "npc",
      },
    },
    t2bow: {
      sell: {
        sellPrice: "npc",
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);
  expect(g.items.hbow.g).toBeGreaterThan(0);
  expect(g.items.t2bow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g.items.hbow.g * g.multipliers.buy_to_sell);
  expect(config.t2bow!.sell!.sellPrice).toBe(g.items.t2bow.g * g.multipliers.buy_to_sell);
});

test("`adjustItemConfig()` computes the buyPrice and sellPrice for multipliers (`x${number}`)", () => {
  // Buy price should be set from "g"
  const config: ItemsConfig = {
    hbow: {
      buy: {
        buyPrice: "x2.5",
      },
    },
    t2bow: {
      sell: {
        sellPrice: "x4.8",
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);
  expect(g.items.hbow.g).toBeGreaterThan(0);
  expect(g.items.t2bow.g).toBeGreaterThan(0);
  expect(config.hbow!.buy!.buyPrice).toBe(g.items.hbow.g * 2.5);
  expect(config.t2bow!.sell!.sellPrice).toBe(g.items.t2bow.g * 4.8);
});

test("`adjustItemConfig()` ensures we're selling at a higher price than we're buying", () => {
  const config: ItemsConfig = {
    hbow: {
      buy: {
        buyPrice: "x2.5",
      },
      sell: {
        sellPrice: "x1.5",
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);
  expect(typeof config.hbow!.buy!.buyPrice).toBe("number");
  expect(typeof config.hbow!.sell!.sellPrice).toBe("number");
  expect(config.hbow!.buy!.buyPrice as number).toBeLessThan(config.hbow!.sell!.sellPrice as number);
});

test("`adjustItemConfig()` ensures non-dismantleable items don't have dismantle config", () => {
  const config: ItemsConfig = {
    bow: {
      ...DISMANTLE,
    },
    orba: {
      ...DISMANTLE,
    },
    platinumingot: {
      ...DISMANTLE,
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);

  // `bow`s should not be dismantleable, and therefore the dismantle config should be removed
  expect(g.dismantle["bow" as DismantleKey]).toBeUndefined();
  expect(config.bow?.dismantle).toBeUndefined();

  // `orba`s should be compoundable (and therefore dismantleable), and therefore the dismantle config should be kept
  expect(g.items.orba.compound).toBeDefined();
  expect(config.orba?.dismantle).toBeDefined();

  // `platinumingot`s should be dismantleable, and therefore the dismantle config should be kept
  expect(g.dismantle.platinumingot).toBeDefined();
  expect(config.platinumingot?.dismantle).toBeDefined();
});

test("`adjustItemConfig()` ensures uncraftable items don't have craft config", () => {
  const config: ItemsConfig = {
    bow: {
      ...CRAFT,
    },
    hbow: {
      ...CRAFT,
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);

  // `bow`s should not be craftable, and therefore the craft config should be removed
  expect(g.craft.bow).toBeUndefined();
  expect(config.bow?.craft).toBeUndefined();

  // `hbow`s should be craftable, and therefore the craft config should be kept
  expect(g.craft.hbow).toBeDefined();
  expect(config.hbow?.craft).toBeDefined();
});

test("`adjustItemConfig()` ensures unexchangable items don't have exchange config", () => {
  const config: ItemsConfig = {
    bow: {
      ...EXCHANGE,
    },
    lostearring: {
      exchange: {
        exchangeAtLevel: 2,
      },
    },
  };
  if (g === undefined) throw new Error("G data is not available");
  adjustItemConfig(config, g);

  // `bow`s should not be exchangable, and therefore the craft config should be removed
  expect(g.items.bow.e).toBeUndefined();
  expect(config.bow?.exchange).toBeUndefined();

  // `lostearring`s should be exchangable, and therefore the exchange config should be kept
  expect(g.items.lostearring.e).toBeDefined();
  expect(config.lostearring?.exchange).toBeDefined();
});
