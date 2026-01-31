import { Utilities } from "alclient";
import TinyQueue from "tinyqueue";
import type { GData, ItemInfo, ItemKey } from "typed-adventureland";
import type { ItemsConfig } from "../../../config/items.js";
import { getItemDescription } from "../items.js";

/**
 * BASE_COMPOUND_CHANCE[grade][level] -> chance
 */
const BASE_COMPOUND_CHANCE: {
  [T in number]: {
    [T in number]: number;
  };
} = {
  0: {
    1: 0.99,
    2: 0.75,
    3: 0.4,
    4: 0.25,
    5: 0.2,
    6: 0.1,
    7: 0.08,
    8: 0.05,
    9: 0.05,
    10: 0.05,
  },
  1: {
    1: 0.9,
    2: 0.7,
    3: 0.4,
    4: 0.2,
    5: 0.15,
    6: 0.08,
    7: 0.05,
    8: 0.05,
    9: 0.05,
    10: 0.03,
  },
  2: {
    1: 0.8,
    2: 0.6,
    3: 0.32,
    4: 0.16,
    5: 0.1,
    6: 0.05,
    7: 0.03,
    8: 0.03,
    9: 0.03,
    10: 0.02,
  },
};

/**
 * BASE_UPGRADE_CHANCE[grade][level] -> chance
 */
const BASE_UPGRADE_CHANCE: {
  [T in number]: {
    [T in number]: number;
  };
} = {
  0: {
    1: 0.9999999,
    2: 0.98,
    3: 0.95,
    4: 0.7,
    5: 0.6,
    6: 0.4,
    7: 0.25,
    8: 0.15,
    9: 0.07,
    10: 0.024,
    11: 0.14,
    12: 0.11,
  },
  1: {
    1: 0.99998,
    2: 0.97,
    3: 0.94,
    4: 0.68,
    5: 0.58,
    6: 0.38,
    7: 0.24,
    8: 0.14,
    9: 0.066,
    10: 0.018,
    11: 0.13,
    12: 0.1,
  },
  2: {
    1: 0.97,
    2: 0.94,
    3: 0.92,
    4: 0.64,
    5: 0.52,
    6: 0.32,
    7: 0.232,
    8: 0.13,
    9: 0.062,
    10: 0.015,
    11: 0.12,
    12: 0.09,
  },
};

/** scroll -> price */
const UPGRADE_SCROLLS: { [T in `scroll${number}`]?: number } = {};

/** cscroll -> price */
const COMPOUND_SCROLLS: { [T in `cscroll${number}`]?: number } = {};

/** offering -> price */
const OFFERINGS: { [T in ItemKey]?: number } = {
  offeringp: 2_500_000,
  offeringx: 1_000_000_000,
};

export function getScrollAndOfferingPricesFromG(g: GData) {
  UPGRADE_SCROLLS.scroll0 = g.items.scroll0.g;
  UPGRADE_SCROLLS.scroll1 = g.items.scroll1.g;
  UPGRADE_SCROLLS.scroll2 = g.items.scroll2.g;
  UPGRADE_SCROLLS.scroll3 = g.items.scroll3.g;

  COMPOUND_SCROLLS.cscroll0 = g.items.cscroll0.g;
  COMPOUND_SCROLLS.cscroll1 = g.items.cscroll1.g;
  COMPOUND_SCROLLS.cscroll2 = g.items.cscroll2.g;
  COMPOUND_SCROLLS.cscroll3 = g.items.cscroll3.g;

  OFFERINGS.offering = g.items.offering.g;
}

const UPGRADE_ITEMS: ItemKey[] = [
  "scroll0",
  "scroll1",
  "scroll2",
  "scroll3",
  "cscroll0",
  "cscroll1",
  "cscroll2",
  "cscroll3",
  "offering",
  "offeringp",
  "offeringx",
];
export function getScrollAndOfferingPricesFromItemsConfig(config: ItemsConfig) {
  for (const item of UPGRADE_ITEMS) {
    if (!config[item]?.buy) continue; // We are not buying this item
    if (typeof config[item].buy.buyPrice !== "number") continue; // TODO: Improve handling of complicated prices

    if (item.startsWith("scroll")) {
      UPGRADE_SCROLLS[item as `scroll${number}`] = config[item].buy.buyPrice;
    } else if (item.startsWith("cscroll")) {
      COMPOUND_SCROLLS[item as `cscroll${number}`] = config[item].buy.buyPrice;
    } else {
      OFFERINGS[item] = config[item].buy.buyPrice;
    }
  }
}

