import AL, { CharacterType, Item, ItemName, Merchant, PingCompensatedCharacter, Player } from "alclient"
import { Strategy, LoopName, Loop, Strategist, filterContexts } from "../context.js"
import { DEFAULT_ITEM_CONFIG, ItemConfig, UpgradeConfig } from "../../base/itemsNew.js"
import { checkOnlyEveryMS } from "../../base/general.js"

export type ItemStrategyOptions = {
    itemConfig: ItemConfig
    /** If available, we can do things like stacking items on one character instead of across three */
    contexts?: Strategist<PingCompensatedCharacter>[]
    /** If set, we will transfer items to this player if we see them and they have space */
    transferItemsTo?: string
}

export const defaultNewItemStrategyOptions: ItemStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG
}

export class ItemStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: ItemStrategyOptions

    public constructor(options: ItemStrategyOptions = defaultNewItemStrategyOptions) {
        this.options = options

        this.loops.set("item", {
            fn: async (bot: Type) => {
                await this.moveOverflowItems(bot).catch(console.error)
                await this.stackItems(bot).catch(console.error)
                await this.organizeItems(bot).catch(console.error)
                await this.transferItems(bot).catch(console.error)
                await this.transferSellableItems(bot).catch(console.error)
                await this.transferStackableItems(bot).catch(console.error)
            },
            interval: 5_000
        })

        this.loops.set("compound", {
            fn: async (bot: Type) => {
                await this.compound(bot).catch(console.error)
            },
            interval: 250,
        })

        this.loops.set("upgrade", {
            fn: async (bot: Type) => {
                await this.upgrade(bot).catch(console.error)
            },
            interval: 250,
        })
    }

    /**
     * Moves items that are outside of the normal inventory bounds back in
     * if there is space
     */
    private async moveOverflowItems(bot: Type) {
        for (let i = bot.isize; i < bot.items.length; i++) {
            const item = bot.items[i]
            if (!item) continue // No item in overflow slot
            for (let j = 0; j < bot.isize; j++) {
                const item2 = bot.items[j]
                if (item2) continue // Not empty
                return bot.swapItems(i, j)
            }
        }
    }

    /**
     * Organize inventory
     */
    private async organizeItems(bot: Type) {
        for (const [slot, item] of bot.getItems()) {
            const itemConfig = this.options.itemConfig[item.name]

            // Check if we want to hold it in a specific slot
            if (itemConfig && itemConfig.hold && itemConfig.holdSlot !== undefined) {
                if (itemConfig.holdSlot === slot) continue // It's already in its correct slot
                await bot.swapItems(slot, itemConfig.holdSlot)
                continue
            }

            // Sort locked items first
            if (!item.l) continue
            for (let slot2 = 0; slot2 < slot; slot2++) {
                const item2 = bot.items[slot2]
                if (item2 && item2.l) continue // Different locked item
                await bot.swapItems(slot, slot2)
                break
            }
        }
    }

    /**
     * Optimize stacks of items
     */
    private async stackItems(bot: Type) {
        for (let i = 0; i < bot.isize - 1; i++) {
            const item1 = bot.items[i]
            if (!item1) continue // No item
            if (!item1.q) continue // Not stackable

            const gItem = AL.Game.G.items[item1.name]
            if (item1.q === gItem.s) continue // Full stack

            for (let j = i + 1; j < bot.isize; j++) {
                const item2 = bot.items[j]
                if (!item2) continue // No item
                if (item2.name !== item1.name) continue // Different item
                if (item2.p !== item1.p) continue // Different title
                if (item2.v !== item1.v) continue // Different PVP marking
                if (item2.q === gItem.s) continue // Full stack

                if (item1.q + item2.q <= gItem.s) {
                    // We can stack one on the other
                    await bot.swapItems(j, i)
                } else if (bot.esize) {
                    // We can optimize them so one is fully stacked
                    const newSlot = await bot.splitItem(j, gItem.s - item1.q)
                    await bot.swapItems(newSlot, i)
                }
            }
        }
    }

    /**
     * If the `transferItemsTo` option is set, transfer items to that player
     */
    private async transferItems(bot: Type) {
        if (!this.options.transferItemsTo) return // Option isn't set
        if (bot.id === this.options.transferItemsTo) return // Option is set to ourself

        let player: PingCompensatedCharacter | Player = bot.players.get(this.options.transferItemsTo)
        if (!player) return // Couldn't find them
        if (AL.Tools.squaredDistance(bot, player) >= AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) return // They're too far away

        // If we have the context of the player we want to send items to, we can perform extra checks to see if we can send the item
        if (this.options.contexts) {
            for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
                if (context.bot.id !== this.options.transferItemsTo) continue // Not the player we want to transfer items to
                player = context.bot
                break
            }
        }

        for (const [slot, item] of bot.getItems()) {
            if (item.l) continue // Can't send locked items
            const itemConfig = this.options.itemConfig[item.name]
            if (itemConfig) {
                if (itemConfig.hold === true || itemConfig.hold.includes(bot.ctype)) continue
                if (itemConfig.sell && bot.canSell()) continue // We'll sell it soon
                if (itemConfig.destroyBelowLevel && item.level < itemConfig.destroyBelowLevel) continue // We'll destroy it soon
            }

            if (player instanceof PingCompensatedCharacter && player.esize === 0) {
                if (!item.q) continue // It's not stackable, and they have no space
                if (!player.hasItem(item.name, player.items, { quantityLessThan: AL.Game.G.items[item.name].s + 1 - item.q })) continue // We can't stack it
            }

            await bot.sendItem(this.options.transferItemsTo, slot, item.q ?? 1)
        }
    }

    /**
     * Send sellable items to a nearby context if we can't sell, but they can
     */
    private async transferSellableItems(bot: Type) {
        if (!this.options.contexts) return // No context information
        if (bot.canSell()) return // We can sell from where we currently are

        for (const context of filterContexts(this.options.contexts, { owner: bot.owner, serverData: bot.serverData })) {
            const friend = context.bot
            if (bot === friend) continue // Ourself
            if (friend.esize <= 0) continue // They have no space
            if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // They're too far away
            if (!friend.canSell()) continue // They can't sell it either

            for (const [slot, item] of bot.getItems()) {
                if (item.l) continue // Can't send locked items

                const itemConfig = this.options.itemConfig[item.name]
                if (!itemConfig) continue // No item config, assume we don't want to sell it
                if (itemConfig.hold === true || itemConfig.hold.includes(bot.ctype)) continue // 
                if (!itemConfig.sell) continue // We don't want to sell it

                await bot.sendItem(friend.id, slot, item.q ?? 1)
            }
        }
    }

    /**
     * Transfer stackable items to the other players to reduce the number of stacks in total
     */
    private async transferStackableItems(bot: Type) {
        if (!this.options.contexts) return // No context information

        for (const context of filterContexts(this.options.contexts, { owner: bot.owner, serverData: bot.serverData })) {
            const friend = context.bot
            if (bot === friend) continue // Ourself
            if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // They're too far away
            for (const [slot, item] of bot.getItems()) {
                if (item.l) continue // Can't send locked items
                if (!item.q) continue // Don't send non-stackable items

                const itemConfig = this.options.itemConfig[item.name]
                if (itemConfig) {
                    if (itemConfig.sell) continue // We want to sell this item
                    if (itemConfig.hold === true || itemConfig.hold?.includes(bot.ctype)) continue // We want to hold this item
                }

                const friendSlot = friend.locateItem(item.name, friend.items, { quantityLessThan: AL.Game.G.items[item.name].s + 1 - item.q }) // We can't stack it
                if (friendSlot === undefined) continue // They don't have this item to stack
                const friendItem = friend.items[friendSlot]
                if (friendItem.q < item.q) continue // We have more
                if (friendItem.q === item.q && friend.id > bot.id) continue // If they're the same amount, only transfer if our name is sorted before theirs alphabetically

                await bot.sendItem(friend.id, slot, item.q ?? 1)
            }
        }
    }

    private async compound(bot: Type) {
        if (bot.map.startsWith("bank")) return // Can't compound in bank
        const itemCounts = await getItemCounts(bot.owner)

        for (const [slot, item] of bot.getItems()) {
            const gItem = AL.Game.G.items[item.name]
            if (!gItem.compound) continue // Not compoundable

            if (!wantToUpgrade(item, itemCounts)) continue

            const items = bot.locateItems(item.name, bot.items, { level: item.level, locked: false })
            if (items.length < 3) continue // Not enough to compound

            const itemConfig: UpgradeConfig = this.options.itemConfig[item.name]
            let offering: ItemName
            if (itemConfig) {
                if (itemConfig.useOfferingFromLevel >= item.level) offering = "offering"
                else if (itemConfig.usePrimlingFromLevel >= item.level) offering = "offeringp"

                if (offering && !bot.hasItem(offering)) continue // We don't have the offering needed
            }

            const cscroll = `cscroll${item.calculateGrade()}` as ItemName
            let cscrollPosition = bot.locateItem(cscroll)
            if (cscrollPosition === undefined) {
                // We don't have the scroll needed
                if (bot.canBuy(cscroll)) cscrollPosition = await bot.buy(cscroll)
                else continue // We can't buy the scroll needed
            }

            if (bot.canUse("massproduction")) await (bot as unknown as Merchant).massProduction()

            return bot.compound(items[0], items[1], items[2], bot.locateItem(cscroll), offering ? bot.locateItem(offering) : undefined)
        }
    }

    private async upgrade(bot: Type) {
        if (bot.map.startsWith("bank")) return // Can't upgrade in bank
        const itemCounts = await getItemCounts(bot.owner)

        for (const [slot, item] of bot.getItems()) {
            if (!item.upgrade) continue // Not upgradable
            if (!wantToUpgrade(item, itemCounts)) continue

            const itemConfig: UpgradeConfig = this.options.itemConfig[item.name]
            let offering: ItemName
            if (itemConfig) {
                if (itemConfig.useOfferingFromLevel >= item.level) offering = "offering"
                else if (itemConfig.usePrimlingFromLevel >= item.level) offering = "offeringp"

                if (offering && !bot.hasItem(offering)) continue // We don't have the offering needed
            }

            const scroll = `scroll${item.calculateGrade()}` as ItemName
            let scrollPosition = bot.locateItem(scroll)
            if (scrollPosition === undefined) {
                // We don't have the scroll needed
                if (bot.canBuy(scroll)) scrollPosition = await bot.buy(scroll)
                else continue // We can't buy the scroll needed
            }

            if (bot.canUse("massproduction")) await (bot as unknown as Merchant).massProduction()

            return bot.upgrade(slot, bot.locateItem(scroll), offering ? bot.locateItem(offering) : undefined)
        }
    }
}

