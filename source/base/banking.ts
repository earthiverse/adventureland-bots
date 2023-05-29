import AL, { BankInfo, BankPackName, ItemData, ItemName, LocateItemsFilters, PingCompensatedCharacter, TitleName } from "alclient";
import { getEmptyInventorySlots } from "./items.js";
import { bankingPosition } from "./locations.js";

/** The bank pack name, followed by the indexes for items */
export type PackItems = [BankPackName, number[]]
/** An array of pack items */
export type BankItems = PackItems[]
/** A position in the bank */
export type BankItemPosition = [BankPackName, number]

/** Items with no `data` (i.e. not a cosmetic) or `p` (i.e. not special) */
const GENERIC_ITEM = 'generic'

const sortByPackNumberAsc = (a: PackItems, b: PackItems) => {
    const matchA = /items(\d+)/.exec(a[0])
    const numA = Number.parseInt(matchA[1])
    const matchB = /items(\d+)/.exec(b[0])
    const numB = Number.parseInt(matchB[1])

    // Sort packs by lower indexes first
    return numA - numB
}

export async function goAndDepositItem(bot: PingCompensatedCharacter, pack: BankPackName, packPos: number, inventoryPos: number) {
    await bot.smartMove(pack, { getWithin: 9999 })
    await bot.depositItem(inventoryPos, pack, packPos)
}

export async function goAndWithdrawItem(bot: PingCompensatedCharacter, pack: BankPackName, index: number, inventoryPos = bot.getFirstEmptyInventorySlot()) {
    await bot.smartMove(pack, { getWithin: 9999 })
    await bot.withdrawItem(pack, index, inventoryPos)
}

export type BankOptions = {
    /** We will not deposit locked items by default, toggle this to change that */
    depositLockedItems?: true
    /** What items should we not be depositing? */
    itemsToHold?: Set<ItemName>
    /** What items should we be selling? */
    itemsToSell?: Map<ItemName, [number, number][]>
}

/**
 * Dumps (or attempts to, at least) items from our inventory in to our bank
 * 
 * @param bot 
 * @param options 
 */
export async function dumpInventoryInBank(bot: PingCompensatedCharacter, options: BankOptions) {
    if (!bot.map.startsWith("bank")) throw new Error("We aren't in the bank")
    if (!bot.bank) throw new Error("We don't have bank information")

    const emptyBankSlots = locateEmptyBankSlots(bot)
    function getEmptySlot(): BankItemPosition {
        if (!emptyBankSlots.length) throw new Error("No empty slots")

        const [bankPackName, emptyIndexes] = emptyBankSlots[0]

        // Get an empty slot from the list
        const emptyIndex = emptyIndexes.shift()

        // Remove the pack if there are no more empty slots
        if (!emptyIndexes.length) emptyBankSlots.shift()

        // Return the empty slot name with the index of an empty spot
        return [bankPackName, emptyIndex]
    }

    for (let i = 0; i < bot.isize; i++) {
        const item = bot.items[i]
        if (!item) continue // No item in this slot
        if (options.itemsToHold?.has(item.name)) continue // We want to hold it
        if (!options.depositLockedItems && item.l) continue // It's locked (so we probably want to hold it)

        let idealSlot: BankItemPosition
        if (item.q && AL.Game.G.items[item.name].s > item.q) {
            // See if we can stack it on another stack somewhere
            const bankItems = locateItemsInBank(bot, item, { quantityLessThan: AL.Game.G.items[item.name].s - item.q + 1 })
            if (bankItems.length) {
                // Store it in the slot with the highest quantity
                let highestQuantity = 0;
                for (const [packName, indexes] of bankItems) {
                    for (const i of indexes) {
                        const item = bot.bank[packName][i]
                        if (item.q > highestQuantity) {
                            idealSlot = [packName, i]
                            highestQuantity = item.q
                        }
                    }
                }
            }
        }

        // Use an empty slot if we didn't find a slot for it
        if (!idealSlot) idealSlot = getEmptySlot()

        // Move to the map then deposit the item
        await bot.smartMove(idealSlot[0], { getWithin: 9999 })

        // NOTE: This will *swap* items, it won't stack. Let's just hope it stacks instead with the next function
        // await bot.depositItem(i, idealSlot[0], idealSlot[1]).catch(console.error)
        await bot.depositItem(i, idealSlot[0]).catch(console.error)
    }
}