export function calculateUpgrade(item: ItemInfo, grace: number, startingCost: number, g: GData) {
  const bestConfig: {
    cost: number;
    chance: number;
    grace: number;
    scroll?: ItemKey;
    offering?: ItemKey;
    numStacks: number;
  } = {
    cost: Infinity,
    chance: 0,
    grace,
    scroll: undefined,
    offering: undefined,
    numStacks: 0,
  };

  for (const scroll of Object.keys(UPGRADE_SCROLLS) as `scroll${number}`[]) {
    const scrollPrice = UPGRADE_SCROLLS[scroll]!;

    for (const offering of [...Object.keys(OFFERINGS), undefined] as (ItemKey | undefined)[]) {
      const offeringPrice = offering === undefined ? 0 : OFFERINGS[offering]!;

      for (
        let numStacks = 0;
        numStacks <= Math.max(0, Math.ceil(((item.level ?? 0) + 2 - grace) / 0.5)) + 1;
        numStacks++
      ) {
        const stackPrice = OFFERINGS["offeringp"]! * numStacks;
        const cost = startingCost + scrollPrice + offeringPrice + stackPrice;

        const { chance, newGrace } = calculateUpgradeChance(
          item,
          grace + numStacks * 0.5,
          scroll as ItemKey,
          g,
          offering,
        );
        if (cost / chance >= bestConfig.cost) continue; // Not better

        Object.assign(bestConfig, {
          cost: cost / chance,
          chance,
          grace: newGrace,
          scroll: scroll as ItemKey,
          offering: offering ?? null,
          numStacks,
        });
      }
    }
  }

  return bestConfig;
}

export function calculateOptimalUpgradePath(
  item: ItemInfo,
  initialValue: number,
  g: GData,
  targetLevel: number | undefined = undefined,
) {
  const maxLevel = g.items[item.name].grades![3];
  if (targetLevel === undefined || targetLevel > maxLevel) targetLevel = maxLevel; // Limit to its max
  if ((item.level ?? 0) >= targetLevel) return undefined; // Already reached

  const levelZeroGrade = Utilities.getItemGrade({ name: item.name, level: 0 }, g);
  const igrace = levelZeroGrade === 0 ? 1 : levelZeroGrade === 1 ? -1 : -2;

  type MEMO_DATA = {
    cost: number;
    method: { scroll: ItemKey; offering?: ItemKey } | "stack" | "initial";
    previous: { level: number; grace: number } | undefined;
    chance: number;
  };

  /** level -> max grace */
  const maxGrace = new Map<number, number>();
  /** level -> grace -> cost */
  const memo = new Map<number, Map<number, MEMO_DATA>>();
  const getMemo = (level: number, grace: number) => {
    return memo.get(level)?.get(grace);
  };
  const setMemo = (
    level: number,
    grace: number,
    cost: number,
    previous: { level: number; grace: number } | undefined,
    method: { scroll: ItemKey; offering?: ItemKey } | "stack" | "initial",
    chance: number,
  ) => {
    if (!memo.has(level)) memo.set(level, new Map());
    memo.get(level)!.set(grace, { cost, method, previous, chance });
  };

  const queue = new TinyQueue<{
    cost: number;
    level: number;
    grace: number;
  }>([{ cost: initialValue, level: 0, grace: 0 }], (a, b) => a.cost - b.cost);
  setMemo(0, 0, initialValue, undefined, "initial", 1);

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current.level >= targetLevel) continue; // We're done

    const previous = getMemo(current.level, current.grace)!;
    if (previous.cost < current.cost) continue; // Not cheaper than our current path

    const previousMaxGrace = maxGrace.get(current.level) ?? -1;
    if (current.grace < previousMaxGrace) continue; // We had a lower cost with a higher grace (NOTE: because we visit lowest cost nodes first)
    maxGrace.set(current.level, current.grace);

    const currentItem = { name: item.name, level: current.level };

    if (current.grace < Math.min(13, current.level + 2 - igrace)) {
      const newGrace = Math.min(current.grace + 0.5, 13);
      const primCost = OFFERINGS["offeringp"]!;
      const newCost = current.cost + primCost;
      const oldMemo = getMemo(current.level, newGrace);
      if (!oldMemo || newCost < oldMemo.cost) {
        setMemo(current.level, newGrace, newCost, { level: current.level, grace: current.grace }, "stack", 1);
        queue.push({ cost: newCost, level: current.level, grace: newGrace });
      }
    }

    const currentGrade = Utilities.getItemGrade(currentItem, g)!;
    for (let grade = currentGrade; grade <= Math.min(currentGrade + 1, 4); grade++) {
      const scroll = `scroll${grade}`;
      const scrollCost = UPGRADE_SCROLLS[scroll as keyof typeof UPGRADE_SCROLLS];
      if (scrollCost === undefined) continue; // We don't have a price for this scroll set
      for (const offering of [...Object.keys(OFFERINGS), undefined] as (ItemKey | undefined)[]) {
        const { chance, newGrace } = calculateUpgradeChance(currentItem, current.grace, scroll as ItemKey, g, offering);
        if (!chance) continue; // Incompatible

        const offeringCost = offering === undefined ? 0 : OFFERINGS[offering]!;
        const newCost = (current.cost + scrollCost + offeringCost) / chance;
        const newLevel = current.level + 1;

        const oldMemo = getMemo(newLevel, newGrace);
        if (!oldMemo || newCost < oldMemo.cost) {
          setMemo(
            newLevel,
            newGrace,
            newCost,
            { level: current.level, grace: current.grace },
            { scroll: scroll as ItemKey, offering },
            chance,
          );
          queue.push({ cost: newCost, level: newLevel, grace: newGrace });
        }
      }
    }
  }

  // Find the cheapest node for the target level
  let finishGrace = Number.NEGATIVE_INFINITY;
  let finishDatum: MEMO_DATA | undefined = undefined;
  for (const [grace, datum] of memo.get(targetLevel)!.entries()) {
    if (finishDatum && datum.cost >= finishDatum?.cost) continue; // Not cheaper
    finishGrace = grace;
    finishDatum = datum;
  }

  // Construct the path to get to that node
  const path: {
    level: number;
    grace: number;
    scroll?: ItemKey;
    offering?: ItemKey;
    cost: number;
    chance: number;
  }[] = [];

  let datum: MEMO_DATA | undefined = finishDatum;
  let grace = finishGrace;
  let level = targetLevel;

  while (datum) {
    let scroll: ItemKey | undefined;
    let offering: ItemKey | undefined;
    if (typeof datum.method === "object") {
      scroll = datum.method.scroll;
      offering = datum.method.offering;
    } else if (datum.method === "stack") {
      offering = "offeringp";
    }

    path.push({
      level,
      grace,
      scroll,
      offering,
      cost: datum.cost,
      chance: datum.chance,
    });

    if (!datum.previous) break;

    level = datum.previous.level;
    grace = datum.previous.grace;
    datum = memo.get(level)?.get(grace);
  }

  // Return the path
  return path.reverse();
}

