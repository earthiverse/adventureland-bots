import { ItemInfo, MonsterName, ItemName } from "./definitions/adventureland";

export function determineGrade(item: ItemInfo) {
    let game_item = G.items[item.name];
    if (!game_item) {
        return -1;
    } else if (item.level >= game_item.grades[1]) {
        return 2;
    } else if (item.level >= game_item.grades[0]) {
        return 1;
    } else {
        return 0;
    }
}

export function sendMassCM(names: string[], data: any) {
    for (let name of names) {
        send_local_cm(name, data);
    }
}

export function buyAndUpgrade(itemName: ItemName, targetLevel: number = 9, targetQuantity: number = 1) {
    let foundNPCBuyer = false;
    for (let npc of parent.npcs.filter(npc => G.npcs[npc.id].role == "merchant")) {
        if (distance(character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundNPCBuyer = true;
            break;
        }
    }
    if (!foundNPCBuyer) return; // Can't buy things, nobody is near.

    let items = findItemsWithLevel(itemName, targetLevel)
    if (items.length >= targetQuantity) return; // We have it!

    items = findItems(itemName);
    if (items.length < 2) buy_with_gold(itemName, 1); // Buy one if we don't have any to upgrade
}

/**
 * Returns the inventory for the player, with all empty slots removed.
 */
export function getInventory(inventory = parent.character.items): [number, ItemInfo][] {
    let items: [number, ItemInfo][] = [];
    for (let i = 0; i < 42; i++) {
        if (!inventory[i]) continue; // No item in this slot
        items.push([i, inventory[i]])
    }
    return items;
}

export function findItems(name: ItemName): [number, ItemInfo][] {
    let items: [number, ItemInfo][] = [];
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue; // No item in this slot
        if (parent.character.items[i].name != name) continue; // Item doesn't match.

        items.push([i, parent.character.items[i]]);
    }
    return items;
}

export function findItemsWithLevel(name: ItemName, level: number): [number, ItemInfo][] {
    let items: [number, ItemInfo][] = [];
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue; // No item in this slot
        if (parent.character.items[i].name != name) continue; // Item doesn't match.
        if (parent.character.items[i].level != level) continue; // Level doesn't match

        items.push([i, parent.character.items[i]]);
    }
    return items;
}