export function wantToUpgrade(item: Item, itemCounts: ItemCounts): boolean {
    if (item.l) return false // Locked

    if (!item.upgrade && !item.compound) return false // Not upgradable or compoundable

    const itemConfig: UpgradeConfig = this.options.itemConfig[item.name]
    if (itemConfig) {
        if (item.level < itemConfig.destroyBelowLevel) return false // We want to destroy it
        if (itemConfig.upgradeUntilLevel !== undefined && item.level >= itemConfig.upgradeUntilLevel) return false // We don't want to upgrade it any further
    }

    const levelCounts = itemCounts.get(item.name)
    if (levelCounts === undefined) return false // We don't have count information for this item

    // Count how many we have of the given item at the same level or higher
    let numItem = 0
    for (const [level, levelCount] of levelCounts) {
        if (level < item.level) continue // Lower level than what we have, don't count it
        numItem += levelCount.q
    }

    // TODO: Add `.class` to ALClient's `Item`
    const gItem = AL.Game.G.items[item.name]

    // Count how many we would like to have to equip all of our characters with it
    let classMultiplier = 4
    if (gItem.class?.length == 1) {
        if (gItem.class[0] == "merchant") {
            classMultiplier = 1
        } else {
            classMultiplier = 3
        }
    }
    let numEquippableMultiplier = 1
    if (gItem.type == "ring" || gItem.type == "earring") {
        numEquippableMultiplier = 2
    } else {
        for (const characterType in AL.Game.G.classes) {
            const cType = characterType as CharacterType
            const gClass = AL.Game.G.classes[cType]
            if (!gItem.class?.includes(cType)) continue // This weapon can't be used on this character type
            if (gClass.mainhand[gItem.wtype] && gClass.offhand[gItem.wtype]) {
                // We can equip two of these on some character type
                numEquippableMultiplier = 2
                break
            }
        }
    }
    let numToKeep = (classMultiplier * numEquippableMultiplier)
    numToKeep += (item.compound ? 2 : 0) // We need 3 to compound, only compound if we have extra
    if (numItem <= numToKeep) return false // We don't want to lose this item

    return true
}

