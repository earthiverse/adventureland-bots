/* eslint-disable sort-keys */
import AL, {
    BankPackName,
    Character,
    CharacterType,
    ItemData,
    ItemName,
    LocateItemsFilters,
    PingCompensatedCharacter,
} from "alclient"
import { bankingPosition } from "./locations.js"
import { MERCHANT_ITEMS_TO_HOLD } from "../archive/base/merchant.js"
import { checkOnlyEveryMS } from "./general.js"
import { goAndWithdrawItem } from "./banking.js"

export type ItemCount = {
    name: ItemName
    level?: number
    /** How many of this item @ this level do we have? */
    q: number
    /** How many spaces are the items taking up in inventory / bank space? */
    inventorySpaces: number
}

export type ItemConf = {
    /** What level should we start using an offeringp at? */
    offeringp?: number
    /** What level should we start using an offering at? */
    offering?: number
    /** What level should we stop leveling the item at? */
    stop?: number
    /** Should we be destroying these instead? Destroying an item has a 1/1,000,000 chance to get a level 13 */
    destroy?: true
}

/** If the length is 1, the items should be upgraded. If the length is 3, the items should be compounded. */
export type IndexesToCompoundOrUpgrade = number[][]

const DESTROY: ItemConf = {
    destroy: true,
}

const DONT_UPGRADE: ItemConf = {
    stop: 0,
}
const ULTRA_RARE: ItemConf = {
    offeringp: 1,
    offering: 2,
}
const PRETTY_RARE: ItemConf = {
    offeringp: 1,
    offering: 4,
}
const COMMON_HIGH: ItemConf = {
    offeringp: 7,
    offering: 9,
}
/** What we do with upgradable items that are common at level 0 */
const DEFAULT_UPGRADE_BASE_COMMON: ItemConf = {
    offeringp: 8,
    offering: 9,
}
/** What we do with upgradable items that are high at level 0 */
const DEFAULT_UPGRADE_BASE_HIGH: ItemConf = {
    offeringp: 6,
    offering: 8,
}
/** What we do with upgradable items that are rare at level 0 */
const DEFAULT_UPGRADE_BASE_RARE: ItemConf = {
    offeringp: 4,
    offering: 7,
}
/** What we do with compoundable items that are common at level 0 */
const DEFAULT_COMPOUND_BASE_COMMON: ItemConf = {
    offeringp: 3,
    offering: 4,
}
/** What we do with compoundable items that are high at level 0 */
const DEFAULT_COMPOUND_BASE_HIGH: ItemConf = {
    offeringp: 2,
    offering: 3,
}
/** What we do with compoundable items that are rare at level 0 */
const DEFAULT_COMPOUND_BASE_RARE: ItemConf = {
    offeringp: 1,
    offering: 2,
}
const PRIMLING_TO_NINE: ItemConf = {
    offeringp: 9,
    offering: 10,
}
const PRIMLING_TO_TEN: ItemConf = {
    offeringp: 10,
}
export const ITEM_UPGRADE_CONF: {
    [T in ItemName]?: ItemConf
} = {
    // Crafting
    bcape: {
        // Level 7 can be used to craft things things
        stop: 7,
    },
    lostearring: {
        // Level 2 is the best for exchanging
        stop: 2,
    },
    stick: {
        // We craft with level 9 sticks
        stop: 9,
    },
    throwingstars: DONT_UPGRADE,
    vitring: {
        // We craft with level 2 vit rings
        stop: 2,
    },

    // Base armor
    coat: DESTROY,
    gloves: DESTROY,
    helmet: DESTROY,
    pants: DESTROY,
    shoes: DESTROY,

    // Halloween armor
    gphelmet: DESTROY,
    phelmet: DESTROY,

    // Winter armor
    gcape: DESTROY,
    iceskates: DESTROY,
    mittens: DESTROY,
    xmashat: DESTROY,
    xmaspants: DESTROY,
    xmasshoes: DESTROY,
    xmassweater: DESTROY,
    warmscarf: DESTROY,

    // Easter armor
    ecape: DESTROY,
    eears: DESTROY,
    pyjamas: DESTROY,

    // Base weapons
    blade: DESTROY,
    bow: DESTROY,
    cclaw: DESTROY,
    claw: DESTROY,
    mace: DESTROY,
    staff: DESTROY,
    wand: DESTROY,
    wbasher: DESTROY,

    // Halloween weapons
    bowofthedead: DESTROY,
    daggerofthedead: DESTROY,
    maceofthedead: DESTROY,
    pmaceofthedead: DESTROY,
    staffofthedead: DESTROY,
    swordofthedead: DESTROY,

    // Winter weapons
    candycanesword: DESTROY,
    merry: DESTROY,
    ornamentstaff: DESTROY,
    xmace: DESTROY,

    // Very common items
    basher: DESTROY,
    bataxe: DESTROY,
    carrotsword: DESTROY,
    crabclaw: DESTROY,
    cupid: DESTROY,
    dagger: DESTROY,
    fireblade: DESTROY,
    firestaff: DESTROY,
    firestars: DESTROY,
    hbow: DESTROY,
    mushroomstaff: DESTROY,
    pmace: DESTROY,
    pouchbow: DESTROY,
    slimestaff: DESTROY,
    spear: DESTROY,
    stinger: DESTROY,
    swifty: DESTROY,
    sword: DESTROY,
    t2bow: DESTROY,
    tigerhelmet: DESTROY,
    quiver: DESTROY,

    // Crypt
    vattire: PRETTY_RARE,
    vcape: PRETTY_RARE,
    vdagger: PRETTY_RARE,
    vhammer: DONT_UPGRADE,

    // Darkforge
    xarmor: PRETTY_RARE,
    xboots: PRETTY_RARE,
    xgloves: PRETTY_RARE,
    xhelmet: PRETTY_RARE,
    xpants: PRETTY_RARE,

    // Rare-ish
    crossbow: DEFAULT_UPGRADE_BASE_RARE,

    // Heavy armor
    hboots: COMMON_HIGH,
    harmor: COMMON_HIGH,
    hgloves: COMMON_HIGH,
    hhelmet: COMMON_HIGH,
    hpants: COMMON_HIGH,

    // Legendary
    fury: ULTRA_RARE,
    starkillers: ULTRA_RARE,
    suckerpunch: ULTRA_RARE,
    supermittens: ULTRA_RARE,
    t3bow: ULTRA_RARE,

    // Useless
    test_orb: DONT_UPGRADE,

    // Wanderer's
    wattire: DESTROY,
    wbreeches: DESTROY,
    wcap: DESTROY,
    wgloves: DESTROY,
    wshoes: DESTROY,
}

