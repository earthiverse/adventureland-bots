import AL, { Character, IPosition, ItemName, LocateItemsFilters, Merchant, PingCompensatedCharacter, SlotType } from "alclient"
import { withdrawItemFromBank } from "../base/banking.js"
import { checkOnlyEveryMS, sleep } from "../base/general.js"
import { bankingPosition, mainFishingSpot, miningSpot } from "../base/locations.js"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { AcceptPartyRequestStrategy } from "../strategy_pattern/strategies/party.js"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand.js"

export const DEFAULT_EXCHANGEABLES = new Set<ItemName>([
    "seashell"
])
export const DEFAULT_GOLD_TO_HOLD = 100_000_000
export const DEFAULT_ITEMS_TO_HOLD = new Set<ItemName>([
    "computer",
    "cscroll0",
    "cscroll1",
    "cscroll2",
    "goldbooster",
    "hpot1",
    "luckbooster",
    "mpot1",
    "offering",
    "offeringp",
    "pickaxe",
    "rod",
    "scroll0",
    "scroll1",
    "scroll2",
    "supercomputer",
    "tracker",
    "xpbooster",
    "xptome"
])
export const DEFAULT_POSITION: IPosition = { x: 0, y: 0, map: "main" }
export const DEFAULT_REPLENISHABLES = new Map<ItemName, number>([
    ["hpot1", 2500],
    ["mpot1", 2500]
])
export const DEFAULT_REPLENISH_RATIO = 0.5

export type MerchantMoveStrategyOptions = {
    /** If enabled, the merchant will
     *  - find the lowest level piece of armor that's lower than the level set on the bots running in the given contexts
     *  - buy and upgrade store armor (helmet, coat, pants, boots, and gloves) until it's 1 level higher than what's currently equipped
     *  - apply the correct scroll for the character type
     *  - deliver it and equip it
     */
    enableBuyAndUpgrade?: {
        upgradeToLevel: number
    },
    /** If enabled, the merchant will
     * - buy replenishables in the list for the bots running in the given contexts if they get below the replenish ratio
     */
    enableBuyReplenishables?: {
        items: Map<ItemName, number>
        ratio: number,
    }
    /** If enabled, the merchant will
     * - if they have the required amount of each exchangeable
     *   - move to where they can exchange the item(s)
     *   - exchange the item(s)
     */
    enableExchange?: {
        items: Set<ItemName>
    }
    /** If enabled, the merchant will
     * - make a rod if it doesn't have one
     * - go fishing
     */
    enableFishing?: true
    /** If enabled, the merchant will
     * - make a pickaxe if it doesn't have one
     * - go mining
     */
    enableMining?: true
    /** If enabled, the merchant will
     * - grab items off the bots running in the given contexts if they drop below `esize` free inventory slots.
     * - give or take gold so the bots in the given contexts will have `goldToHold` gold
     * - take items not in the `itemsToHold` set
     */
    enableOffload?: {
        esize: number,
        goldToHold: number,
        itemsToHold: Set<ItemName>
    },
    goldToHold: number,
    itemsToHold: Set<ItemName>,
}