export async function tidyBank(bot: PingCompensatedCharacter, options: BankOptions) {
    // Deposit everything first
    await dumpInventoryInBank(bot, options)

    if (bot.esize <= 0) throw new Error("We have no inventory space to tidy our bank!")
    const emptySlots = getEmptyInventorySlots(bot)

    const itemNames: {
        [T in ItemName]?: {
            [T in string]?: BankItemPosition[]
        }
    } = {}

    let bankPackName: keyof BankInfo
    for (bankPackName in bot.bank) {
        if (bankPackName == "gold") continue

        for (let i = 0; i < bot.bank[bankPackName].length; i++) {
            const bankItem = bot.bank[bankPackName][i]
            if (!bankItem) continue // There's no item here

            const itemPosition: BankItemPosition = [bankPackName, i]
            const itemData = bankItem.p ?? bankItem.data ?? GENERIC_ITEM

            if (!itemNames[bankItem.name]) itemNames[bankItem.name] = {}
            if (!itemNames[bankItem.name][itemData]) itemNames[bankItem.name][itemData] = [itemPosition]
            else itemNames[bankItem.name][itemData].push(itemPosition)
        }
    }
    let itemName: ItemName

    // Grab items if we can stack them on our `toHold` items
    if (options.itemsToHold) {
        for (itemName in itemNames) {
            if (!options.itemsToHold.has(itemName)) continue // We don't want to hold it

            const gData = AL.Game.G.items[itemName]
            if (!gData.s) continue // It's not stackable

            const itemTypes = itemNames[itemName]
            for (const type in itemTypes) {
                const positions = itemTypes[type]

                for (let i = 0; i < positions.length; i++) {
                    const position = positions[i]
                    const bankPack = position[0]
                    const bankIndex = position[1]
                    const bankItem = bot.bank[bankPack][bankIndex]

                    const indexes = bot.locateItems(itemName, bot.items, { special: bankItem.p })

                    if (indexes.length) {
                        for (const index of indexes) {
                            const item = bot.items[index]
                            if (item.q + bankItem.q <= gData.s) {
                                console.debug("we can stack to hold")
                                await goAndWithdrawItem(bot, bankPack, bankIndex, -1)
                                positions.splice(i, 1)
                                i -= 1
                                break
                            }
                        }
                    }
                }
            }
        }
    }

    // Stack items
    for (itemName in itemNames) {
        const gData = AL.Game.G.items[itemName]
        if (!gData.s) continue // Not stackable

        const itemTypes = itemNames[itemName]
        for (const type in itemTypes) {
            const positions = itemTypes[type]

            positions.sort((a, b) => {
                const itemA = bot.bank[a[0]][a[1]]
                const itemB = bot.bank[b[0]][b[1]]

                // Sort stacks from highest to lowest quantity
                return itemB.q - itemA.q
            })

            for (let i = 1; i < positions.length; i++) {
                const a = positions[i - 1]
                const bankPackA = a[0]
                const positionA = a[1]
                const itemA = bot.bank[bankPackA][positionA]
                if (itemA.q >= gData.s) continue // It's already a full stack

                const b = positions[i]
                const bankPackB = b[0]
                const positionB = b[1]
                const itemB = bot.bank[bankPackB][positionB]

                if (itemA.q + itemB.q < gData.s) {
                    // We can stack them both!
                    if (bankPackA == bankPackB) {
                        console.debug("we can stack both in bank")
                        // We can stack them in the bank
                        await bot.swapBankItems(positionA, positionB, bankPackA)
                    } else {
                        console.debug("we can stack both in inventory")
                        // We can withdraw them to our inventory so they stack, then put them back
                        await goAndWithdrawItem(bot, bankPackA, positionA, emptySlots[0])
                        await goAndWithdrawItem(bot, bankPackB, positionB, -1)
                        await bot.depositItem(emptySlots[0], bankPackB, positionB)
                    }
                    positions.splice(i - 1, 1)
                    itemB.q += itemA.q
                    i -= 1
                } else if (emptySlots.length >= 3) {
                    // We can stack one to the max
                    // Get both items
                    console.debug("we can stack to the max")
                    const inventoryPositionA = emptySlots[0]
                    const inventoryPositionB = emptySlots[1]
                    await goAndWithdrawItem(bot, bankPackA, positionA, inventoryPositionA)
                    await goAndWithdrawItem(bot, bankPackB, positionB, inventoryPositionB)

                    // Split enough from B to stack A to the max
                    const numToSplit = gData.s - itemA.q
                    await bot.splitItem(positionB, numToSplit)
                    const splitItemsPosition = bot.locateItem(itemA.name, bot.items, { quantityGreaterThan: numToSplit - 1, quantityLessThan: numToSplit + 1 })

                    // Stack A to the max
                    await bot.swapItems(splitItemsPosition, inventoryPositionA)

                    // Deposit them back in their original positions
                    await goAndDepositItem(bot, bankPackA, positionA, inventoryPositionA)
                    await goAndDepositItem(bot, bankPackB, positionB, inventoryPositionB)
                }
            }
        }
    }

    // Grab items to sell and sell them
    if (options.itemsToSell) {
        const toSellIndexes = []
        item:
        for (itemName in itemNames) {
            if (!options.itemsToSell.has(itemName)) continue // We don't want to sell it
            if (options.itemsToSell.get(itemName) !== undefined) continue // TODO: Selling it is complicated, add better selling later

            const itemTypes = itemNames[itemName]
            for (const type in itemTypes) {
                if (type !== GENERIC_ITEM) continue // It's special, don't sell it
                const positions = itemTypes[type]

                for (const position of positions) {
                    const bankPack = position[0]
                    const bankIndex = position[1]
                    const emptySlot = emptySlots.shift()
                    await goAndWithdrawItem(bot, bankPack, bankIndex, emptySlot)

                    toSellIndexes.push(emptySlot)
                    if (emptySlots.length === 0) break item // We have no more free spaces
                }
            }
        }

        if (toSellIndexes.length) {
            // Move to main and sell them
            await bot.smartMove("main")
            for (const toSellIndex of toSellIndexes) {
                const item = bot.items[toSellIndex]
                if (!item) continue // No item, we probably already sold it
                if (!options.itemsToHold.has(item.name)) continue // Different item!?

                await bot.sell(toSellIndex, item.q ?? 1)
            }

            // Move back to the bank
            await bot.smartMove(bankingPosition)
        }
    }
}

