import type { ItemKey } from "typed-adventureland";
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