export function calculateOptimalCompoundPath(
  item: ItemInfo,
  initialValue: number,
  g: GData,
  targetLevel: number | undefined = undefined,
) {
  const maxLevel = g.items[item.name].grades![3];
  if (targetLevel === undefined || targetLevel > maxLevel) targetLevel = maxLevel; // Limit to its max
  if ((item.level ?? 0) >= targetLevel) return undefined; // Already reached

  type MEMO_DATA = {
    cost: number;
    method: { scroll: ItemKey; offering?: ItemKey } | "initial";
    previous: { level: number; grace: number } | undefined;
    chance: number;
  };

  /** level -> max grace */
  const maxGrace = new Map<number, number>();
  /** level -> grace -> cost */
  const memo = new Map<number, Map<number, MEMO_DATA>>();
  const getMemo = (level: number, grace: number) => {
    return memo.get(level)?.get(grace);
  };
  const setMemo = (
    level: number,
    grace: number,
    cost: number,
    previous: { level: number; grace: number } | undefined,
    method: { scroll: ItemKey; offering?: ItemKey } | "initial",
    chance: number,
  ) => {
    if (!memo.has(level)) memo.set(level, new Map());
    memo.get(level)!.set(grace, { cost, method, previous, chance });
  };

  const queue = new TinyQueue<{
    cost: number;
    level: number;
    grace: number;
  }>([{ cost: initialValue, level: 0, grace: 0 }], (a, b) => a.cost - b.cost);
  setMemo(0, 0, initialValue, undefined, "initial", 1);

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (current.level >= targetLevel) continue; // We're done

    const previous = getMemo(current.level, current.grace)!;
    if (previous.cost < current.cost) continue; // Not cheaper than our current path

    const previousMaxGrace = maxGrace.get(current.level) ?? -1;
    if (current.grace < previousMaxGrace) continue; // We had a lower cost with a higher grace (NOTE: because we visit lowest cost nodes first)
    maxGrace.set(current.level, current.grace);

    const currentItem = { name: item.name, level: current.level };
    const currentGrade = Utilities.getItemGrade(currentItem, g)!;
    for (let grade = currentGrade; grade <= Math.min(currentGrade + 1, 4); grade++) {
      const scroll = `cscroll${grade}`;
      const scrollCost = COMPOUND_SCROLLS[scroll as keyof typeof COMPOUND_SCROLLS];
      if (scrollCost === undefined) continue; // We don't have a price for this scroll set
      for (const offering of [...Object.keys(OFFERINGS), undefined] as (ItemKey | undefined)[]) {
        const { chance, newGrace } = calculateCompoundChance(
          currentItem,
          current.grace,
          scroll as ItemKey,
          g,
          offering,
        );
        if (!chance) continue; // Incompatible

        const offeringCost = offering === undefined ? 0 : OFFERINGS[offering]!;
        const newCost = (current.cost * 3 + scrollCost + offeringCost) / chance;
        const newLevel = current.level + 1;

        const oldMemo = getMemo(newLevel, newGrace);
        if (!oldMemo || newCost < oldMemo.cost) {
          setMemo(
            newLevel,
            newGrace,
            newCost,
            { level: current.level, grace: current.grace },
            { scroll: scroll as ItemKey, offering },
            chance,
          );
          queue.push({ cost: newCost, level: newLevel, grace: newGrace });
        }
      }
    }
  }

  // Find the cheapest node for the target level
  let finishGrace = Number.NEGATIVE_INFINITY;
  let finishDatum: MEMO_DATA | undefined = undefined;
  for (const [grace, datum] of memo.get(targetLevel)!.entries()) {
    if (finishDatum && datum.cost >= finishDatum?.cost) continue; // Not cheaper
    finishGrace = grace;
    finishDatum = datum;
  }

  // Construct the path to get to that node
  const path: {
    level: number;
    grace: number;
    scroll?: ItemKey;
    offering?: ItemKey;
    cost: number;
    chance: number;
  }[] = [];

  let datum: MEMO_DATA | undefined = finishDatum;
  let grace = finishGrace;
  let level = targetLevel;

  while (datum) {
    let scroll: ItemKey | undefined;
    let offering: ItemKey | undefined;
    if (typeof datum.method === "object") {
      scroll = datum.method.scroll;
      offering = datum.method.offering;
    }

    path.push({
      level,
      grace,
      scroll,
      offering,
      cost: datum.cost,
      chance: datum.chance,
    });

    if (!datum.previous) break;

    level = datum.previous.level;
    grace = datum.previous.grace;
    datum = memo.get(level)?.get(grace);
  }

  // Return the path
  return path.reverse();
}

