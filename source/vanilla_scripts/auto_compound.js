/* eslint-disable no-undef */
const ITEM_TO_COMPOUND = "ringsj"
const NUM_TO_KEEP = 0
const LEVEL_TO_COMPOUND_TO = 3

async function autoCompoundLoop() {
    try {
        let numItems = 0
        for (let i = 0; i < character.isize; i++) {
            const item = character.items[i]
            if (!item) continue // No item in this slot
            if (item.name !== ITEM_TO_COMPOUND) continue // Not the item we're looking for
            numItems += 1
        }
        if (numItems <= NUM_TO_KEEP) return // No more to compound

        /** Find the lowest level item that we have 3 of to compound */
        let lowestLevel = Number.MAX_SAFE_INTEGER
        let lowestLevelPositions = []

        const itemsByLevel = {}
        for (let i = 0; i < character.isize; i++) {
            const item = character.items[i]
            if (!item) continue // No item in this slot
            if (item.name !== ITEM_TO_COMPOUND) continue // Not the item we're looking for
            if (item.level >= LEVEL_TO_COMPOUND_TO) continue // Already at or above desired level

            if (!itemsByLevel[item.level]) itemsByLevel[item.level] = []
            itemsByLevel[item.level].push(i)
        }

        for (const level in itemsByLevel) {
            const l = Number.parseInt(level)
            if (itemsByLevel[level].length >= 3 && l < lowestLevel) {
                lowestLevel = l
                lowestLevelPositions = itemsByLevel[level].slice(0, 3)
            }
        }

        if (lowestLevelPositions.length < 3) return // No items to compound

        /** Find the scroll that corresponds with the grade of the item */
        const grade = item_grade(character.items[lowestLevelPositions[0]])
        const scroll = `cscroll${grade}`

        /** Buy a scroll if we don't have one */
        let scrollPosition = locate_item(scroll)
        if (scrollPosition == -1) scrollPosition = (await buy(scroll)).num

        /** Speed up the compound if we can */
        if (can_use("massproduction")) use_skill("massproduction")

        /** Compound! */
        await compound(lowestLevelPositions[0], lowestLevelPositions[1], lowestLevelPositions[2], scrollPosition)
    } catch (e) {
        console.error(e)
    }
    autoCompoundLoop()
}
autoCompoundLoop()

// Move to a spot where we can buy scrolls and compound.
smart_move({ map: "main", x: -225, y: -125 })
