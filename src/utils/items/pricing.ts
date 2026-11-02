import type { GData, GItem, ItemName } from 'alclient';
import { LRUCache } from 'lru-cache';

import type { ItemsConfig, Price } from '@/types/items';

export type ItemLike = {
  name: ItemName;
  level?: number | undefined;
  gift?: number | undefined;
  expires?: string | undefined;
  p?: string | null | undefined;
  q?: number | undefined;
};

export interface CompetitorListing {
  name: ItemName;
  level: number;
  lowestSellPrice?: number;
  highestBuyPrice?: number;
  updatedAt: number;
}

export interface PlayerTradeSlot {
  name: ItemName;
  level?: number;
  price: number;
  b?: boolean;
}

export interface PlayerWithStand {
  id?: string;
  stand?: unknown;
  slots?: Partial<Record<string, PlayerTradeSlot | null | undefined>>;
}

export const COMPETITOR_PRICES_CACHE = new LRUCache<string, CompetitorListing>({
  max: 1000,
  ttl: 5 * 60 * 1000,
});

/** Returns the scroll grade (0, 1, or 2) required for the given item level. */
function getScrollGrade(level: number, grades: readonly number[]): number {
  if (level > (grades[1] ?? 12)) return 2;
  return level > (grades[0] ?? 11) ? 1 : 0;
}

/** Calculates the compounded item value across levels including scroll costs and booster penalties. */
function calculateCompoundValue(baseValue: number, level: number, gItem: GItem, g: GData): number {
  let value = baseValue;
  const grades = gItem.grades || [11, 12];
  const isCash = typeof gItem.cash === 'number';

  for (let lvl = 1; lvl <= level; lvl++) {
    const grade = getScrollGrade(lvl, grades);
    value *= isCash ? 1.5 : 3.2;

    if (gItem.type === 'booster') {
      value *= 0.75;
    } else {
      const scrollCost = g.items[`cscroll${grade}` as ItemName]?.g ?? 0;
      value += scrollCost / 2.4;
    }
  }

  return value;
}

/** Calculates the upgraded item value across levels including scroll costs and high-level multiplier jumps. */
function calculateUpgradeValue(baseValue: number, level: number, gItem: GItem, g: GData): number {
  let value = baseValue;
  const grades = gItem.grades || [11, 12];
  let scrollTotal = 0;

  for (let lvl = 1; lvl <= level; lvl++) {
    const grade = getScrollGrade(lvl, grades);
    const scrollCost = g.items[`scroll${grade}` as ItemName]?.g ?? 0;
    scrollTotal += scrollCost / 2;

    if (lvl >= 7) {
      value *= 3;
      scrollTotal *= 1.32;
    } else if (lvl === 6) {
      value *= 2.4;
    } else if (lvl >= 4) {
      value *= 2;
    }

    switch (lvl) {
      case 9: {
        value *= 2.64;
        value += 400_000;

        break;
      }
      case 10: {
        value *= 5;

        break;
      }
      case 12: {
        value *= 0.8;

        break;
      }
      // No default
    }
  }

  return value + scrollTotal;
}

/** Calculates the base AdventureLand market value for an item at its level using official compounding/upgrade math. */
export function calculateItemValue(item: ItemLike, g: GData, multiplier = 1): number {
  if (item.gift) return 1;

  const gItem = g.items[item.name];
  if (!gItem) return 0;

  let value = typeof gItem.cash === 'number' ? gItem.g : gItem.g * multiplier;
  if (gItem.markup !== undefined) value /= gItem.markup;
  if (item.expires !== undefined) value /= 8;

  if (item.level !== undefined && item.level > 0) {
    if (gItem.compound !== undefined) {
      value = calculateCompoundValue(value, item.level, gItem, g);
    } else if (gItem.upgrade !== undefined) {
      value = calculateUpgradeValue(value, item.level, gItem, g);
    }
  }

  return Math.round(value);
}

/** Calculates the gold an NPC pays to buy an item from the player. */
export function calculateNpcBuyPrice(item: ItemLike, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.buy_to_sell);
}

/** Calculates the price the Lost & Found (goblin) sells an item for. */
export function calculateLostAndFoundSellPrice(item: ItemLike, g: GData): number {
  return calculateItemValue(item, g, g.multipliers.lostandfound_mult);
}