const CACHED_EVERYTHING_COUNTS = new Map<string, ItemCount[]>()
/**
 * This function will aggregate the bank, the inventories of all characters,
 * and the items equipped on all characters so we can see how many of each item
 * we own in total.
 * @param owner The owner to get items for (e.g.: `bot.owner`)
 */
export async function getItemCountsForEverything(owner: string): Promise<ItemCount[]> {
    if (!AL.Database.connection) return []
    if (!checkOnlyEveryMS(`item_everything_counts_${owner}`, 60_000)) {
        return CACHED_EVERYTHING_COUNTS.get(owner)
    }

    const counts = await AL.BankModel.aggregate([
        {
            /** Find our bank **/
            $match: {
                owner: owner,
            },
        },
        {
            /** Find our characters **/
            $lookup: {
                from: "players",
                localField: "owner",
                foreignField: "owner",
                as: "players",
            },
        },
        {
            /** Add player equipment **/
            $addFields: {
                equipment: {
                    $filter: {
                        input: {
                            $concatArrays: [
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 0] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 1] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 2] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 3] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 4] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 5] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 6] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 7] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 8] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 9] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 10] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 11] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 12] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 13] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 14] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 15] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 16] }, {}] } },
                                { $objectToArray: { $ifNull: [{ $arrayElemAt: ["$players.slots", 17] }, {}] } },
                            ],
                        },
                        cond: {
                            $and: [{ $ne: ["$$this.v", null] }, { $ne: ["$$this.b", undefined] }],
                        },
                    },
                },
            },
        },
        {
            /** Merge equipment with bank and inventories **/
            $project: {
                allItems: {
                    $filter: {
                        input: {
                            $concatArrays: [
                                { $ifNull: ["$items0", []] },
                                { $ifNull: ["$items1", []] },
                                { $ifNull: ["$items2", []] },
                                { $ifNull: ["$items3", []] },
                                { $ifNull: ["$items4", []] },
                                { $ifNull: ["$items5", []] },
                                { $ifNull: ["$items6", []] },
                                { $ifNull: ["$items7", []] },
                                { $ifNull: ["$items8", []] },
                                { $ifNull: ["$items9", []] },
                                { $ifNull: ["$items10", []] },
                                { $ifNull: ["$items11", []] },
                                { $ifNull: ["$items12", []] },
                                { $ifNull: ["$items13", []] },
                                { $ifNull: ["$items14", []] },
                                { $ifNull: ["$items15", []] },
                                { $ifNull: ["$items16", []] },
                                { $ifNull: ["$items17", []] },
                                { $ifNull: ["$items18", []] },
                                { $ifNull: ["$items19", []] },
                                { $ifNull: ["$items20", []] },
                                { $ifNull: ["$items21", []] },
                                { $ifNull: ["$items22", []] },
                                { $ifNull: ["$items23", []] },
                                { $ifNull: ["$items24", []] },
                                { $ifNull: ["$items25", []] },
                                { $ifNull: ["$items26", []] },
                                { $ifNull: ["$items27", []] },
                                { $ifNull: ["$items28", []] },
                                { $ifNull: ["$items29", []] },
                                { $ifNull: ["$items30", []] },
                                { $ifNull: ["$items31", []] },
                                { $ifNull: ["$items32", []] },
                                { $ifNull: ["$items33", []] },
                                { $ifNull: ["$items34", []] },
                                { $ifNull: ["$items35", []] },
                                { $ifNull: ["$items36", []] },
                                { $ifNull: ["$items37", []] },
                                { $ifNull: ["$items38", []] },
                                { $ifNull: ["$items39", []] },
                                { $ifNull: ["$items40", []] },
                                { $ifNull: ["$items41", []] },
                                { $ifNull: ["$items42", []] },
                                { $ifNull: ["$items43", []] },
                                { $ifNull: ["$items44", []] },
                                { $ifNull: ["$items45", []] },
                                { $ifNull: ["$items46", []] },
                                { $ifNull: ["$items47", []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 0] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 1] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 2] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 3] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 4] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 5] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 6] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 7] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 8] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 9] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 10] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 11] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 12] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 13] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 14] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 15] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 16] }, []] },
                                { $ifNull: [{ $arrayElemAt: ["$players.items", 17] }, []] },
                                { $ifNull: ["$equipment.v", []] },
                            ],
                        },
                        as: "item",
                        cond: { $ne: ["$$item", null] },
                    },
                },
            },
        },
        {
            $unwind: {
                path: "$allItems",
            },
        },
        {
            /** Group by name and level **/
            $group: {
                _id: { name: "$allItems.name", level: "$allItems.level" },
                inventorySpaces: { $count: {} },
                q: { $sum: "$allItems.q" },
            },
        },
        {
            /** Clean up **/
            $project: {
                _id: false,
                name: "$_id.name",
                level: "$_id.level",
                inventorySpaces: "$inventorySpaces",
                q: { $max: ["$q", "$inventorySpaces"] },
            },
        },
        {
            $sort: {
                name: 1,
                level: -1,
                q: -1,
            },
        },
    ])

    CACHED_EVERYTHING_COUNTS.set(owner, counts)
    return counts
}

