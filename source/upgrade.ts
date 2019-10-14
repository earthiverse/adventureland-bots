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
    let j: number;
    if (grade == 0) {
        let scrolls = findItems("cscroll0");
        if (scrolls.length > 0)
            j = scrolls[0][0];
    } else if (grade == 1) {
        let scrolls = findItems("cscroll1");
        if (scrolls.length > 0)
            j = scrolls[0][0];
    } else if (grade == 2) {
        let scrolls = findItems("cscroll2");
        if (scrolls.length > 0)
            j = scrolls[0][0];
    }
    compound(items[0][0], items[1][0], items[2][0], j)
}