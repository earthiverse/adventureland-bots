import { determineGrade, findItems, findItemsWithLevel, getInventory } from "./functions";
import { ItemName } from "./definitions/adventureland";

export function compoundItem(itemname: ItemName, target_level: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(parent.character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundUpgrade = true;
            break;
        }
    }
    if (!foundUpgrade) return; // Can't compound, nobody is near.

    if (parent.character.q && parent.character.q["compound"]) return; // Already compounding

    let items;
    let item_level;
    for (item_level = 0; item_level < target_level; item_level++) {
        items = findItemsWithLevel(itemname, item_level);
        if (items.length >= 3)
            // Found enough items to combine!
            break;
    }

    if (items.length < 3)
        // Didn't find enough items to combine...
        return;

    let grade = determineGrade(itemname, item_level);
    let scrolls;
    if (grade == 0) {
        scrolls = findItems("cscroll0");
    } else if (grade == 1) {
        scrolls = findItems("cscroll1");
    } else if (grade == 2) {
        scrolls = findItems("cscroll2");
    }
    compound(items[0][0], items[1][0], items[2][0], scrolls[0][0])
}

export function upgradeItem(itemname: ItemName, target_level: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(parent.character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundUpgrade = true;
            break;
        }
    }
    if (!foundUpgrade) return; // Can't upgrade, nobody is near.

    if (parent.character.q && parent.character.q["upgrade"]) return; // Already upgrading

    let items = findItems(itemname);
    if (!items)
        // No item to upgrade
        return;

    for (let [i, item] of items) {
        if (item.level < target_level) {
            let grade = determineGrade(itemname, item.level);
            let scrolls;
            if (grade == 0) {
                scrolls = findItems("scroll0");
            } else if (grade == 1) {
                scrolls = findItems("scroll1");
            } else if (grade == 2) {
                scrolls = findItems("scroll2");
            }
            if (scrolls) upgrade(i, scrolls[0][0])
            return;
        }
    }
}

export function compoundIfMany(maxLevel: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(parent.character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundUpgrade = true;
            break;
        }
    }
    if (!foundUpgrade) return; // Can't upgrade, nobody is near.
    if (parent.character.q && parent.character.q["compound"]) return; // Already compounding

    // name, level, slot #
    // TODO: Change this to a custom object
    let items: [ItemName, number, number][] = [];
    getInventory().forEach((item) => {
        if (!G.items[item.name].compound) return; // We can't compound this item
        if (item.level >= maxLevel) return; // The item level's higher than we want to upgrade
        items.push([item.name, item.level, item.index])
    })
    items.sort();

    for (let i = 0; i < items.length - 2; i++) {
        if (items[i][0] == items[i + 1][0] && items[i][0] == items[i + 2][0] // Match names
            && items[i][1] == items[i + 1][1] && items[i][1] == items[i + 2][1] // Match levels
        ) {
            // Found 3 identical items to compound
            let grade = determineGrade(items[i][0], items[i][1]);
            let scrolls;
            if (grade == 0) {
                scrolls = findItems("cscroll0");
            } else if (grade == 1) {
                scrolls = findItems("cscroll1");
            } else if (grade == 2) {
                scrolls = findItems("cscroll2");
            }
            compound(items[i][2], items[i + 1][2], items[i + 2][2], scrolls[0][0])
            return;
        }

    }
}

/**
 * This function will upgrade items in your inventory if there are more than one of the same item. It will upgrade until one breaks, keeping the higher level item, and upgrading the lower level item.
 */
export function upgradeIfMany(maxLevel: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(parent.character, {
            x: npc.position[0],
            y: npc.position[1]
        }) < 350) {
            foundUpgrade = true;
            break;
        }
    }
    if (!foundUpgrade) return; // Can't upgrade, nobody is near.
    if (parent.character.q && parent.character.q["upgrade"]) return; // Already upgrading
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue; // No item in this slot
        if (!(G.items[parent.character.items[i].name].upgrade)) continue; // Not upgradable

        let items = findItems(parent.character.items[i].name)
        if (items.length == 1) continue; // We only have one.

        let minimumLevel = Math.min(...items.map(([, { level }]) => level)) // Find the minimum level
        items = findItemsWithLevel(parent.character.items[i].name, minimumLevel);
        if (items[0][1].level >= maxLevel) continue; // Don't upgrade high level items

        let grade = determineGrade(items[0][1].name, items[0][1].level);
        let scrolls;
        if (grade == 0) {
            scrolls = findItems("scroll0");
        } else if (grade == 1) {
            scrolls = findItems("scroll1");
        } else if (grade == 2) {
            scrolls = findItems("scroll2");
        }
        if (scrolls) upgrade(items[0][0], scrolls[0][0])
        return;
    }
}