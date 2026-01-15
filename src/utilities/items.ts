import { Utilities, type Character } from "alclient";
import type { DismantleKey, GData, ItemInfo, ItemKey } from "typed-adventureland";
import Config, { type ItemsConfig, type Price } from "../../config/items.js";
import {
  buyForProfit,
  buyKeys,
  calculateBuyPrices,
  calculateSellPrices,
  ensureBuyPriceLessThanSellPrice,
  ensureSellMultiplierAtLeastOne,
  ensureSellPriceAtLeastNpcPrice,
  removeDestroyableWithoutBenefit,
  removeNonDismantlable,
  removeNonUpgradable,
  removeUncraftable,
  removeUnexchangable,
} from "./items/adjust.js";
import { getTotalItemCount } from "./items/counts.js";
import { isPurchasableFromNpc } from "./items/npc.js";
import { calculateUpgrade } from "./items/upgrade.js";
import { logError } from "./logging.js";

export function calculateItemValue(item: ItemInfo, g: GData, multiplier = 1): number {
  if (item.gift) return 1;

  const gItem = g.items[item.name];
  let value = typeof gItem.cash === "number" ? gItem.g : gItem.g * multiplier;

  if (gItem.markup !== undefined) value /= gItem.markup;
  if (item.expires !== undefined) value /= 8;

  if (item.level !== undefined && item.level > 0) {
    if (gItem.compound !== undefined) {
      const grades = gItem.grades || [11, 12];
      for (let i = 1; i <= item.level; i++) {
        const grade = i > grades[1] ? 2 : i > grades[0] ? 1 : 0;
        value *= typeof gItem.cash === "number" ? 1.5 : 3.2;
        if (gItem.type !== "booster") {
          value += g.items[`cscroll${grade}`].g / 2.4;
        } else {
          value *= 0.75;
        }
      }
    } else if (gItem.upgrade !== undefined) {
      const grades = gItem.grades || [11, 12];
      let s_value = 0;

      for (let i = 1; i <= item.level; i++) {
        const grade = i > grades[1] ? 2 : i > grades[0] ? 1 : 0;
        s_value += g.items[`scroll${grade}`].g / 2;

        if (i >= 7) {
          value *= 3;
          s_value *= 1.32;
        } else if (i === 6) {
          value *= 2.4;
        } else if (i >= 4) {
          value *= 2;
        }

        if (i === 9) {
          value *= 2.64;
          value += 400000;
        }

        if (i === 10) value *= 5;
        if (i === 12) value *= 0.8;
      }

      value += s_value;
    }
  }

  return value;
}

/**
 * Returns how much gold you would get if you sold the item to an NPC
 * @param g
 * @param item
 * @returns
 */
export function calculateNpcBuyPrice(item: ItemInfo, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.buy_to_sell);
}

export function calculateLostAndFoundSellPrice(item: ItemInfo, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.lostandfound_mult);
}

export function calculatePontySellPrice(item: ItemInfo, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.secondhands_mult);
}

export function calculatePrice(item: ItemInfo, g: GData, price: Price): number {
  if (typeof price === "number") return price; // Price is already defined

  // Multiplier-based buy price
  if (price.startsWith("x")) {
    const multiplier = parseFloat(price.slice(1));
    if (isNaN(multiplier) || multiplier <= 0) {
      logError(`Invalid multiplier in buy price: ${price} for item ${item.name}`);
      return Number.POSITIVE_INFINITY;
    }
    return calculateItemValue(item, g, multiplier);
  }

  // String-based buy price
  switch (price) {
    case "g":
      return calculateItemValue(item, g);
    case "goblin":
      return calculateLostAndFoundSellPrice(item, g);
    case "npc":
      return calculateNpcBuyPrice(item, g);
    case "ponty":
      return calculatePontySellPrice(item, g);
    default:
      logError(`Unknown buy price: ${price} for item ${item.name}`);
      return Number.POSITIVE_INFINITY;
  }
}

export function getItemDescription(item: ItemInfo): string {
  let description = `${item.name}`;

  if (item.level !== undefined) {
    description = `Level ${item.level} ${description}`;
  }

  if (item.p) {
    description = `${item.p.replace(/\b\w/g, (s) => s.toUpperCase())} ${description}`;
  }

  return description;
}

/**
 *
 * @param items
 * @param g
 * @param config
 * @returns array of craftable items with the indexes of items that can be used to craft them
 */