/**
 * Gets all empty slots in our bank
 * 
 * @param bot 
 * @returns 
 */
export function locateEmptyBankSlots(bot: PingCompensatedCharacter) {
    if (!bot.map.startsWith("bank")) throw new Error("We aren't in the bank")
    if (!bot.bank) throw new Error("We don't have bank information")

    const empty: BankItems = []

    let bankPackName: keyof BankInfo
    for (bankPackName in bot.bank) {
        if (bankPackName == "gold") continue

        const emptyInSlot = []
        for (let i = 0; i < bot.bank[bankPackName].length; i++) {
            const bankItem = bot.bank[bankPackName][i]
            if (bankItem) continue // There's an item here
            emptyInSlot.push(i)
        }

        if (emptyInSlot.length) empty.push([bankPackName, emptyInSlot])
    }

    // Sort by bank pack name
    return empty.sort(sortByPackNumberAsc)
}

/**
 * Gets all items in the bank with the given item name and optional filters
 * 
 * @param bot 
 * @param itemName 
 * @param filters 
 */
export function locateItemsInBank(bot: PingCompensatedCharacter, item: ItemData, filters?: LocateItemsFilters) {
    if (!bot.map.startsWith("bank")) throw new Error("We aren't in the bank")
    if (!bot.bank) throw new Error("We don't have bank information")

    const items: BankItems = []

    let bankPackName: keyof BankInfo
    for (bankPackName in bot.bank) {
        if (bankPackName == "gold") continue

        const itemsInSlot = bot.locateItems(item.name, bot.bank[bankPackName], filters)

        if (itemsInSlot.length) items.push([bankPackName, itemsInSlot])
    }

    return items.sort(sortByPackNumberAsc)
}