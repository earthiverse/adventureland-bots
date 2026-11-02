import type { GData, ItemName } from 'alclient';
import { beforeEach, describe, expect, test } from 'bun:test';

import type { ItemsConfig } from '@/types/items';
import {
  calculateItemValue,
  calculateLostAndFoundSellPrice,
  calculateNpcBuyPrice,
  calculatePontySellPrice,
  calculatePrice,
  clearCompetitorPricesCache,
  getBoundedStandPrice,
  getCompetitorListing,
  getConfiguredBuyPrice,
  getConfiguredItemValue,
  getConfiguredListPrice,
  getConfiguredSellPrice,
  recordCompetitorListing,
  snoopCompetitorStands,
} from '@/utils/items/pricing';

const mockG: GData = {
  multipliers: {
    buy_to_sell: 0.6,
    lostandfound_mult: 4,
    secondhands_mult: 2,
    secondhands_cash_mult: 1.25,
    extra_shells: 0,
    shells_to_gold: 1,
  },
  items: {
    scroll0: { g: 1000 },
    scroll1: { g: 40_000 },
    scroll2: { g: 1_600_000 },
    cscroll0: { g: 8000 },
    cscroll1: { g: 400_000 },
    cscroll2: { g: 10_000_000 },
    pants: {
      g: 1200,
      upgrade: {},
      grades: [7, 9],
    },
    ring: {
      g: 5000,
      compound: {},
      grades: [4, 7],
    },
    booster: {
      g: 10_000,
      compound: {},
      type: 'booster',
    },
    partyhat: {
      g: 100_000,
      cash: 50,
    },
    crabclaw: {
      g: 500,
    },
    cclaw: {
      g: 2500,
    },
  } as unknown as GData['items'],
  craft: {
    cclaw: {
      cost: 1000,
      items: [[2, 'crabclaw', 0]],
    },
  } as unknown as GData['craft'],
} as unknown as GData;