type LevelCounts = Map<number, {
    /** How many of this item @ this level do we have? */
    q: number
    /** How many spaces are the items taking up in inventory / bank space? */
    inventorySpaces: number
}>
type ItemCounts = Map<ItemName, LevelCounts>
type OwnerItemCounts = Map<string, ItemCounts>

export const OWNER_ITEM_COUNTS: OwnerItemCounts = new Map()
/**
 * This function will aggregate the bank, the inventories of all characters,
 * and the items equipped on all characters so we can see how many of each item
 * we own in total.
 * @param owner The owner to get items for (e.g.: `bot.owner`)
 */
export async function getItemCounts(owner: string): Promise<ItemCounts> {
    if (!AL.Database.connection) return new Map()

    let countMap = OWNER_ITEM_COUNTS.get(owner)
    if (countMap && !checkOnlyEveryMS(`item_everything_counts_${owner}`, 60_000)) {
        return countMap
    }

    const countData = await AL.BankModel.aggregate([
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
    ]) as {
        name: ItemName
        level?: number
        inventorySpaces: number
        q: number
    }[]

    // Clear the old data
    if (!countMap) countMap = new Map()
    else countMap.clear()

    // Set the data
    for (const countDatum of countData) {
        const levelCounts: LevelCounts = countMap.get(countDatum.name) ?? new Map()
        levelCounts.set(countDatum.level, { q: countDatum.q, inventorySpaces: countDatum.inventorySpaces })
        countMap.set(countDatum.name, levelCounts)
    }

    OWNER_ITEM_COUNTS.set(owner, countMap)
    return countMap
}