const CACHED_BANK_HAS = new Map<string, boolean>()
export async function hasItemInBank(owner: string, itemName: ItemName) {
    const key = `bank_has_${owner}_${itemName}`
    if (!AL.Database.connection) return []
    if (!checkOnlyEveryMS(key, 60_000)) {
        return CACHED_BANK_HAS.get(key)
    }

    const check = await AL.BankModel.aggregate([
        {
            /** Find our bank **/
            $match: {
                owner: owner,
            },
        },
        {
            /** Set up easier search */
            $addFields: {
                doc: {
                    $objectToArray: "$$ROOT",
                },
            },
        },
        {
            /** Match if we have it */
            $match: {
                "doc.k": /^items/,
                "doc.v.name": itemName,
            },
        },
        {
            /** We don't need to return everything */
            $project: {
                owner: 1,
            },
        },
    ])

    const has = check.length > 0
    CACHED_BANK_HAS.set(key, has)
    return has
}

/**
 * Calculates what offering (if any) we should use to compound or upgrade the item
 * @param item The item data
 */
export function getOfferingToUse(item: ItemData): ItemName {
    if (!item) return undefined

    const gItem = AL.Game.G.items[item.name]
    let conf = ITEM_UPGRADE_CONF[item.name]
    if (!conf) {
        if (gItem.compound) {
            if (gItem.grades[0] > 0) conf = DEFAULT_COMPOUND_BASE_COMMON
            else if (gItem.grades[1] > 0) conf = DEFAULT_COMPOUND_BASE_HIGH
            else if (gItem.grades[2] > 0) conf = DEFAULT_COMPOUND_BASE_RARE
        } else if (gItem.upgrade) {
            if (gItem.grades[0] > 0) conf = DEFAULT_UPGRADE_BASE_COMMON
            else if (gItem.grades[1] > 0) conf = DEFAULT_UPGRADE_BASE_HIGH
            else if (gItem.grades[2] > 0) conf = DEFAULT_UPGRADE_BASE_RARE
        }
    }
    if (conf) {
        if (item.level >= conf.offering) return "offering"
        else if (item.level >= conf.offeringp) return "offeringp"
    }

    return undefined
}

