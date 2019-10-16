import { ItemInfo } from "./definitions/adventureland";
import { findItems, findItemsWithLevel } from "./functions";

function determineGrade(item: ItemInfo) {
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

export function compoundItem(itemname: string, target_level: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(character, { // TODO: Add other NPCs that buy things
            x: npc.position[0],
            y: npc.position[1]
        }) < 300) {
            foundUpgrade = true;
            break;
        }
    }
    if (!foundUpgrade) return; // Can't compound, nobody is near.

    if (character.q && character.q["compound"]) return; // Already compounding

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

export function upgradeItem(itemname: string, target_level: number) {
    let foundUpgrade = false;
    for (let npc of parent.npcs) {
        if (npc.id == "newupgrade" && distance(character, { // TODO: Add other NPCs that buy things
            x: npc.position[0],
            y: npc.position[1]
        }) < 300) {
            foundUpgrade = true;
            break;
        }
    }
    if (!foundUpgrade) return; // Can't upgrade, nobody is near.

    if (character.q && character.q["upgrade"]) return; // Already upgrading

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
            if (scrolls)
                upgrade(i, scrolls[0][0])
                return;
        }
    }
}