export class MerchantMoveStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    private contexts: Strategist<PingCompensatedCharacter>[]

    private options: MerchantMoveStrategyOptions

    public constructor(contexts: Strategist<PingCompensatedCharacter>[], options: MerchantMoveStrategyOptions = {
        // enableBuyAndUpgrade: {
        //     upgradeToLevel: 9
        // },
        enableBuyReplenishables: {
            items: DEFAULT_REPLENISHABLES,
            ratio: DEFAULT_REPLENISH_RATIO,
        },
        enableExchange: {
            items: DEFAULT_EXCHANGEABLES,
        },
        enableFishing: true,
        enableMining: true,
        enableOffload: {
            esize: 3,
            goldToHold: DEFAULT_GOLD_TO_HOLD,
            itemsToHold: DEFAULT_ITEMS_TO_HOLD,
        },
        goldToHold: DEFAULT_GOLD_TO_HOLD,
        itemsToHold: DEFAULT_ITEMS_TO_HOLD,
    }) {
        this.contexts = contexts
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Merchant) => { await this.move(bot) },
            interval: 250
        })
    }

    private async move(bot: Merchant) {
        try {
            // TODO: Emergency banking if full

            // Do banking if we are full, we have a lot of gold, or it's been a while (15 minutes)
            if (bot.esize < 5 || bot.gold > (this.options.goldToHold * 2) || checkOnlyEveryMS(`${bot.id}_banking`, 900_000)) {
                // Move to town first, to have a chance to sell unwanted items
                await bot.smartMove("main")

                // Then go to the bank to bank things
                await bot.smartMove(bankingPosition)
                for (let i = 0; i < bot.isize; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item
                    if (item.l) continue // Don't want to bank locked items
                    if (this.options.itemsToHold.has(item.name)) continue // We want to hold this item
                    await bot.depositItem(i)
                }

                // Withdraw an item we want to exchange
                if (this.options.enableExchange) {
                    for (const item of this.options.enableExchange.items) {
                        const options: LocateItemsFilters = {
                            locked: false,
                            quantityGreaterThan: (AL.Game.G.items[item].e ?? 1) - 1
                        }
                        await withdrawItemFromBank(bot, item, options, { freeSpaces: 3, itemsToHold: this.options.itemsToHold })
                        if (bot.hasItem(item, bot.items, options)) break // We found something to exchange
                    }
                }

                if (bot.gold > this.options.goldToHold) {
                    await bot.depositGold(bot.gold - this.options.goldToHold)
                } else if (bot.gold < this.options.goldToHold) {
                    await bot.withdrawGold(this.options.goldToHold - bot.gold)
                }

                await bot.smartMove("main")
            }

            // Find own characters with low replenishables and go deliver some
            if (this.options.enableBuyReplenishables) {
                for (const friendContext of this.contexts) {
                    const friend = friendContext.bot
                    for (const [item, numTotal] of this.options.enableBuyReplenishables.items) {
                        const numFriendHas = friend.countItem(item)
                        if (numFriendHas > numTotal * this.options.enableBuyReplenishables.ratio) continue // They still have enough

                        const numWeHave = bot.countItem(item)
                        const numToBuy = (numTotal * 2) - numFriendHas - numWeHave
                        if (!bot.canBuy(item, { ignoreLocation: true, quantity: numToBuy })) continue // We don't have enough gold to buy them all

                        // Go buy the item(s)
                        if (numToBuy > 0) {
                            if (!bot.hasItem(["computer", "supercomputer"])) {
                                await bot.smartMove(item, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED / 2 })
                            }
                            await bot.buy(item, numToBuy)
                        }

                        // Go deliver the item(s)
                        await bot.smartMove(friend, { getWithin: 25 })
                        if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                            // We're not near them, so they must have moved, return so we can try again next loop
                            return
                        }
                        if (bot.id == friend.id) continue // We bought them for ourself
                        await bot.sendItem(friend.id, bot.locateItem(item, bot.items), numTotal - numFriendHas)
                    }
                }
            }

            // Find own characters with low inventory space and go grab some items off of them
            if (this.options.enableOffload) {
                for (const friendContext of this.contexts) {
                    const friend = friendContext.bot
                    if (friend == bot) continue // Skip ourself
                    if (friend.esize > 3) continue // They still have enough free space
                    if (friend.canSell()) continue // They can sell things themselves where they are

                    // Check if they have items that we can grab
                    let hasItemWeWant = false
                    for (let i = 0; i < friend.isize; i++) {
                        const item = friend.items[i]
                        if (!item) continue // No item here
                        if (item.l) continue // Can't send locked items
                        if (this.options.enableOffload.itemsToHold.has(item.name)) continue // We want to hold this item
                        hasItemWeWant = true
                        break
                    }
                    if (!hasItemWeWant) continue // They are full, but they're full of useful items

                    // Go find them
                    await bot.smartMove(friend, { getWithin: 25 })
                    if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                    // We're not near them, so they must have moved, return so we can try again next loop
                        return
                    }

                    // Grab extra gold
                    if (friend.gold > this.options.enableOffload.goldToHold) {
                    // Take their gold for safe keeping
                        await friend.sendGold(bot.id, friend.gold - this.options.enableOffload.goldToHold)
                    } else if (bot.gold > this.options.enableOffload.goldToHold) {
                    // Send them some of our gold
                        await bot.sendGold(friend.id, Math.min(bot.gold - this.options.enableOffload.goldToHold, this.options.enableOffload.goldToHold - friend.gold))
                    }

                    // Grab items
                    for (let i = 0; i < friend.isize && bot.esize > 2; i++) {
                        const item = friend.items[i]
                        if (!item) continue // No item here
                        if (item.l) continue // Can't send locked items
                        if (this.options.enableOffload.itemsToHold.has(item.name)) continue // We want to hold this item
                        await friend.sendItem(bot.id, i, item.q)
                    }

                    // Return so we can deal with a full inventory if we need to
                    return
                }
            }

            // Go fishing
            if (this.options.enableFishing && bot.canUse("fishing", { ignoreEquipped: true, ignoreLocation: true })) {
                const rodItems = new Set<ItemName>([...this.options.itemsToHold, "rod", "spidersilk", "staff"])

                if (!bot.hasItem("rod") && !bot.isEquipped("rod")) {
                    // We don't have a rod, see if there's one in our bank
                    await bot.smartMove(bankingPosition)
                    await withdrawItemFromBank(bot, "rod", {}, {
                        freeSpaces: bot.esize,
                        itemsToHold: rodItems
                    })
                }

                if (!bot.hasItem("rod") && !bot.isEquipped("rod") && !bot.hasItem("spidersilk")) {
                    // We didn't find one in our bank, see if we spider silk to make one
                    await withdrawItemFromBank(bot, "spidersilk", {}, {
                        freeSpaces: bot.esize,
                        itemsToHold: rodItems
                    })
                }

                if (!bot.hasItem("rod") && !bot.isEquipped("rod") && bot.hasItem("spidersilk") && !bot.hasItem("staff", bot.items, { level: 0, locked: false })) {
                    // We found spider silk, see if we have a staff, too
                    await withdrawItemFromBank(bot, "staff", { level: 0, locked: false }, {
                        freeSpaces: bot.esize,
                        itemsToHold: rodItems
                    })

                    if (!bot.hasItem("staff")) {
                        // We didn't find a staff, but we can go buy one
                        await bot.smartMove("staff", { getWithin: 50 })
                        await sleep(2000) // The game can still think you're in the bank for a while
                        await bot.buy("staff")
                    }
                }

                if (!bot.hasItem("rod") && !bot.isEquipped("rod") && bot.canCraft("rod", { ignoreLocation: true })) {
                    // We can make a rod, let's go do that
                    if (bot.hasItem(["computer", "supercomputer"])) {
                        await bot.smartMove(mainFishingSpot)
                    } else {
                        await bot.smartMove("craftsman", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                    }
                    await bot.craft("rod")
                }

                if (bot.isEquipped("rod") || bot.hasItem("rod")) {
                    // Move to fishing spot
                    // TODO: find closest fishing spot
                    await bot.smartMove(mainFishingSpot, { costs: { transport: 9999 } })
                }

                if (!bot.isEquipped("rod") && bot.hasItem("rod")) {
                    // Equip the rod if we don't have it equipped already
                    const rod = bot.locateItem("rod", bot.items, { returnHighestLevel: true })
                    if (bot.slots.offhand) await bot.unequip("offhand")
                    await bot.equip(rod)
                }

                // Wait a bit if we're on cooldown
                if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)

                if (bot.canUse("fishing")) {
                    await bot.fish()
                    return
                }
            }

            // Go mining
            if (this.options.enableMining && bot.canUse("mining", { ignoreEquipped: true, ignoreLocation: true })) {
                const pickaxeItems = new Set<ItemName>([...this.options.itemsToHold, "pickaxe", "spidersilk", "staff", "blade"])

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) {
                    // We don't have a pickaxe, see if there's one in our bank
                    await bot.smartMove(bankingPosition)
                    await withdrawItemFromBank(bot, "pickaxe", {}, {
                        freeSpaces: bot.esize,
                        itemsToHold: pickaxeItems
                    })
                }

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe") && !bot.hasItem("spidersilk")) {
                    // We didn't find one in our bank, see if we spider silk to make one
                    await withdrawItemFromBank(bot, "spidersilk", {}, {
                        freeSpaces: bot.esize,
                        itemsToHold: pickaxeItems
                    })
                }

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe") && bot.hasItem("spidersilk")
                    && !bot.hasItem("staff", bot.items, { level: 0, locked: false })
                    && !bot.hasItem("blade", bot.items, { level: 0, locked: false })) {
                    // We found spider silk, see if we have a staff and blade, too
                    await withdrawItemFromBank(bot, "staff", { level: 0, locked: false }, {
                        freeSpaces: bot.esize,
                        itemsToHold: pickaxeItems
                    })
                    await withdrawItemFromBank(bot, "blade", { level: 0, locked: false }, {
                        freeSpaces: bot.esize,
                        itemsToHold: pickaxeItems
                    })

                    if (!bot.hasItem("staff") || !bot.hasItem("blade")) {
                        // We didn't find a staff and/or a blade, but we can go buy one
                        await bot.smartMove("staff", { getWithin: 50 })
                        await sleep(2000) // The game can still think you're in the bank for a while
                        if (!bot.hasItem("staff")) await bot.buy("staff")
                        if (!bot.hasItem("blade")) await bot.buy("blade")
                    }
                }

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe") && bot.canCraft("pickaxe", { ignoreLocation: true })) {
                    // We can make a pickaxe, let's go do that
                    if (bot.hasItem(["computer", "supercomputer"])) {
                        await bot.smartMove(miningSpot)
                    } else {
                        await bot.smartMove("craftsman", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                    }
                    await bot.craft("pickaxe")
                }

                if (bot.isEquipped("pickaxe") || bot.hasItem("pickaxe")) {
                    // Move to mining spot
                    // TODO: find closest mining spot
                    await bot.smartMove(miningSpot)
                }

                if (!bot.isEquipped("pickaxe") && bot.hasItem("pickaxe")) {
                    // Equip the pickaxe if we don't have it equipped already
                    const pickaxe = bot.locateItem("pickaxe", bot.items, { returnHighestLevel: true })
                    if (bot.slots.offhand) await bot.unequip("offhand")
                    await bot.equip(pickaxe)
                }

                // Wait a bit if we're on cooldown
                if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)

                if (bot.canUse("mining")) {
                    await bot.mine()
                    return
                }
            }

            // Equip items that make you go fast
            const broom = bot.locateItem("broom", bot.items, { returnHighestLevel: true })
            if (broom !== undefined) await bot.equip(broom)

            // TODO: Go mluck others

            if (this.options.enableExchange) {
                for (let i = 0; i < bot.isize && bot.esize > 1; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item
                    if (item.l) continue // Item is locked
                    if (!this.options.enableExchange.items.has(item.name)) continue // Not an exchangeable, or we don't want to exchange it
                    if ((item.q ?? 1) < (AL.Game.G.items[item.name].e ?? 1)) continue // We don't have enough to exchange
                    if (!bot.hasItem(["computer", "supercomputer"])) {
                        // Walk to the NPC
                        const npc = AL.Pathfinder.locateExchangeNPC(item.name)
                        await bot.smartMove(npc, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                    }
                    await bot.exchange(i)
                    return
                }
            }

            if (this.options.enableBuyAndUpgrade) {
                // Find the lowest level item across all characters
                let lowestItemSlot: SlotType
                let lowestItemLevel: number = Number.MAX_SAFE_INTEGER
                let getFor: Character
                itemSearch:
                for (const friendContext of this.contexts) {
                    const friend = friendContext.bot
                    if (friend == bot) continue // Skip ourself
                    for (const sN in friend.slots) {
                        const slotName = sN as SlotType
                        if (slotName.startsWith("trade")) continue // Don't look at trade slots
                        if (!(["chest", "gloves", "helmet", "mainhand", "pants", "shoes"]).includes(slotName)) continue
                        const slot = friend.slots[slotName]
                        if (!slot) {
                        // We have nothing in this slot, let's get something for it
                            lowestItemSlot = slotName
                            lowestItemLevel = 0
                            getFor = friend
                            break itemSearch
                        }
                        if (slot.level > this.options.enableBuyAndUpgrade.upgradeToLevel) continue // We already have something pretty good
                        if (slot.level >= lowestItemLevel) continue // We have already found something at a lower level

                        // We found a new low
                        lowestItemLevel = slot.level
                        lowestItemSlot = slotName
                        getFor = friend
                    }
                }

                // Buy and upgrade the store-level item to a higher level to replace it
                if (lowestItemSlot) {
                    let item: ItemName
                    switch (lowestItemSlot) {
                        case "chest":
                            item = "coat"
                            break
                        case "gloves":
                            item = "gloves"
                            break
                        case "helmet":
                            item = "helmet"
                            break
                        case "mainhand":
                            // Get the item that will attack the fastest
                            switch (getFor.ctype) {
                                case "mage":
                                    item = "wand"
                                    break
                                case "paladin":
                                    item = "mace"
                                    break
                                case "priest":
                                    item = "wand"
                                    break
                                case "ranger":
                                    item = "bow"
                                    break
                                case "rogue":
                                    item = "blade"
                                    break
                                case "warrior":
                                    item = "claw"
                                    break
                            }
                            break
                        case "pants":
                            item = "pants"
                            break
                        case "shoes":
                            item = "shoes"
                            break
                    }

                    // If we have a higher level item, make sure it has the correct scroll, then go deliver and equip it
                    const potential = bot.locateItem(item, bot.items, { levelGreaterThan: lowestItemLevel, returnHighestLevel: true })
                    if (potential !== undefined) {
                        // Apply the correct stat scroll if we need
                        const itemData = bot.items[potential]
                        const stat = AL.Game.G.items[item].stat ? AL.Game.G.classes[getFor.ctype].main_stat : undefined
                        if (itemData.stat_type !== stat) {
                            // Go to the upgrade NPC
                            if (!bot.hasItem(["computer", "supercomputer"])) {
                                await bot.smartMove("newupgrade", { getWithin: 25 })
                            }

                            // Buy the correct stat scroll(s) and apply them
                            const grade = bot.calculateItemGrade(itemData)
                            const statScroll = `${stat}scroll` as ItemName
                            const numNeeded = Math.pow(10, grade)
                            const numHave = bot.countItem(statScroll, bot.items)

                            try {
                                if (numNeeded > numHave) {
                                    await bot.buy(statScroll, numNeeded - numHave)
                                }
                                const statScrollPosition = bot.locateItem(statScroll)
                                await bot.upgrade(potential, statScrollPosition)
                            } catch (e) {
                                console.error(e)
                            }
                        }

                        const potentialWithScroll = bot.locateItem(item, bot.items, { levelGreaterThan: lowestItemLevel, returnHighestLevel: true, statType: stat })
                        if (potentialWithScroll !== undefined) {
                            await bot.smartMove(getFor, { getWithin: 25 })
                            if (AL.Tools.squaredDistance(bot, getFor) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                            // We're not near them, so they must have moved, return so we can try again next loop
                                return
                            }

                            // Send it and equip it
                            await bot.sendItem(getFor.id, potentialWithScroll)
                            await sleep(1000)
                            const equipItem = getFor.locateItem(item, getFor.items, { levelGreaterThan: lowestItemLevel, returnHighestLevel: true, statType: stat })
                            await getFor.equip(equipItem)

                            // Send the old item back to the merchant
                            await getFor.sendItem(bot.id, equipItem)
                        }
                    }

                    if (!bot.hasItem(item)) {
                        // Go to bank and see if we have one
                        await bot.smartMove(bankingPosition)
                        await withdrawItemFromBank(bot, item, { locked: false }, { freeSpaces: 2, itemsToHold: this.options.itemsToHold })
                        await bot.smartMove("main")
                    }

                    // Go to the upgrade NPC
                    if (!bot.hasItem(["computer", "supercomputer"])) {
                        await bot.smartMove("newupgrade", { getWithin: 25 })
                    }

                    // Buy if we need
                    while (bot.canBuy(item) && !bot.hasItem(item)) {
                        await bot.buy(item)
                    }

                    // Find the lowest level item, we'll upgrade that one
                    const lowestLevelPosition = bot.locateItem(item, bot.items, { returnLowestLevel: true })
                    if (lowestLevelPosition == undefined) return // We probably couldn't afford to buy one
                    const lowestLevel = bot.items[lowestLevelPosition].level

                    // Don't upgrade if it's already the level we want
                    if (lowestLevel < lowestItemLevel + 1) {
                    /** Find the scroll that corresponds with the grade of the item */
                        const grade = bot.calculateItemGrade(bot.items[lowestLevelPosition])
                        const scroll = `scroll${grade}` as ItemName

                        /** Buy a scroll if we don't have one */
                        let scrollPosition = bot.locateItem(scroll)
                        if (scrollPosition == undefined && bot.canBuy(scroll)) {
                            await bot.buy(scroll)
                            scrollPosition = bot.locateItem(scroll)
                        }

                        if (scrollPosition !== undefined) {
                            /** Speed up the upgrade if we can */
                            if (bot.canUse("massproduction")) await bot.massProduction()

                            /** Upgrade! */
                            await bot.upgrade(lowestLevelPosition, scrollPosition)
                            return
                        }
                    }
                }
            }

            // Go to our default position and wait for things to do
            // TODO: Move this position to options
            await bot.smartMove(DEFAULT_POSITION)
        } catch (e) {
            console.error(e)
        }
    }
}

export async function startMerchant(context: Strategist<Merchant>, friends: Strategist<PingCompensatedCharacter>[]) {
    context.applyStrategy(new MerchantMoveStrategy(friends))
    context.applyStrategy(new AcceptPartyRequestStrategy())
    context.applyStrategy(new ToggleStandStrategy({
        offWhenMoving: true,
        onWhenNear: [
            { distance: 10, position: DEFAULT_POSITION }
        ]
    }))
}