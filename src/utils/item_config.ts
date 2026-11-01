import type { ItemConfig } from '@/types/items';

export const buyAtGoblinPrice = (): ItemConfig => ({
  buy: { buyPrice: 'goblin' },
});

export const buyAtPontyPrice = (): ItemConfig => ({
  buy: { buyPrice: 'ponty' },
});

export const craft = (): ItemConfig => ({
  craft: { craftWithSpecial: true },
});

export const destroy = (): ItemConfig => ({
  destroy: { destroySpecial: true },
});

export const dismantle = (): ItemConfig => ({
  dismantle: { dismantleSpecial: true },
});

export const exchange = (): ItemConfig => ({
  exchange: {},
});

export const holdFullStack = (position?: number): ItemConfig => ({
  hold: {
    characterTypes: 'all',
    replenish: 9999,
    ...(position !== undefined && { position }),
  },
});

export const sellToNpc = (): ItemConfig => ({
  sell: { sellPrice: 'npc' },
});