/**
 * Withdraws items from bank
 * @param bot
 * @param items The item(s) you wish to withdraw
 * @param options
 */
export async function withdrawItemFromBank(
    bot: Character,
    items: ItemName | ItemName[],
    itemFilters: LocateItemsFilters = {
        locked: false,
    },
    options: {
        freeSpaces: number
        itemsToHold: Set<ItemName>
    },
) {
    // Move to the bank if we're not here
    if (!bot.map.startsWith("bank")) await bot.smartMove(bankingPosition)

    // Put the single item in an array
    if (typeof items == "string") items = [items]

    // Get a list of inventory positions that we can swap items to
    const toKeep = bot.locateItems(items, bot.items, itemFilters)
    const freeSlots = getUnimportantInventorySlots(bot, options.itemsToHold).filter((i) => !toKeep.includes(i))

    if (freeSlots.length == 0) throw new Error("No free slots in inventory!")

    // Look in all the bank packs
    for (const bP in bot.bank) {
        if (bP == "gold") continue

        const bankPack = bP as BankPackName
        const bankItems = bot.bank[bankPack]

        // Locate the items in the bank pack, and withdraw them
        for (const pos of bot.locateItems(items, bankItems, itemFilters)) {
            // Move to the target bank pack if we need to
            await bot.smartMove(bankPack, { getWithin: 10000 })

            await bot.withdrawItem(bankPack, pos, freeSlots.pop())
            if (bot.esize < options.freeSpaces) break // Limited space in inventory
        }
    }
}

export function getEmptyInventorySlots(bot: PingCompensatedCharacter): number[] {
    if (bot.esize <= 0) return []

    const slots: number[] = []

    for (let i = 0; i < bot.isize; i++) {
        const item = bot.items[i]
        if (!item) slots.push(i)
    }

    return slots
}

/**
 * This function will get inventory slots that aren't holding important items, so even
 * if our inventory is full of junk, we can still swap things from bank accounts to
 * compound and upgrade
 * @param bot
 */
export function getUnimportantInventorySlots(bot: Character, itemsToHold = MERCHANT_ITEMS_TO_HOLD): number[] {
    const slots: number[] = []

    for (let i = 0; i < bot.items.length; i++) {
        const slot = bot.items[i]
        if (!slot) {
            slots.push(i)
            continue
        }
        if (slot.l) continue // Hold locked items
        if (itemsToHold.has(slot.name)) continue
        if (slot.name.startsWith("cscroll") || slot.name.startsWith("scroll") || slot.name.startsWith("offering"))
            continue // Hold items used for upgrading
        slots.unshift(i)
    }

    return slots
}

/**
 * This function will return the number of items we can compound / upgrade without
 * worrying about losing the item.
 *
 * NOTE: Upgrade and compound lower level items first!
 *
 * NOTE: This does not take in to account titled items (shiny, glitched, etc.)
 *
 * @param item the item name you are considering compounding or upgrading
 * @param currentCount the number of items you have of this item
 * @returns the number of this item we are okay to compound or upgrade
 */