/** Calculates the price Ponty (secondhands) sells an item for. */
export function calculatePontySellPrice(item: ItemLike, g: GData): number {
  const gItem = g.items[item.name];
  if (typeof gItem?.cash === 'number') {
    const mult = g.multipliers.secondhands_cash_mult ?? g.multipliers.secondhands_mult;
    return Math.round(calculateItemValue(item, g) * mult);
  }
  return calculateItemValue(item, g, g.multipliers.secondhands_mult);
}

/** Resolves a configured Price token (number, 'g', 'npc', 'ponty', 'goblin', 'x<multiplier>') to a concrete gold value. */
export function calculatePrice(item: ItemLike, g: GData, price: Price): number {
  if (typeof price === 'number') {
    return price;
  }

  if (price.startsWith('x')) {
    const mult = Number(price.slice(1));
    return Number.isNaN(mult) || mult <= 0 ? Infinity : calculateItemValue(item, g, mult);
  }

  switch (price) {
    case 'g':
      return calculateItemValue(item, g, 1);
    case 'goblin':
      return calculateLostAndFoundSellPrice(item, g);
    case 'npc':
      return calculateNpcBuyPrice(item, g);
    case 'ponty':
      return calculatePontySellPrice(item, g);
    default:
      return Infinity;
  }
}

/** Extracts the Price token for a specific item level from a Price or per-level price map. */
function resolvePriceToken(price: Price | Record<number, Price>, level: number): Price | undefined {
  if (typeof price === 'object') {
    return price[level];
  }
  return level === 0 ? price : undefined;
}

/** Resolves an item's valuation from ITEMS_CONFIG (buy/sell price), falling back to base game item value. */
export function getConfiguredItemValue(itemName: ItemName, g: GData, config: ItemsConfig, level = 0): number {
  const itemConfig = config[itemName];
  if (itemConfig?.buy?.buyPrice !== undefined) {
    const priceToken = resolvePriceToken(itemConfig.buy.buyPrice, level);
    if (priceToken !== undefined) {
      return calculatePrice({ name: itemName, level }, g, priceToken);
    }
  }

  if (itemConfig?.sell?.sellPrice !== undefined) {
    const priceToken = resolvePriceToken(itemConfig.sell.sellPrice, level);
    if (priceToken !== undefined) {
      return calculatePrice({ name: itemName, level }, g, priceToken);
    }
  }

  return calculateItemValue({ name: itemName, level }, g);
}

/** Resolves the maximum buy price configured for an item at its level. */
export function getConfiguredBuyPrice(item: ItemLike, g: GData, config: ItemsConfig): number | undefined {
  const itemConfig = config[item.name]?.buy;
  if (!itemConfig) return undefined;

  const priceToken = resolvePriceToken(itemConfig.buyPrice, item.level ?? 0);
  return priceToken === undefined ? undefined : calculatePrice(item, g, priceToken);
}

/** Resolves the minimum sell price configured for an item at its level, applying special item multiplier if present. */
export function getConfiguredSellPrice(item: ItemLike, g: GData, config: ItemsConfig): number | undefined {
  const itemConfig = config[item.name]?.sell;
  if (!itemConfig) return undefined;

  const priceToken = resolvePriceToken(itemConfig.sellPrice, item.level ?? 0);
  if (priceToken === undefined) return undefined;

  if (item.p) {
    if (itemConfig.specialMultiplier === undefined) return undefined;
    const basePrice = calculatePrice(item, g, priceToken);
    return Math.round(basePrice * itemConfig.specialMultiplier);
  }

  return calculatePrice(item, g, priceToken);
}

/** Resolves the merchant stand listing price configured for an item at its level. */
export function getConfiguredListPrice(item: ItemLike, g: GData, config: ItemsConfig): number | undefined {
  const itemConfig = config[item.name]?.list;
  if (!itemConfig) return undefined;

  const priceToken = resolvePriceToken(itemConfig.listPrice, item.level ?? 0);
  if (priceToken === undefined) return undefined;

  if (item.p) {
    if (itemConfig.specialMultiplier === undefined) return undefined;
    const basePrice = calculatePrice(item, g, priceToken);
    return Math.round(basePrice * itemConfig.specialMultiplier);
  }

  return calculatePrice(item, g, priceToken);
}

