import { determineGrade, findItems, findItemsWithLevel } from "./functions";
import { ItemName } from "./definitions/adventureland";

export function compoundItem(itemname: ItemName, target_level: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(character, {
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

    let grade = determineGrade(items[0][1]);
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
        if (npc.id == "newupgrade" && distance(character, {
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
            let grade = determineGrade(item);
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

// TODO: CompoundIfMany function

/**
 * This function will upgrade items in your inventory if there are more than one of the same item. It will upgrade until one breaks, keeping the higher level item, and upgrading the lower level item.
 */
export function upgradeIfMany(maxLevel: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(character, {
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
        if (!["weapon", "helmet", "chest", "pants", "shoes", "shield", "quiver", "gloves", "cape"].includes(G.items[parent.character.items[i].name].type)) continue; // Not upgradable

        let items = findItems(parent.character.items[i].name)
        if (items.length == 1) continue; // We only have one.

        let minimumLevel = Math.min(...items.map(([, { level }]) => level)) // Find the minimum level
        items = findItemsWithLevel(parent.character.items[i].name, minimumLevel);
        let level = items[0][1].level;
        if (level >= maxLevel) continue; // Don't upgrade high level items

        let grade = determineGrade(items[0][1]);
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