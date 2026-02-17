import { Game } from "alclient";
import type { GData } from "typed-adventureland";
import { getGFromCache } from "../../../src/plugins/g_cache.js";
import {
  calculateOptimalCompoundPath,
  calculateOptimalUpgradePath,
  getScrollAndOfferingPricesFromG,
} from "../../../src/utilities/items/upgrade.js";

let g: GData;
beforeAll(async () => {
  g = getGFromCache() ?? (await new Game().updateG());
  getScrollAndOfferingPricesFromG(g);
}, 15_000);

// TODO: Need more tests to make sure values are reasonable


test("calculateOptimalUpgradePath() works", () => {
  const path = calculateOptimalUpgradePath({ name: "bataxe", level: 0 }, 6_000_000, g, 12);
  expect(path).toBeDefined(); // Path should be valid
  expect(path!.at(-1)?.level).toBe(12); // Path should have been found

  for (let i = 1; i < path!.length; i++) {
    expect(path![i].cost).toBeGreaterThan(path![i - 1].cost); // Cost should have increased
    expect(path![i].grace).toBeGreaterThanOrEqual(path![i - 1].grace); // Grace may have increased
    expect(path![i].level).toBeGreaterThanOrEqual(path![i - 1].level);
    if (path![i].level === path![i - 1].level) {
      // Primling as an offering
      expect(path![i].scroll).toBeUndefined();
      expect(path![i].offering).toBe("offeringp");
    }
  }
});

test("calculateOptimalCompoundPath() works", () => {
  const path = calculateOptimalCompoundPath({ name: "ringsj", level: 0 }, g.items.ringsj.g, g, 7);
  expect(path).toBeDefined(); // Path should be valid
  expect(path!.at(-1)?.level).toBe(7); // Path should have been found

  for (let i = 1; i < path!.length; i++) {
    expect(path![i].cost).toBeGreaterThan(path![i - 1].cost); // Cost should have increased
    expect(path![i].level).toBeGreaterThan(path![i - 1].level); // Level should have increased
  }
});
