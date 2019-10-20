import { ItemInfo, MonsterName } from "./definitions/adventureland";

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

export function buyAndUpgrade(itemName: string) {
    let items = findItemsWithLevel(itemName, 9)
    if (items.length > 0) return; // We have it!

    items = findItems(itemName);
    if (items.length == 0) buy_with_gold(itemName, 1); // Buy one if we don't have any to upgrade
}

export function getMonsterhuntTarget(): MonsterName {
    if (character.s && character.s.monsterhunt)
        return character.s.monsterhunt.id;

    return null;
}

export function findItems(name: string): [number, ItemInfo][] {
    let items: [number, ItemInfo][] = [];
    for (let i = 0; i < 42; i++) {
        if (!character.items[i]) continue; // No item in this slot
        if (character.items[i].name != name) continue; // Item doesn't match.

        items.push([i, character.items[i]]);
    }
    return items;
}

export function findItemsWithLevel(name: string, level?: number): [number, ItemInfo][] {
    let items: [number, ItemInfo][] = [];
    for (let i = 0; i < 42; i++) {
        if (!character.items[i]) continue; // No item in this slot
        if (character.items[i].name != name) continue; // Item doesn't match.
        if (character.items[i].level != level) continue; // Level doesn't match

        items.push([i, character.items[i]]);
    }
    return items;
}