export function getCraftableItems(
  items: (ItemInfo | null)[],
  g: GData,
  config = Config,
): [ItemKey, (number | "npc")[]][] {
  const craftableItems: ReturnType<typeof getCraftableItems> = [];

  for (const configKey of Object.keys(config) as ItemKey[]) {
    const itemConfig = config[configKey];
    if (!itemConfig) continue; // No item config
    if (!itemConfig.craft) continue; // No craft config

    const gCraft = g.craft[configKey];
    if (!gCraft) {
      // Should have been fixed by `removeUncraftable`, but it might happen because of a game update
      logError(`${configKey} is not craftable`);
      continue;
    }

    /** The items we need to craft */
    const itemsNeeded = structuredClone(gCraft.items);

    /** Indexes (or "npc" if item is buyable) of the items that can be used to craft */
    const itemIndexes: (number | "npc")[] = [];

    needed: for (const [quantity, name, level] of itemsNeeded) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.l !== undefined) continue; // We can't craft with locked items
        if (item.p && !itemConfig.craft.craftWithSpecial) continue; // We don't want to craft with special items

        if (name !== item.name) continue;
        if ((item.q ?? 1) < quantity) continue;
        if (level !== undefined && item.level !== level) continue; // if level is specified, it must match
        if (level === undefined && (item.level ?? 0) !== 0) continue; // if level is unspecified, but the item is levelable, it must be level 0

        // We can use this item to craft
        itemIndexes.push(i);
        continue needed;
      }

      // We didn't find the item, check if we can buy it from an NPC
      if (isPurchasableFromNpc(name, g)) {
        // We can buy it from an NPC
        itemIndexes.push("npc");
        continue needed;
      }

      // Can't craft
      break;
    }

    if (itemsNeeded.length !== itemIndexes.length) continue;

    // Item is craftable, add it to the list
    craftableItems.push([configKey, itemIndexes]);
  }

  return craftableItems;
}

/**
 * @returns what scroll and/or offering we should use next for the given item
 */
export async function getNextUpgradeParams(
  character: Character,
  itemPos: number,
  g: GData,
  config: ItemsConfig = Config,
): Promise<
  | {
      scroll?: ItemKey;
      offering?: ItemKey;
    }
  | undefined
> {
  const item = character.items[itemPos];
  if (!item) throw new Error(`No items in position ${itemPos}`);

  const grade = Utilities.getItemGrade(item, g);
  const scroll = `scroll${grade}` as ItemKey;
  const scrollPos = character.locateItem({ name: scroll });
  if (scrollPos === undefined) return undefined; // We don't have scroll

  // Calculate grace
  const graceData = await character.upgrade(itemPos, undefined, undefined, { calculate: true });
  const grace = graceData.grace;

  // Calculate best path
  const initialValue =
    config[item.name]?.upgrade?.upgradeValue ??
    (config[item.name]?.buy?.buyPrice as number) ??
    (config[item.name]?.sell?.sellPrice as number) ??
    g.items[item.name].g;

  const results: { [T in number]: ReturnType<typeof calculateUpgrade> } = {
    1: calculateUpgrade({ name: item.name, level: 0 }, 0, initialValue, g),
  };
  for (let level = 1; level < (item.level ?? 0) + 1; level++) {
    const lastResults = results[level]!;
    const nextUpgrade = calculateUpgrade(
      { name: item.name, level },
      item.level === level - 1 ? grace : lastResults.grace,
      lastResults.cost,
      g,
    );

    results[level + 1] = nextUpgrade;
  }

  const result = results[(item.level ?? 0) + 1];
  if (result === undefined) return undefined;
  if (result.numStacks > 0) return { offering: "offeringp" }; // Want to increase grace

  return { scroll: result.scroll, offering: result.offering };
}

export function wantToBuy(item: ItemInfo, canBuyForPrice: number, g: GData, config = Config): boolean {
  const itemConfig = config[item.name]?.buy;
  if (!itemConfig) return false; // No buy config

  if (itemConfig.maxTotalQuantity !== undefined) {
    if (getTotalItemCount(item.name) >= itemConfig.maxTotalQuantity) return false; // We have enough
  }

  if (typeof itemConfig.buyPrice === "object") {
    const buyPrice = itemConfig.buyPrice[item.level ?? 0];
    if (buyPrice === undefined) return false; // We don't want to buy this item at this level
    if (canBuyForPrice > calculatePrice(item, g, buyPrice)) return false;
  } else {
    if (canBuyForPrice > calculatePrice(item, g, itemConfig.buyPrice)) return false;
  }

  return true;
}