export function getNumOkayToCompoundOrUpgrade(item: ItemName, currentCount: number): number {
    const gItem = AL.Game.G.items[item]
    let classMultiplier = 4
    if (gItem.class?.length == 1) {
        if (gItem.class[0] == "merchant") {
            classMultiplier = 1
        } else {
            classMultiplier = 3
        }
    }

    let twoHandMultiplier = 1
    for (const characterType in AL.Game.G.classes) {
        const cType = characterType as CharacterType
        const gClass = AL.Game.G.classes[cType]
        if (!gItem.class?.includes(cType)) continue // This weapon can't be used on this character type
        if (gClass.mainhand[gItem.wtype] && gClass.offhand[gItem.wtype]) {
            // We can equip two of these on some character type
            twoHandMultiplier = 2
            break
        }
    }
    if (gItem.type == "ring" || gItem.type == "earring") {
        twoHandMultiplier = 2
    }

    const multiplier = twoHandMultiplier * classMultiplier
    return currentCount - multiplier
}

/**
 * Get a list of indexes of items to compound or upgrade. The function will move you to the
 * bank and withdraw items to compound or upgrade
 * @param bot
 * @param counts
 * @returns A nested array of indexes to compound or upgrade. If there are 3 items in the sub array, you should compound. If it's one item, you should upgrade.
 */
