import { Game } from "alclient";
import type { GData } from "typed-adventureland";
import { getGFromCache } from "../../../src/plugins/g_cache.js";
import { calculateUpgrade, getScrollAndOfferingPricesFromG } from "../../../src/utilities/items/upgrade.js";

let g: GData;
beforeAll(async () => {
  g = getGFromCache() ?? (await new Game().updateG());
  getScrollAndOfferingPricesFromG(g);
}, 15_000);

// TODO: Need more tests to make sure values are reasonable

test("calculateNextUpgrade() works", () => {
  const results: { [T in number]: ReturnType<typeof calculateUpgrade> } = {
    1: calculateUpgrade({ name: "bow", level: 0 }, 0, g.items.bow.g, g),
  };
  for (let level = 1; level < 12; level++) {
    const lastResults = results[level]!;
    const nextUpgrade = calculateUpgrade({ name: "bow", level }, lastResults.grace, lastResults.cost, g);

    expect(nextUpgrade.cost).toBeGreaterThan(lastResults.cost); // Cost should have increased
    expect(nextUpgrade.grace).toBeGreaterThanOrEqual(lastResults.grace); // Grace may have increased
    expect(nextUpgrade.scroll).toBeDefined(); // Every upgrade here should be doable

    results[level + 1] = nextUpgrade;
  }
});