export function wantToDestroy(character: Character, item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't destroy locked items
  if (character.getDistanceTo(character.game.G.maps.spookytown.ref!.poof!) >= 400) return false; // No +13 chance

  const itemConfig = config[item.name]?.destroy;
  if (!itemConfig) return false; // We have no destroy config for this item
  if (item.p && !itemConfig.destroySpecial) return false; // We don't want to destroy special items
  if (item.level !== undefined && item.level > 0) {
    if (itemConfig.destroyUpToLevel === undefined) return false; // We only want to destroy level 0 items
    if (item.level > itemConfig.destroyUpToLevel) return false; // This item is leveled higher than what we want to destroy
  }

  return true;
}

export function wantToDismantle(
  item: ItemInfo,
  emptyInventorySlots: number,
  gold: number,
  g: GData,
  config = Config,
): boolean {
  if (item.l !== undefined) return false; // We can't dismantle locked items

  const itemConfig = config[item.name]?.dismantle;
  if (!itemConfig) return false; // We have no dismantle config for this item
  if (item.p && !itemConfig.dismantleSpecial) return false; // We don't want to dismantle special items

  if (g.items[item.name].compound !== undefined && (item.level ?? 0) > 0) {
    if (emptyInventorySlots < 2) return false; // We need at least 2 empty inventory slots to dismantle a compoundable

    // TODO: Price check as dismantling compoundables costs money based on the item value

    return true;
  }

  const goldRequired = g.dismantle[item.name as DismantleKey]?.cost;
  if (goldRequired === undefined) {
    // Should have been fixed by `removeNonDismantlable`, but it might happen because of a game update
    logError(`${item.name} is not dismantlable`);
    return false;
  }
  if (gold < goldRequired) return false; // We don't have enough gold to dismantle this item

  return true;
}

export function wantToExchange(item: ItemInfo, emptyInventorySlots: number, g: GData, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't exchange locked items

  const itemConfig = config[item.name]?.exchange;
  if (!itemConfig) return false; // We have no exchange config for this item
  if (itemConfig.exchangeAtLevel !== undefined && item.level !== itemConfig.exchangeAtLevel) return false; // We only want to exchange this item at a specific level

  const numRequired = g.items[item.name].e;
  if (numRequired === undefined) {
    // Should have been fixed by `removeUnexchangable`, but it might happen because of a game update
    logError(`${item.name} is not exchangable`);
    return false;
  }
  if (numRequired > (item.q ?? 1)) return false; // We don't have enough of this item to exchange
  if (emptyInventorySlots === 0 && (item.q ?? 1) > numRequired) return false; // We don't have an empty inventory slot

  return true;
}

/**
 * @param character
 * @param item
 * @returns true if we want to hold the item on the character
 */
export function wantToHold(character: Character, item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return true;

  const itemConfig = config[item.name]?.hold;
  if (!itemConfig) return false; // We have no hold config for this item
  if (itemConfig.characterTypes === "all") return true; // We want all classes to hold this item
  if (!itemConfig.characterTypes.includes(character.ctype)) return false; // We don't want this class to hold this item

  return true;
}

/**
 * @param item
 * @returns the amount we want to list the item for on our stand, or `false` if we don't want to list it
 */
export function wantToList(item: ItemInfo, g: GData, config = Config): false | number {
  if (item.l !== undefined) return false; // We can't list locked items

  const itemConfig = config[item.name]?.list;
  if (!itemConfig) return false; // We have no list config for this item
  if (item.p && itemConfig.specialMultiplier === undefined) return false; // We don't want to list special items

  let wantToListForPrice: Price | undefined;
  if (typeof itemConfig.listPrice === "object") {
    wantToListForPrice = itemConfig.listPrice[item.level ?? 0];
  } else if ((item.level ?? 0) === 0) {
    wantToListForPrice = itemConfig.listPrice;
  }
  if (wantToListForPrice === undefined) return false; // We don't want to list this item at this level

  return calculatePrice(item, g, wantToListForPrice); // We want to list this item for this price
}

/**
 * @param item
 * @returns true if we want to mail the item
 */