export async function getItemsToCompoundOrUpgrade(bot: PingCompensatedCharacter): Promise<number[][]> {
    if (!bot.map.startsWith("bank")) {
        await bot.closeMerchantStand()
        await bot.smartMove(bankingPosition)
    }
    const counts = await getItemCountsForEverything(bot.owner)

    const hasOffering = bot.hasItem("offering")
    const hasOfferingP = bot.hasItem("offeringp")

    const okayToCompoundOrUpgrade: {
        pack: BankPackName | "inventory"
        name: ItemName
        level: number
        index: number
    }[] = []

    let currentName: ItemName
    let currentLevel: number
    let currentCount: number
    for (let i = 0; i < counts.length; i++) {
        const count = counts[i]
        if (count.level === undefined) continue // Not compoundable/upgradable
        if (count.name !== currentName) {
            currentName = count.name
            currentLevel = count.level
            currentCount = getNumOkayToCompoundOrUpgrade(currentName, count.inventorySpaces)
        } else {
            currentLevel = count.level
            currentCount += count.inventorySpaces
        }

        if (currentCount > 0) {
            // We're going to find all the items at the same or lower level, so find the next item for the next loop iteration
            for (let j = i + 1; j < counts.length; j++) {
                const count2 = counts[j]
                if (count2.name !== currentName) break
                i = j
            }

            const parseInventory = (inventory: ItemData[], inventoryName: BankPackName | "inventory") => {
                for (let i = 0; i < inventory.length; i++) {
                    const slot = inventory[i]
                    if (!slot) continue // empty slot
                    if (slot.name !== currentName) continue // different item
                    if (slot.level > currentLevel) continue // different level
                    if (slot.level == currentLevel) {
                        // We want to withdraw only a certain amount of this level's items, and all items that are a lower level
                        if (currentCount <= 0) continue
                        else currentCount -= 1
                    }
                    if (slot.l) continue // It's locked!?

                    // Check if we want to upgrade it
                    if (
                        ITEM_UPGRADE_CONF[slot.name]?.stop !== undefined &&
                        slot.level >= ITEM_UPGRADE_CONF[slot.name].stop
                    )
                        continue

                    // Check if we want to destroy it
                    if (ITEM_UPGRADE_CONF[slot.name]?.destroy && slot.level === 0) continue

                    // Check if we have an offering to upgrade this item with. If we don't, leave it.
                    const offeringToUse = getOfferingToUse(slot)
                    if (offeringToUse == "offering" && !hasOffering) continue
                    if (offeringToUse == "offeringp" && !hasOfferingP) continue

                    okayToCompoundOrUpgrade.push({
                        pack: inventoryName,
                        name: currentName,
                        level: slot.level,
                        index: i,
                    })
                }
            }

            // Consider the items in our inventory first
            parseInventory(bot.items, "inventory")

            // Find all of the items in our bank
            for (const pack in bot.bank) {
                if (pack == "gold") continue
                const packName = pack as BankPackName
                parseInventory(bot.bank[packName], packName)
            }
        }
    }

    okayToCompoundOrUpgrade.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name)
        if (a.level !== b.level) return a.level - b.level
        return 0
    })

    // Remove compoundables that we don't have three of
    for (let i = 0; i < okayToCompoundOrUpgrade.length; i++) {
        const okay = okayToCompoundOrUpgrade[i]
        const gData = AL.Game.G.items[okay.name]
        if (gData.compound) {
            const okay2 = okayToCompoundOrUpgrade[i + 1]
            if (!okay2 || okay.name !== okay2.name || okay.level !== okay2.level) {
                // Not enough to compound, remove
                okayToCompoundOrUpgrade.splice(i, 1)
                i -= 1
                continue
            }
            const okay3 = okayToCompoundOrUpgrade[i + 2]
            if (!okay3 || okay.name !== okay3.name || okay.level !== okay3.level) {
                // Not enough to compound, remove
                okayToCompoundOrUpgrade.splice(i, 2)
                i -= 1
                continue
            }
            i += 2
        }
    }

    okayToCompoundOrUpgrade.sort((a, b) => {
        // Withdraw lower level items first
        if (a.level !== b.level) return a.level - b.level
    })

    const inventorySlots = getUnimportantInventorySlots(bot)
    inventorySlots.pop() // Keep one empty space in case we need to buy a scroll

    // This is our list of indexes that contain items that are okay to compound or upgrade
    const indexes: number[][] = []

    const specialWithdraw = async (pack: BankPackName, bankIndex: number): Promise<number> => {
        const index = inventorySlots.pop()
        if (bot.items[index] !== undefined) {
            // Check if this inventory index was also an okayToCompoundOrUpgrade item
            for (const okay of okayToCompoundOrUpgrade) {
                if (okay.pack !== "inventory") continue
                if (okay.index !== index) continue

                // We're depositing it, update its index in case we need to withdraw it again
                okay.pack = pack
                okay.index = bankIndex
                break
            }
        }

        // Move to the target bank pack if we need to
        await goAndWithdrawItem(bot, pack, bankIndex, index)
        return index
    }

    // Withdraw items to our inventory
    for (let i = 0; i < okayToCompoundOrUpgrade.length; i++) {
        if (inventorySlots.length <= 0) break // No more free slots
        const okay = okayToCompoundOrUpgrade[i]
        const gInfo = AL.Game.G.items[okay.name]
        if (gInfo.compound && inventorySlots.length >= 3) {
            // Withdraw the three compoundable items, and combine the three indexes
            const compoundIndexes: number[] = []
            if (okay.pack !== "inventory") compoundIndexes.push(await specialWithdraw(okay.pack, okay.index))
            else compoundIndexes.push(inventorySlots.splice(inventorySlots.indexOf(okay.index), 1)[0])
            const okay2 = okayToCompoundOrUpgrade[i + 1]
            if (okay2.pack !== "inventory") compoundIndexes.push(await specialWithdraw(okay2.pack, okay2.index))
            else compoundIndexes.push(inventorySlots.splice(inventorySlots.indexOf(okay2.index), 1)[0])
            const okay3 = okayToCompoundOrUpgrade[i + 2]
            if (okay3.pack !== "inventory") compoundIndexes.push(await specialWithdraw(okay3.pack, okay3.index))
            else compoundIndexes.push(inventorySlots.splice(inventorySlots.indexOf(okay3.index), 1)[0])
            indexes.push(compoundIndexes)
            i += 2
        } else {
            // Withdraw the one upgradable item
            if (okay.pack !== "inventory") indexes.push([await specialWithdraw(okay.pack, okay.index)])
            else indexes.push([inventorySlots.splice(inventorySlots.indexOf(okay.index), 1)[0]])
        }
    }

    return indexes
}

export async function upgradeOrCompoundItems(bot: Character, allIndexes: IndexesToCompoundOrUpgrade) {
    for (const indexes of allIndexes) {
        const item = bot.items[indexes[0]]

        // Check if we want to upgrade / compound the item
        const conf = ITEM_UPGRADE_CONF[item.name]
        if (item.level >= conf?.stop) {
            console.debug(`We don't want to upgrade ${item.name} past level ${conf.stop}.`)
            continue
        }

        if (conf.destroy && item.level === 0) {
            // We want to destroy the item, not upgrade it
            continue
        }

        const offering = getOfferingToUse(item)
        let offeringIndex: number
        if (offering) {
            offeringIndex = bot.locateItem(offering, bot.items)
            if (offeringIndex === undefined) {
                console.debug(
                    `We want to upgrade or compound a level ${item.level} ${item.name}, but we want to use ${offering} as an offering, and we don't have any.`,
                )
                continue
            }
        }

        if (indexes.length == 1) {
            // We want to upgrade this item
        } else if (indexes.length == 3) {
            // We want to compound these items
        }
    }
    return
}
