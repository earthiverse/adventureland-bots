import type { CharacterType } from 'alclient';

import { DEFAULT_ITEMS_CONFIG } from '@/config/items';
import type { ItemLike, Price } from '@/types/items';

/**
 * If false, we should not hold the item.
 * If true, we should hold the item in any position.
 * If a number, we should hold the item in that inventory slot.
 */
export const shouldHold = (
  item: ItemLike,
  characterType: CharacterType,
  config = DEFAULT_ITEMS_CONFIG,
): boolean | number => {
  if (item.l) return true; // Locked

  const itemConfig = config[item.name];
  if (!itemConfig) return false; // No config
  if (!itemConfig.hold) return false; // No hold config

  const holdConfig = itemConfig.hold;
  return Array.isArray(holdConfig.characterTypes) && !holdConfig.characterTypes.includes(characterType)
    ? false
    : (holdConfig.position ?? true);
};

export const shouldSell = (item: ItemLike, price: Price, config = DEFAULT_ITEMS_CONFIG): boolean => {
  const itemConfig = config[item.name];
  if (!itemConfig) return false; // No config
  if (!itemConfig.sell) return false; // No sell config

  const sellConfig = itemConfig.sell;
  return false; // TODO: FINISH
};