export function wantToMail(item: ItemInfo, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't mail locked items

  const itemConfig = config[item.name]?.mail;
  if (!itemConfig) return false; // We have no mail config for this item
  if (item.p && !itemConfig.mailSpecial) return false; // We don't want to mail special items
  if (item.level !== undefined && item.level > itemConfig.mailUntilLevel) return false; // We only want to mail items up to a certain level

  return true;
}

export function wantToReplenish(character: Character, item: ItemInfo, config = Config): number | false {
  if (!wantToHold(character, item)) return false;

  const itemConfig = config[item.name]!.hold;
  if (itemConfig?.replenish === undefined) return false; // We don't want to replenish this item

  return Math.max(0, itemConfig.replenish - character.countItems({ name: item.name }));
}

/**
 * @param item
 * @param g
 * @param canSellForPrice the price someone is willing to buy the item for
 * @param config
 * @returns true if we want to sell the item
 */
export function wantToSell(item: ItemInfo, g: GData, canSellForPrice: Price = "npc", config = Config): boolean {
  if (item.l !== undefined) return false; // We can't sell locked items

  const itemConfig = config[item.name]?.sell;
  if (!itemConfig) return false; // We have no sell config for this item
  if (item.p && itemConfig.specialMultiplier === undefined) return false; // We don't want to sell special items

  let wantToSellForPrice: Price | undefined;
  if (typeof itemConfig.sellPrice === "object") {
    wantToSellForPrice = itemConfig.sellPrice[item.level ?? 0];
  } else if ((item.level ?? 0) === 0) {
    wantToSellForPrice = itemConfig.sellPrice;
  }
  if (wantToSellForPrice === undefined) return false; // We don't want to sell this item at this level
  if (
    calculatePrice(item, g, canSellForPrice) <
    calculatePrice(item, g, wantToSellForPrice) *
      (item.p ? (itemConfig.specialMultiplier ?? Number.POSITIVE_INFINITY) : 1)
  )
    return false; // We want more for it

  return true; // We're OK selling this item for this price
}

/**
 * @param item
 * @param config
 * @returns true if we want to make the item shiny before upgrading
 */
export function wantToMakeShiny(item: ItemInfo, config = Config) {
  if (item.p !== undefined) return false; // Item is already special
  if (item.l !== undefined) return false; // We can't upgrade locked items
  if (item.level !== undefined && item.level > 0) return false; // We can't make leveled items shiny

  const itemConfig = config[item.name]?.upgrade;
  if (!itemConfig) return false; // We have no upgrade config for this item
  if (!itemConfig.makeShinyBeforeUpgrading) return false;

  return true;
}

/**
 * @param character
 * @param item
 * @param g
 * @param config
 * @returns true if we want to upgrade or compound the item, false otherwise
 */
export function wantToUpgrade(item: ItemInfo, g: GData, config = Config): boolean {
  if (item.l !== undefined) return false; // We can't upgrade locked items

  const itemConfig = config[item.name]?.upgrade;
  if (!itemConfig) return false; // We have no upgrade config for this item
  if (wantToMakeShiny(item, config)) return false; // We want to make it shiny first
  if (itemConfig.upgradeUntilLevel !== undefined && (item.level ?? 0) >= itemConfig.upgradeUntilLevel) return false; // Don't upgrade anymore
  if (itemConfig.minTotalQuantity !== undefined && getTotalItemCount(item.name) <= itemConfig.minTotalQuantity)
    return false; // We don't have enough

  const grade = Utilities.getItemGrade(item, g);
  if (grade === undefined || grade >= 4) return false; // Not upgradable

  return true;
}

export function adjustItemConfig(
  config = Config,
  g: GData,
  options: { buyKeys?: Exclude<Price, number>; buyForProfit?: true } = {},
) {
  if (options.buyKeys !== undefined) buyKeys(config, g, options.buyKeys);
  if (options.buyForProfit) buyForProfit(config, g);
  calculateBuyPrices(config, g);
  calculateSellPrices(config, g);
  ensureSellPriceAtLeastNpcPrice(config, g);
  ensureSellMultiplierAtLeastOne(config);
  ensureBuyPriceLessThanSellPrice(config);
  removeDestroyableWithoutBenefit(config, g);
  removeNonDismantlable(config, g);
  removeNonUpgradable(config, g);
  removeUncraftable(config, g);
  removeUnexchangable(config, g);
}
