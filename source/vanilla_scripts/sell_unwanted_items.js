/* eslint-disable no-undef */
/**
 * This script shows how to loop through an inventory
 * and sell unwanted items.
 */

const itemsToSell = [
    "hpamulet", "hpbelt",
    "slimestaff"
]

for (let i = 0; i < character.isize; i++) {
    const item = character.items[i]
    if (!item) continue // There is no item in this slot
    if (!itemsToSell.includes(item.name)) continue // This item is not on our to-sell list
    sell(i)
}