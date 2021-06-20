/* eslint-disable no-undef */
/**
 * This script will search our bank and combine multiple stacks of items to single stacks if we can.
 * The items will end up in your inventory, put them back in the bank after
 *
 * NOTES: Run this script in the bank.
 * NOTES: Run this with lots of space in your inventory. (TODO: Check for space)
 */

const stackList = {}

// Create the list of duplicate items
for (const bankSlot in character.bank) {
    const matches = /items(\d+)/.exec(bankSlot)
    // Only get stuff from the packs in the current level
    if (character.map == "bank") {
        if (!matches || Number.parseInt(matches[1]) > 7) continue
    } else if (character.map == "bank_b") {
        if (!matches || Number.parseInt(matches[1]) < 8 || Number.parseInt(matches[1]) > 23) continue
    } else if (character.map == "bank_u") {
        if (!matches || Number.parseInt(matches[1]) < 24) continue
    }

    for (let i = 0; i < character.bank[bankSlot].length; i++) {
        const item = character.bank[bankSlot][i]
        if (!item) continue // Empty slot
        if (!item.q) continue // Not stackable
        if (item.q >= G.items[item.name].s) continue // Maximum stack quantity already reached
        if (!stackList[item.name]) stackList[item.name] = []
        stackList[item.name].push([bankSlot, i, item.q])
    }
}

// Remove items with only one stack
for (const itemName in stackList) {
    const items = stackList[itemName]
    if (items.length == 1) delete stackList[itemName]
}

// Find things we can stack
for (const itemName in stackList) {
    const stacks = stackList[itemName]
    for (let j = 0; j < stacks.length - 1; j++) {
        const stack1 = stacks[j]
        const stack2 = stacks[j + 1]
        const stackLimit = G.items[itemName].s
        if (stack1[2] + stack2[2] > stackLimit) continue // Can't stack, too much

        // TODO: If we have a stand or computer with an empty space, use it to help create full stacks

        // We can stack!
        bank_retrieve(stack1[0], stack1[1])
        bank_retrieve(stack2[0], stack2[1])
        stack2[2] += stack1[2]
    }
}

show_json(stackList)