function calculateUpgradeChance(
  item: ItemInfo,
  grace: number,
  scroll: ItemKey,
  g: GData,
  offering: ItemKey | undefined = undefined,
): { chance: number; newGrace: number } {
  if (!scroll.startsWith("scroll")) return { chance: 0, newGrace: 0 };

  const currentGrade = Utilities.getItemGrade(item, g);
  if (currentGrade === undefined) throw new Error(`Unable to determine grade for ${getItemDescription(item)}`);

  const scrollGrade = g.items[scroll].grade;
  if (scrollGrade === undefined || currentGrade > scrollGrade) return { chance: 0, newGrace: 0 };

  const levelZeroGrade = item.level === 0 ? currentGrade : Utilities.getItemGrade({ name: item.name, level: 0 }, g)!;
  const nextLevel = (item.level ?? 0) + 1;
  const baseUpgradeChance = BASE_UPGRADE_CHANCE[levelZeroGrade]![nextLevel]!;

  let newGrace = grace;
  let chance = baseUpgradeChance;
  let high = false;
  let igrace: number;
  if (levelZeroGrade === 0) {
    igrace = 1;
  } else if (levelZeroGrade == 1) {
    igrace = -1;
  } else if (levelZeroGrade == 2) {
    igrace = -2;
  } else {
    throw new Error("Unknown igrace");
  }
  grace = Math.max(0, Math.min(nextLevel + 1, (grace || 0) + igrace));
  grace = (chance * grace) / nextLevel + grace / 1000.0;
  if (scrollGrade > currentGrade && nextLevel <= 10) {
    chance = chance * 1.2 + 0.01;
    high = true;
    newGrace = newGrace + 0.4;
  }
  if (offering !== undefined) {
    const offeringGrade = g.items[offering].grade;
    if (offeringGrade === undefined) throw new Error(`${offering} is not a valid offering`);
    let increase = 0.4;

    if (offeringGrade > currentGrade + 1) {
      chance = chance * 1.7 + grace * 4;
      high = true;
      increase = 3;
    } else if (offeringGrade > currentGrade) {
      chance = chance * 1.5 + grace * 1.2;
      high = true;
      increase = 1;
    } else if (offeringGrade == currentGrade) {
      chance = chance * 1.4 + grace;
    } else if (offeringGrade == currentGrade - 1) {
      chance = chance * 1.15 + grace / 3.2;
      increase = 0.2;
    } else {
      chance = chance * 1.08 + grace / 4;
      increase = 0.1;
    }
    newGrace = newGrace + increase;
  } else {
    grace = Math.max(0, grace / 4.8 - 0.4 / ((nextLevel - 0.999) * (nextLevel - 0.999)));
    chance += grace;
  }
  if (high) {
    chance = Math.min(chance, Math.min(baseUpgradeChance + 0.36, baseUpgradeChance * 3));
  } else {
    chance = Math.min(chance, Math.min(baseUpgradeChance + 0.24, baseUpgradeChance * 2));
  }
  return { chance: Math.min(chance, 1), newGrace: Math.round(newGrace * 10) / 10 };
}

