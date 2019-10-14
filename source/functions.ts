import { ItemInfo } from "./definitions/adventureland";

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