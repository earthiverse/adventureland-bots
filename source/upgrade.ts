import { determineGrade, findItems, findItemsWithLevel, getInventory, findItem } from "./functions";
import { ItemName, ItemInfo } from "./definitions/adventureland";
import { MyItemInfo } from "./definitions/bots";

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

    let items: MyItemInfo[];
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
    let scroll: MyItemInfo;
    if (grade == 0) {
        scroll = findItem("cscroll0");
    } else if (grade == 1) {
        scroll = findItem("cscroll1");
    } else if (grade == 2) {
        scroll = findItem("cscroll2");
    }
    compound(items[0].index, items[1].index, items[2].index, scroll.index)
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

    let item = findItem(itemname);
    if (item && item.level < target_level) {
        let grade = determineGrade(itemname, item.level);
        let scroll: MyItemInfo;
        if (grade == 0) {
            scroll = findItem("scroll0");
        } else if (grade == 1) {
            scroll = findItem("scroll1");
        } else if (grade == 2) {
            scroll = findItem("scroll2");
        }
        if (scroll) upgrade(item.index, scroll.index)
        return;
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
    if (parent.character.q.compound) return; // Already compounding

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
            let scroll;
            if (grade == 0) {
                scroll = findItem("cscroll0");
            } else if (grade == 1) {
                scroll = findItem("cscroll1");
            } else if (grade == 2) {
                scroll = findItem("cscroll2");
            }
            compound(items[i][2], items[i + 1][2], items[i + 2][2], scroll.index)
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

        let minimumLevel = Math.min(...items.map(item => item.level)) // Find the minimum level
        items = findItemsWithLevel(parent.character.items[i].name, minimumLevel);
        if (items[0].level >= maxLevel) continue; // Don't upgrade high level items

        let grade = determineGrade(items[0].name, items[0].level);
        let scrolls: MyItemInfo;
        if (grade == 0) {
            scrolls = findItem("scroll0");
        } else if (grade == 1) {
            scrolls = findItem("scroll1");
        } else if (grade == 2) {
            scrolls = findItem("scroll2");
        }
        if (scrolls) upgrade(items[0].index, scrolls.index)
        return;
    }
}