/**
 *
 * @param item
 * @param grace Average of the 3 item's graces
 * @param scroll
 * @param g
 * @param offering
 * @returns
 */
function calculateCompoundChance(
  item: ItemInfo,
  grace: number,
  scroll: ItemKey,
  g: GData,
  offering: ItemKey | undefined = undefined,
): { chance: number; newGrace: number } {
  if (!scroll.startsWith("cscroll")) return { chance: 0, newGrace: 0 };

  const currentGrade = Utilities.getItemGrade(item, g);
  if (currentGrade === undefined) throw new Error(`Unable to determine grade for ${getItemDescription(item)}`);

  const scrollGrade = g.items[scroll].grade;
  if (scrollGrade === undefined || currentGrade > scrollGrade) return { chance: 0, newGrace: 0 };

  const levelZeroGrade = item.level === 0 ? currentGrade : Utilities.getItemGrade({ name: item.name, level: 0 }, g)!;
  const nextLevel = (item.level ?? 0) + 1;
  const compoundGrade =
    (item.level ?? 0) < 3
      ? levelZeroGrade
      : Utilities.getItemGrade({ name: item.name, level: (item.level ?? 0) - 2 }, g)!;
  const baseCompoundChance = BASE_COMPOUND_CHANCE[compoundGrade]![nextLevel]!;

  let newGrace = grace;
  let chance = baseCompoundChance;
  let high = 0;
  let graceBonus = 0;
  if (scrollGrade > currentGrade) {
    chance = chance * 1.1 + 0.001;
    graceBonus += 0.4;
    high = scrollGrade - currentGrade;
  }
  if (offering !== undefined) {
    const offeringGrade = g.items[offering].grade;
    if (offeringGrade === undefined) throw new Error(`${offering} is not a valid offering`);
    const chanceFromGrace = 0.027 * (grace * 3 + 0.5);

    if (offeringGrade > currentGrade + 1) {
      chance = chance * 1.64 + chanceFromGrace * 2;
      high = 1;
      graceBonus += 3;
    } else if (offeringGrade > currentGrade) {
      chance = chance * 1.48 + chanceFromGrace;
      high = 1;
      graceBonus += 1;
    } else if (offeringGrade == currentGrade) {
      chance = chance * 1.36 + Math.min(30 * 0.027, chanceFromGrace);
      graceBonus += 0.5;
    } else if (offeringGrade == currentGrade - 1) {
      chance = chance * 1.15 + Math.min(25 * 0.019, chanceFromGrace) / Math.max(nextLevel - 3, 1);
      graceBonus += 0.2;
    } else {
      chance = chance * 1.08 + Math.min(15 * 0.015, chanceFromGrace) / Math.max(nextLevel - 2, 1);
      graceBonus += 0.1;
    }

    newGrace = grace * 3;
  } else {
    const chanceFromGrace = 0.007 * grace;
    chance += Math.min(25 * 0.007, chanceFromGrace) / Math.max(nextLevel - 2, 1);
  }
  newGrace = newGrace / 6.4 + graceBonus;
  chance = Math.min(
    1,
    chance,
    baseCompoundChance * (3 + ((high && high * 0.6) || 0)),
    baseCompoundChance + 0.2 + ((high && high * 0.05) || 0),
  );
  return { chance, newGrace: Math.round(newGrace * 10) / 10 };
}
