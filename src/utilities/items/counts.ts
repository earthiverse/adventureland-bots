import type { ItemKey, MapKey } from "typed-adventureland";
import { itemData } from "../../plugins/data_tracker.js";

/**
 * Returns the total number of this item we have
 * @param name
 * @returns
 */
export function getTotalItemCount(name: ItemKey): number {
  let count = 0;
  for (const items of itemData.values()) {
    for (const item of items) {
      if (!item) continue; // Empty slot
      if (item.name !== name) continue; // Different item
      count += item.q ?? 1;
    }
  }
  return count;
}

export function getEmptyBankSlotsCount(map?: Extract<MapKey, "bank" | "bank_b" | "bank_u">): number {
  let count = 0;

  let packFrom = 0;
  let packTo = 47;
  if (map == "bank") {
    packFrom = 0;
    packTo = 7;
  } else if (map == "bank_b") {
    packFrom = 8;
    packTo = 23;
  } else if (map == "bank_u") {
    packFrom = 24;
    packTo = 47;
  }

  for (const [pack, items] of itemData.entries()) {
    if (!pack.startsWith("items")) continue;
    if (map !== undefined) {
      const bankPackNum = Number.parseInt(pack.substring(5, 7));
      if (bankPackNum < packFrom || bankPackNum > packTo) continue; // Pack is not on this map
    }
    for (const item of items) {
      if (item) continue; // Filled slot
      count += 1;
    }
  }
  return count;
}
