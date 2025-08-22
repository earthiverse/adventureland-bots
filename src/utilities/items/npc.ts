import type { GData, ItemKey } from "typed-adventureland";

const npcItemsCache: ItemKey[] = [];

export function isPurchasableFromNpc(item: ItemKey, g?: GData): boolean {
  if (npcItemsCache.length > 0) return npcItemsCache.includes(item);
  if (g === undefined)
    throw new Error("We haven't calculated which items are purchasable from an NPC, and we don't have GData.");
  return getNpcPurchasableItems(g).includes(item);
}

export function getNpcPurchasableItems(g: GData): ItemKey[] {
  // Clear the cache
  npcItemsCache.splice(0, npcItemsCache.length);

  // Cacl the items that can be purchased from NPCs.
  npcItemsCache.push(
    ...Object.values(g.npcs)
      .flatMap((npc) => npc.items)
      .filter((item) => item !== undefined && item !== null),
  );
  if (npcItemsCache.length === 0) throw new Error("No items found that can be purchased from NPCs!");
  return npcItemsCache;
}