describe('pricing engine', () => {
  beforeEach(() => {
    clearCompetitorPricesCache();
  });

  describe('calculateItemValue', () => {
    test('returns 1 for gifted items regardless of level or base price', () => {
      expect(calculateItemValue({ name: 'pants', gift: 1, level: 5 }, mockG)).toBe(1);
    });

    // test('returns 0 for missing items in GData', () => {
    //   expect(calculateItemValue({ name: 'unknown_item' as ItemName }, mockG)).toBe(0);
    // });

    test('computes base level 0 item value with multiplier', () => {
      expect(calculateItemValue({ name: 'pants' }, mockG, 1)).toBe(1200);
      expect(calculateItemValue({ name: 'pants' }, mockG, 0.6)).toBe(720);
    });

    test('divides expired items by 8', () => {
      expect(calculateItemValue({ name: 'pants', expires: '2026-12-31' }, mockG, 1)).toBe(150);
    });

    test('computes compound values correctly across levels', () => {
      const level0 = calculateItemValue({ name: 'ring' as ItemName, level: 0 }, mockG);
      const level1 = calculateItemValue({ name: 'ring' as ItemName, level: 1 }, mockG);
      expect(level0).toBe(5000);
      // level 1: 5000 * 3.2 + (8000 / 2.4) = 16000 + 3333.33 = 19333
      expect(level1).toBe(19_333);
    });

    test('computes upgraded values correctly across levels', () => {
      const level0 = calculateItemValue({ name: 'pants', level: 0 }, mockG);
      const level1 = calculateItemValue({ name: 'pants', level: 1 }, mockG);
      expect(level0).toBe(1200);
      // level 1: scroll0.g/2 = 500. Total = 1200 + 500 = 1700
      expect(level1).toBe(1700);
    });
  });

  describe('standard price resolvers', () => {
    test('calculateNpcBuyPrice uses buy_to_sell multiplier', () => {
      expect(calculateNpcBuyPrice({ name: 'pants' }, mockG)).toBe(720);
    });

    test('calculateLostAndFoundSellPrice uses lostandfound_mult', () => {
      expect(calculateLostAndFoundSellPrice({ name: 'pants' }, mockG)).toBe(4800);
    });

    test('calculatePontySellPrice uses secondhands_mult for normal items', () => {
      expect(calculatePontySellPrice({ name: 'pants' }, mockG)).toBe(2400);
    });

    test('calculatePontySellPrice uses secondhands_cash_mult for cash items', () => {
      expect(calculatePontySellPrice({ name: 'partyhat' }, mockG)).toBe(125_000);
    });
  });

  describe('calculatePrice tokens', () => {
    test('resolves explicit numeric prices', () => {
      expect(calculatePrice({ name: 'pants' }, mockG, 500)).toBe(500);
    });

    test('resolves multiplier price x${number}', () => {
      expect(calculatePrice({ name: 'pants' }, mockG, 'x1.5')).toBe(1800);
      expect(calculatePrice({ name: 'pants' }, mockG, 'x-1')).toBe(Infinity);
    });

    test('resolves named tokens', () => {
      expect(calculatePrice({ name: 'pants' }, mockG, 'g')).toBe(1200);
      expect(calculatePrice({ name: 'pants' }, mockG, 'npc')).toBe(720);
      expect(calculatePrice({ name: 'pants' }, mockG, 'goblin')).toBe(4800);
      expect(calculatePrice({ name: 'pants' }, mockG, 'ponty')).toBe(2400);
    });
  });

  describe('getConfiguredItemValue and helpers', () => {
    test('resolves configured buyPrice and sellPrice tokens', () => {
      const config: ItemsConfig = {
        pants: {
          buy: { buyPrice: 'npc' },
          sell: { sellPrice: 'ponty' },
        },
      };

      expect(getConfiguredBuyPrice({ name: 'pants' }, mockG, config)).toBe(720);
      expect(getConfiguredSellPrice({ name: 'pants' }, mockG, config)).toBe(2400);
    });

    test('handles per-level pricing maps', () => {
      const config: ItemsConfig = {
        pants: {
          sell: {
            sellPrice: {
              0: 1000,
              1: 3000,
            },
          },
        },
      };

      expect(getConfiguredSellPrice({ name: 'pants', level: 0 }, mockG, config)).toBe(1000);
      expect(getConfiguredSellPrice({ name: 'pants', level: 1 }, mockG, config)).toBe(3000);
      expect(getConfiguredSellPrice({ name: 'pants', level: 2 }, mockG, config)).toBeUndefined();
    });

    test('applies specialMultiplier for .p items', () => {
      const config: ItemsConfig = {
        pants: {
          sell: {
            sellPrice: 1000,
            specialMultiplier: 2.5,
          },
        },
      };

      expect(getConfiguredSellPrice({ name: 'pants', p: 'shiny' }, mockG, config)).toBe(2500);
      expect(getConfiguredSellPrice({ name: 'pants' }, mockG, config)).toBe(1000);
    });

    test('getConfiguredListPrice refuses special items without specialMultiplier', () => {
      const config: ItemsConfig = {
        pants: {
          list: { listPrice: 1000 },
        },
      };

      expect(getConfiguredListPrice({ name: 'pants', p: 'shiny' }, mockG, config)).toBeUndefined();
      expect(getConfiguredListPrice({ name: 'pants' }, mockG, config)).toBe(1000);
    });

    test('getConfiguredItemValue falls back to G.items for standard items', () => {
      const config: ItemsConfig = {};
      expect(getConfiguredItemValue('scroll0', mockG, config)).toBe(1000);
    });
  });

  describe('competitor stand snooping and bounded pricing', () => {
    const config: ItemsConfig = {
      pants: {
        sell: { sellPrice: 2000 },
        buy: { buyPrice: 1500 },
      },
    };

    test('records and retrieves competitor listings', () => {
      recordCompetitorListing({
        name: 'pants',
        level: 0,
        price: 1900,
        b: false,
      });

      const listing = getCompetitorListing('pants', 0);
      expect(listing?.lowestSellPrice).toBe(1900);
      expect(listing?.highestBuyPrice).toBeUndefined();
    });

    test('snoopCompetitorStands extracts listings from players', () => {
      const players = [
        {
          id: 'merchant1',
          stand: true,
          slots: {
            trade1: { name: 'pants' as ItemName, level: 0, price: 1850, b: false },
            trade2: { name: 'pants' as ItemName, level: 0, price: 1200, b: true },
          },
        },
      ];

      snoopCompetitorStands(players);

      const listing = getCompetitorListing('pants', 0);
      expect(listing?.lowestSellPrice).toBe(1850);
      expect(listing?.highestBuyPrice).toBe(1200);
    });

    test('getBoundedStandPrice undercuts competitor by 1 when competitor is above configured price', () => {
      recordCompetitorListing({
        name: 'pants',
        level: 0,
        price: 2500,
        b: false,
      });

      // Configured sell: 2000. Competitor at 2500 -> undercut to 2499.
      const price = getBoundedStandPrice({ name: 'pants' }, mockG, config, 'sell');
      expect(price).toBe(2499);
    });

    test('getBoundedStandPrice never drops below configured price on cheaper competitor or dump listing', () => {
      recordCompetitorListing({
        name: 'pants',
        level: 0,
        price: 1800, // Competitor selling below our configured minimum
        b: false,
      });

      // Configured sell: 2000. Listing will not go below 2000.
      const price = getBoundedStandPrice({ name: 'pants' }, mockG, config, 'sell');
      expect(price).toBe(2000);
    });

    test('getBoundedStandPrice caps buy price at configured ceiling', () => {
      recordCompetitorListing({
        name: 'pants',
        level: 0,
        price: 999_999, // Competitor bidding crazy high
        b: true,
      });

      // Configured buy: 1500. Won't overbid past 1500.
      const price = getBoundedStandPrice({ name: 'pants' }, mockG, config, 'buy');
      expect(price).toBe(1500);
    });

    test('getBoundedStandPrice overbids competitor by 1 when below ceiling', () => {
      recordCompetitorListing({
        name: 'pants',
        level: 0,
        price: 1100,
        b: true,
      });

      // Ceiling: 1500. Competitor: 1100 -> overbids to 1101.
      const price = getBoundedStandPrice({ name: 'pants' }, mockG, config, 'buy');
      expect(price).toBe(1101);
    });
  });
});
