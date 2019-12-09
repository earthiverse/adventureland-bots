import { ItemInfo, MonsterName, ItemName, ALPosition, MapName, MapInfo } from "./definitions/adventureland";

export function determineGrade(itemName: ItemName, itemLevel: number) {
    let game_item = G.items[itemName];
    if (!game_item) {
        return -1;
    } else if (itemLevel >= game_item.grades[1]) {
        return 2;
    } else if (itemLevel >= game_item.grades[0]) {
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

export function getMonsterSpawnPosition(type: MonsterName): ALPosition {
    let potentialLocations: ALPosition[] = [];
    for (let id in G.maps) {
        let map: MapInfo = G.maps[id as MapName];
        if (map.instance) continue;
        for (let monster of map.monsters || []) {
            if (monster.type !== type) continue;
            if (monster.boundary) {
                potentialLocations.push({ "map": id as MapName, "x": (monster.boundary[0] + monster.boundary[2]) / 2, "y": (monster.boundary[1] + monster.boundary[3]) / 2 })
            } else if (monster.boundaries) {
                for (let boundary of monster.boundaries) {
                    potentialLocations.push({ "map": boundary[0], "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 })
                }
            }
        }
    }

    return potentialLocations[Math.floor(Math.random() * potentialLocations.length)];
}

export function getNearbyMonsterSpawns(position: ALPosition, threshold: number = 1000): [MonsterName, ALPosition][] {
    let locations: [MonsterName, ALPosition][] = [];
    let map: MapInfo = G.maps[position.map];
    if (map.instance) return;
    for (let monster of map.monsters || []) {
        if (monster.boundary) {
            let location = { "map": position.map as MapName, "x": (monster.boundary[0] + monster.boundary[2]) / 2, "y": (monster.boundary[1] + monster.boundary[3]) / 2 };
            if (parent.distance(position, location) < threshold) locations.push([monster.type, location])
        } else if (monster.boundaries) {
            for (let boundary of monster.boundaries) {
                if (boundary[0] !== position.map) continue;
                let location = { "map": position.map, "x": (boundary[1] + boundary[3]) / 2, "y": (boundary[2] + boundary[4]) / 2 }
                if (parent.distance(position, location) < threshold) locations.push([monster.type, location])
            }
        }
    }

    return locations;
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