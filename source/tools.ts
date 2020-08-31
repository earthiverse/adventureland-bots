import { MapName, ItemName, ItemInfo } from "./definitions/adventureland"

export class Tools {
    /**
     * Returns the distance between two positions.
     * @param a Position 1
     * @param b Position 2
     */
    public static distance(a: { x: number, y: number, map?: MapName }, b: { x: number, y: number, map?: MapName }): number {
        if ((a.map && b.map) && (a.map !== b.map)) return Number.MAX_VALUE

        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
    }

    /**
     * Returns a count of how many of that item we have in our inventory
     * @param item The item name to count
     * @param inventory The inventory to search (e.g.: game.character.items)
     */
    public static countItem(item: ItemName, inventory: ItemInfo[]): number {
        let count = 0
        for (const inventoryItem of inventory) {
            if (!inventoryItem) continue
            if (inventoryItem.name !== item) continue

            // We have the item!
            if (inventoryItem.q) {
                count += inventoryItem.q
            } else {
                count += 1
            }
        }

        return count
    }

    /**
     * Returns a boolean corresponding to whether or not we have the given item
     * @param item The item to check if we have
     * @param inventory The inventory to search (e.g.: game.character.items)
     */
    public static hasItem(item: ItemName, inventory: ItemInfo[]): boolean {
        for (const inventoryItem of inventory) {
            if (!inventoryItem) continue
            if (inventoryItem.name !== item) continue

            // We have the item!
            return true
        }

        // We don't have the item
        return false
    }

    /**
     * Returns the position of the item in the given inventory. Returns `undefined` if we can't locate it.
     * @param item The item to locate
     * @param inventory The inventory to search (e.g.: game.character.items)
     */
    public static locateItem(item: ItemName, inventory: ItemInfo[]): number {
        for (let i = 0; i < inventory.length; i++) {
            const inventoryItem = inventory[i]
            if (!inventoryItem) continue
            if (inventoryItem.name !== item) continue

            // We located the item!
            return i
        }

        // We couldn't locate the item
        return undefined
    }
}