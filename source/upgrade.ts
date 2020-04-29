import { findItems, findItemsWithLevel, getInventory, findItem } from "./functions"
import { ItemName } from "./definitions/adventureland"
import { MyItemInfo } from "./definitions/bots"

export function compoundItem(itemname: ItemName, targetLevel: number): void {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (!findItems("computer").length) {
        let foundUpgrade = false
        for (const npc of parent.npcs) {
            if (npc.id == "newupgrade" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundUpgrade = true
                break
            }
        }
        if (!foundUpgrade) return // Can't compound, nobody is near.
    }

    if (parent.character.q && parent.character.q["compound"]) return // Already compounding

    let items: MyItemInfo[]
    for (let itemLevel = 0; itemLevel < targetLevel; itemLevel++) {
        items = findItemsWithLevel(itemname, itemLevel)
        if (items.length >= 3)
            // Found enough items to combine!
            break
    }

    if (items.length < 3)
        // Didn't find enough items to combine...
        return

    const grade = item_grade(items[0])
    let scroll: MyItemInfo
    if (grade == 0) {
        scroll = findItem("cscroll0")
    } else if (grade == 1) {
        scroll = findItem("cscroll1")
    } else if (grade == 2) {
        scroll = findItem("cscroll2")
    }
    compound(items[0].index, items[1].index, items[2].index, scroll.index)
}

export function upgradeItem(itemname: ItemName, targetLevel: number): void {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (parent.character.q.upgrade) return // Already upgrading
    if (!findItems("computer").length) {
        let foundUpgrade = false
        for (const npc of parent.npcs) {
            if (npc.id == "newupgrade" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundUpgrade = true
                break
            }
        }
        if (!foundUpgrade) return // Can't upgrade, nobody is near.
    }


    const item = findItem(itemname)
    if (item && item.level < targetLevel) {
        const grade = item_grade(item)
        let scroll: MyItemInfo
        if (grade == 0) {
            scroll = findItem("scroll0")
        } else if (grade == 1) {
            scroll = findItem("scroll1")
        } else if (grade == 2) {
            scroll = findItem("scroll2")
        }
        if (scroll) upgrade(item.index, scroll.index)
        return
    }
}

export function compoundIfMany(maxLevel: number): void {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (parent.character.q.compound) return // Already compounding
    if (!findItems("computer").length) {
        let foundUpgrade = false
        for (const npc of parent.npcs) {
            if (npc.id == "newupgrade" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundUpgrade = true
                break
            }
        }
        if (!foundUpgrade) return // Can't upgrade, nobody is near.
    }

    const items: MyItemInfo[] = []
    for (const item of getInventory()) {
        if (!G.items[item.name].compound) continue // We can't compound this item
        if (item.level >= maxLevel) continue // The item level's higher than we want to upgrade
        items.push(item)
    }
    items.sort((a, b) => {
        if (a.name != b.name) {
          return a.name.localeCompare(b.name);
        }
        return a.level - b.level;
    })

    for (let i = 0; i < items.length - 2; i++) {
        if (items[i].name == items[i + 1].name && items[i].name == items[i + 2].name // Match names
            && items[i].level == items[i + 1].level && items[i].level == items[i + 2].level // Match levels
        ) {
            // Found 3 identical items to compound
            const grade = item_grade(items[i])
            let scroll
            if (grade == 0) {
                scroll = findItem("cscroll0")
            } else if (grade == 1) {
                scroll = findItem("cscroll1")
            } else if (grade == 2) {
                scroll = findItem("cscroll2")
            }
            compound(items[i].index, items[i + 1].index, items[i + 2].index, scroll.index)
            return
        }

    }
}

/**
 * This function will upgrade items in your inventory if there are more than one of the same item. It will upgrade until one breaks, keeping the higher level item, and upgrading the lower level item.
 */
export function upgradeIfMany(maxLevel: number): void {
    if (parent.character.map == "bank") return // We can't do things in the bank
    if (parent.character.q.upgrade) return // Already upgrading
    if (!findItems("computer").length) {
        let foundUpgrade = false
        for (const npc of parent.npcs) {
            if (npc.id == "newupgrade" && distance(parent.character, {
                x: npc.position[0],
                y: npc.position[1]
            }) < 350) {
                foundUpgrade = true
                break
            }
        }
        if (!foundUpgrade) return // Can't upgrade, nobody is near.
    }
    for (let i = 0; i < 42; i++) {
        if (!parent.character.items[i]) continue // No item in this slot
        if (!(G.items[parent.character.items[i].name].upgrade)) continue // Not upgradable

        const items = findItems(parent.character.items[i].name)
        if (items.length == 1) continue // We only have one.

        // Sort the items so we have the lowest level first
        items.sort((a, b) => {
            return a.level - b.level;
        });

        const item = items[0]
        if (item.level >= maxLevel) continue // Don't upgrade high level items

        const grade = item_grade(item)
        let scrolls: MyItemInfo
        if (grade == 0) {
            scrolls = findItem("scroll0")
        } else if (grade == 1) {
            scrolls = findItem("scroll1")
        } else if (grade == 2) {
            scrolls = findItem("scroll2")
        }
        if (scrolls) upgrade(item.index, scrolls.index)
        return
    }
}