/** Generates a cache key for an item name and level (e.g. "pants:0"). */
export function getStandItemCacheKey(name: ItemName, level = 0): string {
  return `${name}:${level}`;
}

/** Records a competitor stand price in the ephemeral cache (lowest sell or highest buy). */
export function recordCompetitorListing(listing: { name: ItemName; level?: number; price: number; b?: boolean }): void {
  const level = listing.level ?? 0;
  const key = getStandItemCacheKey(listing.name, level);
  const existing = COMPETITOR_PRICES_CACHE.get(key);
  const now = Date.now();

  if (listing.b) {
    const highestBuyPrice = Math.max(existing?.highestBuyPrice ?? 0, listing.price);
    COMPETITOR_PRICES_CACHE.set(key, {
      name: listing.name,
      level,
      ...(existing?.lowestSellPrice !== undefined && { lowestSellPrice: existing.lowestSellPrice }),
      highestBuyPrice,
      updatedAt: now,
    });
  } else {
    const lowestSellPrice = Math.min(existing?.lowestSellPrice ?? Infinity, listing.price);
    COMPETITOR_PRICES_CACHE.set(key, {
      name: listing.name,
      level,
      lowestSellPrice,
      ...(existing?.highestBuyPrice !== undefined && { highestBuyPrice: existing.highestBuyPrice }),
      updatedAt: now,
    });
  }
}

/** Retrieves the cached competitor listing for an item at a specific level. */
export function getCompetitorListing(name: ItemName, level = 0): CompetitorListing | undefined {
  return COMPETITOR_PRICES_CACHE.get(getStandItemCacheKey(name, level));
}

/** Clears the competitor stand prices cache (useful for testing or server changes). */
export function clearCompetitorPricesCache(): void {
  COMPETITOR_PRICES_CACHE.clear();
}

/** Inspects trade slots of nearby players with open stands and caches their prices. */
export function snoopCompetitorStands(players: Iterable<PlayerWithStand>): void {
  for (const player of players) {
    if (!player.stand || !player.slots) continue;
    for (const [slotKey, slotData] of Object.entries(player.slots)) {
      if (!slotKey.startsWith('trade') || !slotData || typeof slotData.price !== 'number') continue;
      recordCompetitorListing({
        name: slotData.name,
        ...(slotData.level !== undefined && { level: slotData.level }),
        price: slotData.price,
        ...(slotData.b !== undefined && { b: slotData.b }),
      });
    }
  }
}

/** Calculates an undercutting stand sell price that never drops below the configured price. */
function getBoundedStandSellPrice(item: ItemLike, g: GData, config: ItemsConfig): number | undefined {
  const configuredPrice = getConfiguredListPrice(item, g, config) ?? getConfiguredSellPrice(item, g, config);
  if (configuredPrice === undefined) return undefined;

  const npcFloor = calculateNpcBuyPrice(item, g);
  const minPrice = Math.max(configuredPrice, npcFloor);

  const competitor = getCompetitorListing(item.name, item.level ?? 0);
  if (competitor?.lowestSellPrice !== undefined) {
    const compSell = competitor.lowestSellPrice;
    if (compSell > minPrice) {
      return compSell - 1;
    }
  }

  return minPrice;
}

/** Calculates an overbidding stand buy price capped at configured ceiling. */
function getBoundedStandBuyPrice(item: ItemLike, g: GData, config: ItemsConfig): number | undefined {
  const ceiling = getConfiguredBuyPrice(item, g, config);
  if (ceiling === undefined) return undefined;

  const npcFloor = calculateNpcBuyPrice(item, g);
  const competitor = getCompetitorListing(item.name, item.level ?? 0);

  if (competitor?.highestBuyPrice !== undefined) {
    const compBuy = competitor.highestBuyPrice;
    return compBuy < ceiling ? Math.max(npcFloor + 1, compBuy + 1) : ceiling;
  }

  return ceiling;
}

/** Calculates a competitive stand listing price (buy or sell) bounded by safety limits. */
export function getBoundedStandPrice(
  item: ItemLike,
  g: GData,
  config: ItemsConfig,
  action: 'buy' | 'sell',
): number | undefined {
  return action === 'sell' ? getBoundedStandSellPrice(item, g, config) : getBoundedStandBuyPrice(item, g, config);
}
