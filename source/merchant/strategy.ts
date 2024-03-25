import AL, {
    BankPackName,
    Character,
    Constants,
    Database,
    GMap,
    Game,
    IPosition,
    Item,
    ItemName,
    LocateItemsFilters,
    MapName,
    Merchant,
    NewMapData,
    Pathfinder,
    PingCompensatedCharacter,
    Player,
    SlotType,
    Tools,
    TradeSlotType,
} from "alclient"
import {
    getItemsToCompoundOrUpgrade,
    IndexesToCompoundOrUpgrade,
    withdrawItemFromBank,
} from "../base/items.js"
import { checkOnlyEveryMS, setLastCheck, sleep } from "../base/general.js"
import { bankingPosition, mainFishingSpot, miningSpot } from "../base/locations.js"
import { filterContexts, Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseAttackStrategy } from "../strategy_pattern/strategies/attack.js"
import { AcceptPartyRequestStrategy } from "../strategy_pattern/strategies/party.js"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { addCryptMonstersToDB, cleanInstances, getCryptWaitTime, getKeyForCrypt, refreshCryptMonsters } from "../base/crypt.js"
import {
    DEFAULT_EXCHANGEABLES,
    DEFAULT_GOLD_TO_HOLD,
    DEFAULT_IDENTIFIER,
    DEFAULT_ITEMS_TO_BUY,
    DEFAULT_ITEMS_TO_HOLD,
    DEFAULT_ITEMS_TO_LIST,
    DEFAULT_MERCHANT_ITEMS_TO_HOLD,
    DEFAULT_MERCHANT_REPLENISHABLES,
    DEFAULT_REGION,
    DEFAULT_REPLENISHABLES,
    DEFAULT_REPLENISH_RATIO,
    EXCESS_ITEMS_SELL,
} from "../base/defaults.js"
import { BankItemPosition, goAndDepositItem, goAndWithdrawItem, locateEmptyBankSlots, locateItemsInBank, tidyBank } from "../base/banking.js"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death.js"
import { suppress_errors } from "../strategy_pattern/logging.js"
import { DEFAULT_ITEM_CONFIG, ItemConfig, UpgradeConfig, getItemCounts, reduceCount, wantToDestroy, wantToHold, wantToSellToNpc, wantToSellToPlayer, wantToUpgrade } from "../base/itemsNew.js"
import { TradeItem } from "alclient/build/TradeItem.js"

export type MerchantMoveStrategyOptions = {
    /** If enabled, we will log debug messages */
    debug?: true
    /** The default position to stand when upgrading / waiting for things to do */
    defaultPosition: IPosition
    /** If enabled, the merchant will
     *  - find the lowest level piece of armor that's lower than the level set on the bots running in the given contexts
     *  - buy and upgrade store armor (helmet, coat, pants, boots, and gloves) until it's 1 level higher than what's currently equipped
     *  - apply the correct scroll for the character type
     *  - deliver it and equip it
     */
    enableBuyAndUpgrade?: {
        upgradeToLevel: number
    }
    /** If enabled, the merchant will
     * - buy replenishables in the list for the bots running in the given contexts if they get below the replenish ratio
     */
    enableBuyReplenishables?: {
        all: Map<ItemName, number>
        merchant?: Map<ItemName, number>
        ratio: number
    }
    /** If enabled, the merchant will
     * - withdraw items needed to craft the items in the list from the bank
     * - craft the items in the given list
     * - buy items from the vendor if they are needed to craft
     */
    enableCraft?: {
        items: Set<ItemName>
    }
    /** If enabled, the merchant will
     * - check existing instances
     * - open new instances
     */
    enableInstanceProvider?: {
        [T in MapName]?: {
            maxInstances?: number
        }
    }
    /** If enabled, the merchant will
     * - Look for merchants with things we want to buy and move to them
     */
    enableDealFinder?: {
        itemsToBuy: Map<ItemName, number>
    }
    /** If enabled, the merchant will
     * - withdraw items to exchange from the bank if we have enough free spaces
     * - if they have the required amount of each exchangeable
     *   - move to where they can exchange the item(s)
     *   - exchange the item(s)
     */
    enableExchange?: {
        items: Set<ItemName>
        /** Lost earrings can be exchanged at different levels for different items, if this is set we will exchange them at the level provided */
        lostEarring?: number
    }
    /** If enabled, the merchant will
     * - make a rod if it doesn't have one
     * - go fishing
     */
    enableFishing?: true
    /** If enabled the merchant will
     * - join all giveaways it sees that it's not currently a part of
     */
    enableJoinGiveaways?: true
    /** If enabled, the merchant will
     * - make a pickaxe if it doesn't have one
     * - go mining
     */
    enableListings?: {
        /**
         * If set, we will list level 0 items, or items without a level, at the given price
         */
        itemsToList: Map<ItemName, number>
        // TODO: Add itemsToCraftAndList, or something similar
    }
    enableMining?: true
    /** If enabled, the merchant will
     * - mluck based on the options
     */
    enableMluck?: {
        /** Should we mluck those that we pass through `contexts`? */
        contexts?: true
        /** Should we mluck others? */
        others?: true
        /** Should we mluck ourself? */
        self?: true
        /** Should we travel to mluck our own characters and others? */
        travel?: true
    }
    /** If enabled, the merchant will
     * - grab items off the bots running in the given contexts if they drop below `esize` free inventory slots.
     * - give or take gold so the bots in the given contexts will have `goldToHold` gold
     * - take items not in the `itemsToHold` set
     */
    enableOffload?: {
        esize: number
        goldToHold: number
        itemsToHold: Set<ItemName>
    }
    goldToHold: number
    itemsToHold: Set<ItemName>
}

export const DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS: MerchantMoveStrategyOptions = {
    debug: true,
    // enableBuyAndUpgrade: {
    //     upgradeToLevel: 9
    // },
    defaultPosition: {
        map: "main",
        x: 0,
        y: 0,
    },
    enableBuyReplenishables: {
        all: DEFAULT_REPLENISHABLES,
        merchant: DEFAULT_MERCHANT_REPLENISHABLES,
        ratio: DEFAULT_REPLENISH_RATIO,
    },
    enableCraft: {
        items: new Set(Object.keys(DEFAULT_ITEM_CONFIG).filter((i => DEFAULT_ITEM_CONFIG[i as ItemName].craft)) as ItemName[]),
    },
    enableDealFinder: {
        itemsToBuy: DEFAULT_ITEMS_TO_BUY,
    },
    enableExchange: {
        items: DEFAULT_EXCHANGEABLES,
        lostEarring: 2,
    },
    enableFishing: true,
    enableListings: {
        itemsToList: DEFAULT_ITEMS_TO_LIST,
    },
    enableJoinGiveaways: true,
    enableMining: true,
    enableMluck: {
        contexts: true,
        others: true,
        self: true,
        travel: true,
    },
    enableOffload: {
        esize: 3,
        goldToHold: DEFAULT_GOLD_TO_HOLD,
        itemsToHold: DEFAULT_ITEMS_TO_HOLD,
    },
    // enableUpgrade: true,
    goldToHold: DEFAULT_GOLD_TO_HOLD,
    itemsToHold: DEFAULT_MERCHANT_ITEMS_TO_HOLD,
}

export class MerchantStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    protected contexts: Strategist<PingCompensatedCharacter>[]

    protected options: MerchantMoveStrategyOptions

    protected toUpgrade: IndexesToCompoundOrUpgrade = []

    public constructor(
        contexts: Strategist<PingCompensatedCharacter>[],
        options: MerchantMoveStrategyOptions = DEFAULT_MERCHANT_MOVE_STRATEGY_OPTIONS,
    ) {
        this.contexts = contexts
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Merchant) => {
                await this.move(bot).catch(console.error)
            },
            interval: 250,
        })

        if (this.options.enableMluck) {
            this.loops.set("mluck", {
                fn: async (bot: Merchant) => {
                    await this.mluck(bot).catch(console.error)
                },
                interval: ["mluck"],
            })
        }
    }

    protected async move(bot: Merchant) {
        try {
            // Respawn if dead
            if (bot.rip) return bot.respawn()

            // Emergency banking if full
            if (bot.esize <= 0) {
                this.debug(bot, "Emergency Banking")
                // Go to bank and get item counts
                this.toUpgrade = []
                await bot.smartMove(bankingPosition)
                await tidyBank(bot, {
                    itemsToHold: this.options.itemsToHold,
                    itemsInExcessSell: EXCESS_ITEMS_SELL,
                }).catch(console.error)

                // Withdraw things that we can upgrade
                this.toUpgrade = await getItemsToCompoundOrUpgrade(bot)

                // Withdraw extra gold
                if (bot.bank.gold > this.options.goldToHold) await bot.withdrawGold(this.options.goldToHold)

                // Go to our default position and wait a bit for things to upgrade
                await bot.smartMove(this.options.defaultPosition)
                await sleep(15_000)
                return
            }

            // Move things from "overflow" slots
            for (let i = bot.isize; i < bot.items.length; i++) {
                const free = bot.getFirstEmptyInventorySlot()
                if (free === undefined) break
                await bot.swapItems(i, free)
            }

            // Do banking if we have a lot of gold, or it's been a while (10 minutes)
            if (
                bot.gold > this.options.goldToHold * 2 ||
                (bot.esize < 2 && !this.toUpgrade.length) ||
                checkOnlyEveryMS(`${bot.id}_banking`, 600_000)
            ) {
                this.debug(bot, "Normal Banking")
                // Move to town first, to have a chance to sell unwanted items
                await bot.smartMove("main")

                // Then go to the bank to bank things
                this.toUpgrade = []
                await bot.smartMove(bankingPosition)
                await tidyBank(bot, { itemsToHold: this.options.itemsToHold }).catch(console.error)

                // Withdraw things that we can upgrade
                this.debug(bot, "Looking for items to compound or upgrade...")
                this.toUpgrade = await getItemsToCompoundOrUpgrade(bot)

                // Withdraw an item we want to craft
                if (this.options.enableCraft && bot.esize >= 3) {
                    this.debug(bot, "Looking for craftables in bank...")
                    for (const itemToCraft of this.options.enableCraft.items) {
                        const gCraft = AL.Game.G.craft[itemToCraft]
                        const itemsToWithdraw: BankItemPosition[] = []
                        let foundAll = true
                        craftItemCheck: for (const [
                            requiredQuantity,
                            requiredItem,
                            requiredItemLevel,
                        ] of gCraft.items) {
                            // If the item is compoundable or upgradable, the level needs to be 0
                            let fixedItemLevel = requiredItemLevel
                            if (fixedItemLevel === undefined) {
                                const gInfo = AL.Game.G.items[requiredItem]
                                if (gInfo.upgrade || gInfo.compound) fixedItemLevel = 0
                            }

                            // Check if it's already in our inventory
                            if (bot.hasItem(requiredItem, bot.items, { level: requiredItemLevel })) continue

                            // Look in bank
                            for (const bankSlot in bot.bank) {
                                for (let i = 0; i < bot.bank[bankSlot as BankPackName].length; i++) {
                                    const bankItem = bot.bank[bankSlot as BankPackName][i]
                                    if (!bankItem) continue // Empty slot
                                    if (bankItem.name !== requiredItem) continue // Not the required item
                                    if (bankItem.level !== fixedItemLevel) continue // Not the required level
                                    if (bankItem.q !== undefined && bankItem.q < requiredQuantity) continue // Not enough

                                    // We found it in our bank
                                    itemsToWithdraw.push([bankSlot as BankPackName, i])
                                    continue craftItemCheck
                                }
                            }

                            if (
                                !fixedItemLevel &&
                                bot.canBuy(requiredItem, { ignoreLocation: true, quantity: requiredQuantity })
                            )
                                continue

                            // We don't have this required item
                            foundAll = false
                            break
                        }
                        if (foundAll && bot.esize > itemsToWithdraw.length) {
                            for (const [bankPack, i] of itemsToWithdraw) {
                                await goAndWithdrawItem(bot, bankPack, i).catch(console.error)
                            }
                            break
                        }
                    }
                }

                // Withdraw an item we want to exchange
                if (this.options.enableExchange && bot.esize >= 3) {
                    this.debug(bot, "Looking for exchangables in bank...")
                    for (const item of this.options.enableExchange.items) {
                        const options: LocateItemsFilters = {
                            locked: false,
                            quantityGreaterThan: (AL.Game.G.items[item].e ?? 1) - 1,
                        }
                        await withdrawItemFromBank(bot, item, options, {
                            freeSpaces: 3,
                            itemsToHold: this.options.itemsToHold,
                        })
                        if (bot.hasItem(item, bot.items, options)) break // We found something to exchange
                    }
                    if (this.options.enableExchange.lostEarring !== undefined) {
                        await withdrawItemFromBank(
                            bot,
                            "lostearring",
                            { level: this.options.enableExchange.lostEarring, locked: false },
                            { freeSpaces: 1, itemsToHold: this.options.itemsToHold },
                        )
                    }
                }

                if (bot.map !== "bank") await bot.smartMove("bank")
                if (bot.gold > this.options.goldToHold) {
                    await bot.depositGold(bot.gold - this.options.goldToHold)
                } else if (bot.gold < this.options.goldToHold) {
                    await bot.withdrawGold(this.options.goldToHold - bot.gold)
                }

                // Withdraw an item we want to list
                if (this.options.enableListings && bot.esize > 1) {
                    this.debug(bot, "Looking for items to list...")
                    // Open stand to see if we have a free trade slot
                    await bot.openMerchantStand().catch(suppress_errors)

                    // Look for empty slots
                    for (const slotName in bot.slots) {
                        if (!slotName.startsWith("trade")) continue
                        const slotType = slotName as TradeSlotType
                        const slotInfo = bot.slots[slotType]

                        if (slotInfo) continue // Trade slot is already filled
                        this.debug(bot, `Found an empty trade slot (${slotType}), looking for items...`)

                        // Look for an item to trade
                        let found = false
                        for (const [item, price] of this.options.enableListings.itemsToList) {
                            const gItem = AL.Game.G.items[item]
                            const options: LocateItemsFilters = { locked: false, special: false }
                            if (gItem.upgrade || gItem.compound) options.level = 0
                            await withdrawItemFromBank(bot, item, options, {
                                freeSpaces: 0,
                                itemsToHold: this.options.itemsToHold,
                            })
                            if (bot.hasItem(item, bot.items, options)) {
                                this.debug(bot, `Listing ${item} for ${price}...`)
                                // We found an item to list, list it
                                const itemPosition = bot.locateItem(item, bot.items, options)
                                found = true
                                await bot.listForSale(itemPosition, price).catch(console.error)
                                break
                            }
                        }
                        if (!found || bot.esize <= 1) break
                    }

                    // Close stand
                    await bot.closeMerchantStand().catch(suppress_errors)
                }

                await bot.smartMove("main")
            }

            if (bot.map.startsWith("bank")) {
                this.debug(bot, "Moving out of bank...")
                await bot.smartMove("main")
            }

            if (this.options.enableJoinGiveaways) {
                for (const player of bot.getPlayers({ withinRange: AL.Constants.NPC_INTERACTION_DISTANCE })) {
                    for (const s in player.slots) {
                        const slot = s as TradeSlotType
                        const item = player.slots[slot]
                        if (!item) continue // Nothing in the slot
                        if (!item.giveaway) continue // Not a giveaway
                        if (item.list && item.list.includes(bot.id)) continue // We're already in the giveaway
                        await (bot as Merchant).joinGiveaway(slot, player.id, item.rid)
                    }
                }
            }

            if (this.options.enableBuyReplenishables) {
                // Find own characters with low replenishables and go deliver some
                for (const friendContext of filterContexts(this.contexts, {
                    owner: bot.owner,
                    serverData: bot.serverData,
                })) {
                    const friend = friendContext.bot
                    for (const [item, numTotal] of this.options.enableBuyReplenishables.all) {
                        const numFriendHas = friend.countItem(item)
                        if (numFriendHas == 0 && friend.esize <= 0) continue // Friend has no space for more items
                        if (numFriendHas > numTotal * this.options.enableBuyReplenishables.ratio) continue // They still have enough

                        const numWeHave = bot.countItem(item)
                        const numToBuy = numTotal * 2 - numFriendHas - numWeHave
                        if (!bot.canBuy(item, { ignoreLocation: true, quantity: numToBuy })) continue // We don't have enough gold to buy them all

                        // Go buy the item(s)
                        if (numToBuy > 0) {
                            if (!bot.hasItem(["computer", "supercomputer"])) {
                                this.debug(bot, `Replenishables - Moving to buy ${numToBuy}x${item}`)
                                await bot.smartMove(item, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                            }
                            this.debug(bot, `Replenishables - Buying ${numToBuy}x${item}`)
                            if (bot.canBuy(item, { quantity: numToBuy })) await bot.buy(item, numToBuy)
                        }

                        // Go deliver the item(s)
                        if (bot.id !== friend.id) {
                            this.debug(
                                bot,
                                `Replenishables - Delivering ${numTotal - numFriendHas}x${item} to ${friend.id}`,
                            )
                            await bot.smartMove(friend, { getWithin: 25 })
                            if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                                // We're not near them, so they must have moved, return so we can try again next loop
                                return
                            }
                            await bot.sendItem(friend.id, bot.locateItem(item, bot.items), numTotal - numFriendHas)
                        }
                    }
                }

                // Buy replenishables for ourselves
                if (this.options.enableBuyReplenishables.merchant) {
                    for (const [item, numTotal] of this.options.enableBuyReplenishables.merchant) {
                        const numHave = bot.countItem(item)
                        if (numHave >= numTotal) continue // We have enough
                        const numToBuy = numTotal - numHave
                        if (bot.canBuy(item, { quantity: numToBuy })) {
                            this.debug(bot, `Replenishables - Buying ${numToBuy}x${item}`)
                            await bot.buy(item, numToBuy)
                        }
                    }
                }
            }

            // Find own characters with low inventory space and go grab some items off of them
            if (this.options.enableOffload) {
                for (const friendContext of filterContexts(this.contexts, {
                    owner: bot.owner,
                    serverData: bot.serverData,
                })) {
                    const friend = friendContext.bot
                    if (friend == bot) continue // Skip ourself
                    if (friend.gold < this.options.enableOffload.goldToHold * 2) {
                        if (friend.esize > 3) continue // They don't have a lot to offload

                        // Check if they have items that we can grab
                        let skipItems = true
                        for (let i = 0; i < friend.isize; i++) {
                            const item = friend.items[i]
                            if (!item) continue // No item here
                            if (item.l) continue // Can't send locked items
                            if (this.options.enableOffload.itemsToHold.has(item.name)) continue // We want to hold this item
                            skipItems = false
                            break
                        }
                        if (skipItems) continue // They are full, but they're full of useful items
                    }

                    // Go find them
                    this.debug(bot, `Moving to ${friend.id} to offload things`)
                    await bot.smartMove(friend, { getWithin: 25 }).catch(console.error)
                    if (AL.Tools.squaredDistance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                        // We're not near them, so they must have moved, return so we can try again next loop
                        return
                    }

                    // Grab extra gold
                    if (friend.gold > this.options.enableOffload.goldToHold) {
                        // Take their gold for safe keeping
                        this.debug(bot, `Offloading gold from ${friend.id}.`)
                        await friend.sendGold(bot.id, friend.gold - this.options.enableOffload.goldToHold)
                    } else if (bot.gold > this.options.enableOffload.goldToHold) {
                        // Send them some of our gold
                        this.debug(bot, `Giving gold from ${friend.id}.`)
                        await bot.sendGold(
                            friend.id,
                            Math.min(
                                bot.gold - this.options.enableOffload.goldToHold,
                                this.options.enableOffload.goldToHold - friend.gold,
                            ),
                        )
                    }

                    // Grab items
                    this.debug(bot, `Offloading items from ${friend.id}.`)
                    for (let i = 0; i < friend.isize && bot.esize > 0; i++) {
                        const item = friend.items[i]
                        if (!item) continue // No item here
                        if (item.l) continue // Can't send locked items
                        if (this.options.enableOffload.itemsToHold.has(item.name)) continue // We want to hold this item
                        await friend.sendItem(bot.id, i, item.q ?? 1).catch(console.error)
                    }

                    // Return so we can deal with a full inventory if we need to
                    return
                }
            }

            // Go fishing
            if (this.options.enableFishing && bot.canUse("fishing", { ignoreEquipped: true, ignoreLocation: true })) {
                this.debug(bot, "Fishing")
                const rodItems = new Set<ItemName>([...this.options.itemsToHold, "rod", "spidersilk", "staff"])

                if (!bot.hasItem("rod") && !bot.isEquipped("rod")) {
                    this.debug(bot, "Fishing - Looking for a rod in the bank")
                    // We don't have a rod, see if there's one in our bank
                    await withdrawItemFromBank(
                        bot,
                        "rod",
                        {},
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: rodItems,
                        },
                    )
                }

                if (!bot.hasItem("rod") && !bot.isEquipped("rod") && !bot.hasItem("spidersilk")) {
                    this.debug(bot, "Fishing - Looking for spidersilk in the bank")
                    // We didn't find one in our bank, see if we spider silk to make one
                    await withdrawItemFromBank(
                        bot,
                        "spidersilk",
                        {},
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: rodItems,
                        },
                    )
                }

                if (
                    !bot.hasItem("rod") &&
                    !bot.isEquipped("rod") &&
                    bot.hasItem("spidersilk") &&
                    !bot.hasItem("staff", bot.items, { level: 0, locked: false })
                ) {
                    this.debug(bot, "Fishing - Looking for a staff in the bank")
                    // We found spider silk, see if we have a staff, too
                    await withdrawItemFromBank(
                        bot,
                        "staff",
                        { level: 0, locked: false },
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: rodItems,
                        },
                    )

                    if (!bot.hasItem("staff")) {
                        this.debug(bot, "Fishing - Buying a staff")
                        // We didn't find a staff, but we can go buy one
                        await bot.smartMove("staff", { getWithin: 50 })
                        await sleep(Math.max(2000, bot.s.penalty_cd?.ms ?? 0)) // The game can still think you're in the bank for a while
                        await bot.buy("staff")
                    }
                }

                if (!bot.hasItem("rod") && !bot.isEquipped("rod") && bot.canCraft("rod", { ignoreLocation: true })) {
                    // We can make a rod, let's go do that
                    if (bot.hasItem(["computer", "supercomputer"])) {
                        this.debug(bot, "Fishing - Moving to fishing spot before crafting a rod")
                        await bot.smartMove(mainFishingSpot)
                    } else {
                        this.debug(bot, "Fishing - Moving to craftsman to craft a rod")
                        await bot.smartMove("craftsman", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                    }
                    await bot.craft("rod")
                }

                if (bot.isEquipped("rod") || (bot.hasItem("rod") && AL.Tools.distance(bot, mainFishingSpot) > 10)) {
                    this.debug(bot, "Fishing - Moving to fishing spot")
                    // TODO: find closest fishing spot
                    await bot.smartMove(mainFishingSpot, { costs: { transport: 9999 } })
                }

                if (!bot.isEquipped("rod") && bot.hasItem("rod")) {
                    this.debug(bot, "Fishing - Equipping the fishing rod")
                    // Equip the rod if we don't have it equipped already
                    const rod = bot.locateItem("rod", bot.items, { returnHighestLevel: true })
                    if (bot.slots.offhand) await bot.unequip("offhand")
                    await bot.equip(rod)
                }

                // Wait a bit if we're on cooldown
                if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)

                if (bot.canUse("fishing")) {
                    this.debug(bot, "Fishing - Casting our rod!")
                    return bot.fish()
                }
            }

            // Go mining
            if (this.options.enableMining && bot.canUse("mining", { ignoreEquipped: true, ignoreLocation: true })) {
                this.debug(bot, "Mining")
                const pickaxeItems = new Set<ItemName>([
                    ...this.options.itemsToHold,
                    "pickaxe",
                    "spidersilk",
                    "staff",
                    "blade",
                ])

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) {
                    // We don't have a pickaxe, see if there's one in our bank
                    await bot.smartMove(bankingPosition)
                    await withdrawItemFromBank(
                        bot,
                        "pickaxe",
                        {},
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: pickaxeItems,
                        },
                    )
                }

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe") && !bot.hasItem("spidersilk")) {
                    // We didn't find one in our bank, see if we spider silk to make one
                    await withdrawItemFromBank(
                        bot,
                        "spidersilk",
                        {},
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: pickaxeItems,
                        },
                    )
                }

                if (
                    !bot.hasItem("pickaxe") &&
                    !bot.isEquipped("pickaxe") &&
                    bot.hasItem("spidersilk") &&
                    !bot.hasItem("staff", bot.items, { level: 0, locked: false }) &&
                    !bot.hasItem("blade", bot.items, { level: 0, locked: false })
                ) {
                    // We found spider silk, see if we have a staff and blade, too
                    await withdrawItemFromBank(
                        bot,
                        "staff",
                        { level: 0, locked: false },
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: pickaxeItems,
                        },
                    )
                    await withdrawItemFromBank(
                        bot,
                        "blade",
                        { level: 0, locked: false },
                        {
                            freeSpaces: bot.esize,
                            itemsToHold: pickaxeItems,
                        },
                    )

                    if (!bot.hasItem("staff") || !bot.hasItem("blade")) {
                        // We didn't find a staff and/or a blade, but we can go buy one
                        await bot.smartMove("staff", { getWithin: 50 })
                        await sleep(2000) // The game can still think you're in the bank for a while
                        if (!bot.hasItem("staff") && bot.canBuy("staff") && bot.canBuy("blade")) {
                            this.debug(bot, "Mining - Buying a staff")
                            await bot.buy("staff")
                        }
                        if (!bot.hasItem("blade") && bot.canBuy("blade")) {
                            this.debug(bot, "Mining - Buying a blade")
                            await bot.buy("blade")
                        }
                    }
                }

                if (
                    !bot.hasItem("pickaxe") &&
                    !bot.isEquipped("pickaxe") &&
                    bot.canCraft("pickaxe", { ignoreLocation: true })
                ) {
                    // We can make a pickaxe, let's do that
                    if (!bot.hasItem(["computer", "supercomputer"])) {
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
            if (broom !== undefined) {
                if (
                    !bot.slots.mainhand || // Nothing equipped in mainhand
                    bot.slots.mainhand.name !== "broom" || // Broom not equipped in mainhand
                    bot.items[broom].level > bot.slots.mainhand.level // It's higher level than the one we have equipped
                ) {
                    await bot.equip(broom)
                }
            }

            // Go travel to mluck players
            if (
                this.options.enableMluck?.travel &&
                bot.canUse("mluck", { ignoreCooldown: true, ignoreLocation: true, ignoreMP: true })
            ) {
                if (this.options.enableMluck.contexts) {
                    for (const context of filterContexts(this.contexts, { serverData: bot.serverData })) {
                        const friend = context.bot
                        if (
                            friend.s.mluck && // They have mluck
                            friend.s.mluck.f == bot.id && // It's from us
                            friend.s.mluck?.ms > 900_000 // There's 15 minutes or more left
                        )
                            continue // Ignore
                        if (
                            friend.s.mluck && // They have mluck
                            friend.s.mluck.f !== bot.id && // It's not from us
                            friend.s.mluck.strong // It's strong
                        )
                            continue // Ignore, because we can't override it
                        this.debug(bot, `Moving to ${friend.name} (context) to mluck them`)
                        await bot.smartMove(friend, { getWithin: AL.Game.G.skills.mluck.range / 2 })
                        // Wait a bit if we had to enter a door
                        if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms + 1000)
                        return
                    }
                }
                if (this.options.enableMluck.others && AL.Database.connection) {
                    const player = await AL.PlayerModel.findOne(
                        {
                            $or: [
                                { "s.mluck": undefined }, // They don't have mluck
                                { "s.mluck.f": { $ne: bot.id }, "s.mluck.strong": undefined }, // We can steal mluck
                            ],
                            lastSeen: { $gt: Date.now() - 30000 },
                            serverIdentifier: bot.server.name,
                            serverRegion: bot.server.region,
                        },
                        {
                            _id: 0,
                            map: 1,
                            in: 1,
                            name: 1,
                            x: 1,
                            y: 1,
                        },
                    )
                        .lean()
                        .exec()
                    if (player) {
                        this.debug(bot, `Moving to ${player.name} to mluck them`)
                        await bot.smartMove(player, { getWithin: AL.Game.G.skills.mluck.range / 2 })
                        // Wait a bit if we had to enter a door
                        if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms + 1000)
                        return
                    }
                }
            }

            if (this.options.enableCraft) {
                // Craft items in our list
                for (const itemToCraft of this.options.enableCraft.items) {
                    if (!bot.canCraft(itemToCraft, { ignoreLocation: true, ignoreNpcItems: true })) continue // We can't craft it

                    if (!bot.canCraft(itemToCraft, { ignoreLocation: true })) {
                        // We need to buy some items from the NPCs first
                        const gCraft = AL.Game.G.craft[itemToCraft]
                        for (const [requiredQuantity, requiredItem] of gCraft.items) {
                            if (!bot.canBuy(requiredItem, { ignoreLocation: true, quantity: requiredQuantity })) break
                            if (!bot.hasItem(["computer", "supercomputer"])) {
                                this.debug(
                                    bot,
                                    `Moving to NPC to buy ${requiredItem}x${requiredQuantity} to craft ${itemToCraft}`,
                                )
                                await bot.smartMove(requiredItem)
                            }
                            this.debug(bot, `Buying ${requiredItem}x${requiredQuantity} to craft ${itemToCraft}`)
                            await bot.buy(requiredItem, requiredQuantity)
                        }
                    }

                    if (!bot.canCraft(itemToCraft, { ignoreLocation: true })) continue // We can't craft it

                    if (!bot.hasItem(["computer", "supercomputer"])) {
                        // Walk to the NPC
                        const npc = AL.Pathfinder.locateCraftNPC(itemToCraft)
                        this.debug(bot, `Moving to NPC to craft ${itemToCraft}`)
                        await bot.smartMove(npc, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 }).catch(console.error)
                    }
                    if (bot.canCraft(itemToCraft)) {
                        this.debug(bot, `Crafting ${itemToCraft}`)
                        await bot.craft(itemToCraft).catch(console.error)
                    }
                    break
                }
            }

            if (this.options.enableExchange && !bot.map.startsWith("bank")) {
                // Exchange items in our list
                for (let i = 0; i < bot.isize && bot.esize > 1; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item
                    if (item.l) continue // Item is locked
                    if (!this.options.enableExchange.items.has(item.name)) continue // Not an exchangeable, or we don't want to exchange it
                    if ((item.q ?? 1) < (AL.Game.G.items[item.name].e ?? 1)) continue // We don't have enough to exchange
                    if (!bot.hasItem(["computer", "supercomputer"])) {
                        // Walk to the NPC
                        const npc = AL.Pathfinder.locateExchangeNPC(item.name)
                        this.debug(bot, `Moving to NPC to exchange ${item.name}`)
                        await bot.smartMove(npc, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                    }
                    if (!bot.q.exchange) bot.exchange(i).catch(console.error)
                    break
                }

                if (this.options.enableExchange.lostEarring !== undefined) {
                    // Exchange earrings of the provided level
                    for (let i = 0; i < bot.isize; i++) {
                        const item = bot.items[i]
                        if (!item) continue // No item
                        if (item.l) continue // Item is locked
                        if (item.name !== "lostearring" || item.level !== this.options.enableExchange.lostEarring)
                            continue // Wrong level of earring
                        if (!bot.hasItem(["computer", "supercomputer"])) {
                            // Walk to the NPC
                            const npc = AL.Pathfinder.locateExchangeNPC(item.name)
                            this.debug(bot, `Moving to NPC to exchange ${item.name}`)
                            await bot.smartMove(npc, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                        }
                        if (!bot.q.exchange) bot.exchange(i).catch(console.error)
                        break
                    }
                }
            }

            if (this.options.enableBuyAndUpgrade) {
                // Find the lowest level item across all characters
                let lowestItemSlot: SlotType
                let lowestItemLevel: number = Number.MAX_SAFE_INTEGER
                let getFor: Character
                itemSearch: for (const friendContext of filterContexts(this.contexts, {
                    owner: bot.owner,
                    serverData: bot.serverData,
                })) {
                    const friend = friendContext.bot
                    if (friend == bot) continue // Skip ourself
                    for (const sN in friend.slots) {
                        const slotName = sN as SlotType
                        if (slotName.startsWith("trade")) continue // Don't look at trade slots
                        if (!["chest", "gloves", "helmet", "mainhand", "pants", "shoes"].includes(slotName)) continue
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
                                    item = "claw"
                                    break
                                case "warrior":
                                    item = "claw"
                                    break
                            }
                            break
                        case "offhand":
                            switch (getFor.ctype) {
                                case "rogue":
                                    item = "claw"
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
                    const potential = bot.locateItem(item, bot.items, {
                        levelGreaterThan: lowestItemLevel,
                        returnHighestLevel: true,
                    })
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
                                if (numNeeded > numHave && bot.canBuy(statScroll, { quantity: numNeeded - numHave })) {
                                    this.debug(bot, "BuyAndUpgrade - Buying stat scrolls")
                                    await bot.buy(statScroll, numNeeded - numHave)
                                }
                                const statScrollPosition = bot.locateItem(statScroll, bot.items, {
                                    quantityGreaterThan: numNeeded - 1,
                                })
                                if (statScrollPosition !== undefined) await bot.upgrade(potential, statScrollPosition)
                            } catch (e) {
                                console.error(e)
                            }
                        }

                        const potentialWithScroll = bot.locateItem(item, bot.items, {
                            levelGreaterThan: lowestItemLevel,
                            returnHighestLevel: true,
                            statType: stat,
                        })
                        if (potentialWithScroll !== undefined) {
                            await bot.smartMove(getFor, { getWithin: 25 })
                            if (AL.Tools.squaredDistance(bot, getFor) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                                // We're not near them, so they must have moved, return so we can try again next loop
                                return
                            }

                            // Send it and equip it
                            await bot.sendItem(getFor.id, potentialWithScroll)
                            const equipItem = getFor.locateItem(item, getFor.items, {
                                levelGreaterThan: lowestItemLevel,
                                returnHighestLevel: true,
                                statType: stat,
                            })
                            await getFor.equip(equipItem, lowestItemSlot)

                            // Send the old item back to the merchant
                            await getFor.sendItem(bot.id, equipItem)
                        }
                    }

                    if (!bot.hasItem(item)) {
                        // Go to bank and see if we have one
                        await bot.smartMove(bankingPosition)
                        await withdrawItemFromBank(
                            bot,
                            item,
                            { locked: false },
                            { freeSpaces: 2, itemsToHold: this.options.itemsToHold },
                        )
                        await bot.smartMove("main")
                    }

                    // Go to the upgrade NPC
                    if (!bot.hasItem(["computer", "supercomputer"])) {
                        await bot.smartMove("newupgrade", { getWithin: 25 })
                    }

                    // Buy if we need
                    if (!bot.hasItem(item) && bot.canBuy(item)) {
                        this.debug(bot, `BuyAndUpgrade - Buying item (${item})`)
                        await bot.buy(item)
                    }

                    // Find the lowest level item, we'll upgrade that one
                    const lowestLevelPosition = bot.locateItem(item, bot.items, { returnLowestLevel: true })
                    if (lowestLevelPosition === undefined) return // We probably couldn't afford to buy one
                    const lowestLevel = bot.items[lowestLevelPosition].level

                    // Don't upgrade if it's already the level we want
                    if (lowestLevel < lowestItemLevel + 1) {
                        /** Find the scroll that corresponds with the grade of the item */
                        const grade = bot.calculateItemGrade(bot.items[lowestLevelPosition])
                        const scroll = `scroll${grade}` as ItemName

                        /** Buy a scroll if we don't have one */
                        let scrollPosition = bot.locateItem(scroll)
                        if (scrollPosition === undefined && bot.canBuy(scroll)) {
                            this.debug(bot, "BuyAndUpgrade - Buying upgrade scroll")
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

            if (this.options.enableDealFinder && AL.Database.connection) {
                const merchants = await AL.PlayerModel.find({
                    lastSeen: { $gt: Date.now() - 120000 },
                    serverRegion: bot.serverData.region,
                    serverIdentifier: bot.serverData.name,
                    $or: [
                        { "slots.trade1": { $ne: undefined } },
                        { "slots.trade2": { $ne: undefined } },
                        { "slots.trade3": { $ne: undefined } },
                        { "slots.trade4": { $ne: undefined } },
                        { "slots.trade5": { $ne: undefined } },
                        { "slots.trade6": { $ne: undefined } },
                        { "slots.trade7": { $ne: undefined } },
                        { "slots.trade8": { $ne: undefined } },
                        { "slots.trade9": { $ne: undefined } },
                        { "slots.trade10": { $ne: undefined } },
                        { "slots.trade11": { $ne: undefined } },
                        { "slots.trade12": { $ne: undefined } },
                        { "slots.trade13": { $ne: undefined } },
                        { "slots.trade14": { $ne: undefined } },
                        { "slots.trade15": { $ne: undefined } },
                        { "slots.trade16": { $ne: undefined } },
                        { "slots.trade17": { $ne: undefined } },
                        { "slots.trade18": { $ne: undefined } },
                        { "slots.trade19": { $ne: undefined } },
                        { "slots.trade20": { $ne: undefined } },
                        { "slots.trade21": { $ne: undefined } },
                        { "slots.trade22": { $ne: undefined } },
                        { "slots.trade23": { $ne: undefined } },
                        { "slots.trade24": { $ne: undefined } },
                        { "slots.trade25": { $ne: undefined } },
                        { "slots.trade26": { $ne: undefined } },
                        { "slots.trade27": { $ne: undefined } },
                        { "slots.trade28": { $ne: undefined } },
                        { "slots.trade29": { $ne: undefined } },
                        { "slots.trade30": { $ne: undefined } },
                    ],
                })
                    .lean()
                    .exec()
                const merchantsToCheck = merchants.filter((v) => {
                    for (const slotName in v.slots) {
                        const slotData = v.slots[slotName as TradeSlotType]
                        if (!slotData) continue // No data

                        if (slotData.giveaway && !slotData.list.includes(bot.id)) return true // There's a giveaway we want to join on this merchant

                        if (!slotData.price) continue // Not a trade slot
                        if (slotData.b) continue // Buying, not selling
                        let priceToPay = DEFAULT_ITEMS_TO_BUY.get(slotData.name)
                        if (priceToPay < 0)
                            priceToPay =
                                (AL.Game.G.items[slotData.name].g / AL.Game.G.items[slotData.name].markup ?? 1) *
                                -priceToPay
                        if (!priceToPay || slotData.price > priceToPay) continue // Not on our wishlist, or more than we want to pay

                        return true // There's something we want from this merchant
                    }
                })
                if (merchantsToCheck.length > 0) {
                    const target = merchantsToCheck[0]
                    await bot.smartMove(target, { getWithin: 25 })
                    return
                }
            }

            if (this.options.enableInstanceProvider && AL.Database.connection) {
                if (checkOnlyEveryMS("cleanInstances", 300_000, true)) {
                    await cleanInstances()
                }

                for (const key in this.options.enableInstanceProvider) {
                    const checkKey = `${bot.id}_instance_check_${key}`
                    if (!checkOnlyEveryMS(checkKey, 300_000, false)) continue // Check every 5 minutes
                    this.debug(bot, `InstanceProvider - checking for ${key}`)
                    const map = key as MapName

                    const instanceMonster = await AL.EntityModel.findOne({
                        $or: [{ firstSeen: null }, { firstSeen: { $lt: Date.now() - getCryptWaitTime(map) } }],
                        lastSeen: { $lt: Date.now() - 30_000 },
                        map: map,
                        serverIdentifier: bot.serverData.name,
                        serverRegion: bot.serverData.region,
                    })
                        .sort({
                            lastSeen: -1,
                        })
                        .lean()
                        .exec()

                    if (instanceMonster) {
                        this.debug(bot, `InstanceProvider - looking for ${instanceMonster.type} in ${map} ${instanceMonster.in}`)
                        const cryptListener = async (data: NewMapData) => {
                            if (data.name !== map) return
                            if (data.in == instanceMonster.in) {
                                await refreshCryptMonsters(bot, map, data.in)
                            } else if (data.name == map) {
                                await addCryptMonstersToDB(bot, map, data.in)
                            }
                        }
                        bot.socket.on("new_map", cryptListener)

                        // Check if the instance is still valid
                        await bot
                            .smartMove(instanceMonster, {
                                numAttempts: 1,
                                stopIfTrue: async () =>
                                    bot.getEntity({ type: instanceMonster.type }) && bot.in === instanceMonster.in,
                            })
                            .catch(suppress_errors)
                        if (bot.map !== instanceMonster.map) {
                            // Remove the Crypt ID from the database
                            await AL.EntityModel.deleteMany({
                                serverIdentifier: bot.serverData.name,
                                serverRegion: bot.serverData.region,
                                map: map,
                                in: instanceMonster.in,
                            }).catch(console.error)
                        }
                        bot.socket.off("new_map", cryptListener)
                    }
                    setLastCheck(checkKey)
                }

                // Only open crypts on our default server
                if (bot.serverData.region == DEFAULT_REGION && bot.serverData.name == DEFAULT_IDENTIFIER) {
                    for (const key in this.options.enableInstanceProvider) {
                        const checkKey = `${bot.id}_instance_open_${key}`
                        if (!checkOnlyEveryMS(checkKey, 1.8e6, false)) continue // Open a new instance no more than once an hour
                        this.debug(bot, `InstanceProvider - checking if we can open a new ${key} instance`)
                        const map = key as MapName

                        if (this.options.enableInstanceProvider[map].maxInstances) {
                            const numInstances = await AL.InstanceModel.count({
                                map: map,
                                serverIdentifier: bot.serverData.name,
                                serverRegion: bot.serverData.region,
                            }).exec()
                            if (numInstances >= this.options.enableInstanceProvider[map].maxInstances) {
                                this.debug(bot, `InstanceProvider - reached maxInstances for ${key} (${numInstances})`)
                                continue // Already have plenty open
                            }
                        }

                        // Open a new crypt
                        const item = getKeyForCrypt(map)
                        if (!bot.hasItem(item)) {
                            this.debug(bot, `InstanceProvider - looking for a key for ${key}`)
                            // We don't have a key, check our bank for one
                            const items = new Set<ItemName>([...this.options.itemsToHold, item])
                            await bot.smartMove(bankingPosition)
                            await withdrawItemFromBank(
                                bot,
                                item,
                                {},
                                {
                                    freeSpaces: bot.esize,
                                    itemsToHold: items,
                                },
                            )
                        }
                        if (!bot.hasItem(item)) {
                            // We didn't find one in the bank, see if any of our characters have one
                            for (const context of filterContexts(this.contexts, {
                                serverData: bot.serverData,
                                owner: bot.owner,
                            })) {
                                const friend = context.bot
                                if (friend == bot) continue // Skip ourself
                                if (friend.hasItem(item)) {
                                    // Go get the item from them
                                    await bot.smartMove(friend)
                                    await friend.sendItem(bot.id, friend.locateItem(item))
                                    if (bot.hasItem(item)) break
                                }
                            }
                        }

                        if (bot.hasItem(item)) {
                            this.debug(bot, `InstanceProvider - opening a new ${key} instance`)
                            const cryptListener = async (data: NewMapData) => {
                                if (data.name !== map) return
                                await addCryptMonstersToDB(bot, map, data.in)
                            }
                            bot.socket.on("new_map", cryptListener)

                            // We have a key, let's go open a crypt
                            await bot.smartMove("main").catch(console.error)
                            try {
                                await bot.smartMove(map, { numAttempts: 1, showConsole: true })
                                setLastCheck(checkKey)
                            } catch (e) {
                                console.error(e)
                            }

                            bot.socket.off("new_map", cryptListener)
                        } else {
                            // We don't have a key to use
                            setLastCheck(checkKey)
                        }
                    }
                }
            }

            // Holiday spirit
            if (bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: Constants.NPC_INTERACTION_DISTANCE / 2 })
                await bot.getHolidaySpirit()
            }

            // Go to our default position and wait for things to do
            await bot.smartMove(this.options.defaultPosition)
        } catch (e) {
            console.error(e)
        }
    }

    protected debug(bot: Merchant, message: string) {
        if (!this.options.debug) return
        console.debug(`[${new Date().toISOString()}] [${bot.id}] DEBUG: ${message}`)
    }

    protected async mluck(bot: Merchant) {
        if (!bot.canUse("mluck")) return

        // mluck ourself
        if (this.options.enableMluck.self && (!bot.s.mluck || bot.s.mluck.f !== bot.id)) {
            return bot.mluck(bot.id)
        }

        // mluck contexts
        if (this.options.enableMluck.contexts) {
            for (const context of filterContexts(this.contexts, { serverData: bot.serverData })) {
                const friend = context.bot
                if (Tools.distance(bot, friend) > AL.Game.G.skills.mluck.range) continue

                if (!friend.s.mluck) return bot.mluck(friend.id) // They don't have mluck
                if (friend.s.mluck.strong && friend.s.mluck.f !== bot.id) continue // We can't steal the mluck
                if (friend.s.mluck.f == "earthMer" && bot.id !== "earthMer" && bot.owner !== friend.owner) continue // Don't compete with earthMer

                if (friend.s.mluck.f == bot.id && friend.s.mluck.ms > AL.Game.G.skills.mluck.duration / 2) continue // They still have a lot of time left

                return bot.mluck(friend.id)
            }
        }

        // mluck others
        if (this.options.enableMluck.others) {
            for (const player of bot.getPlayers({ isNPC: false, withinRange: "mluck" })) {
                if (!player.s.mluck) return bot.mluck(player.id) // They don't have mluck
                if (player.s.mluck.strong && player.s.mluck.f !== bot.id) continue // We can't steal the mluck
                if (player.s.mluck.f == "earthMer" && bot.id !== "earthMer" && bot.owner !== player.owner) continue // Don't compete with earthMer

                if (player.s.mluck.f == bot.id && player.s.mluck.ms > AL.Game.G.skills.mluck.duration / 2) continue // They still have a lot of time left

                return bot.mluck(player.id)
            }
        }
    }
}

export function startMerchant(
    context: Strategist<Merchant>,
    friends: Strategist<PingCompensatedCharacter>[],
    options?: NewMerchantStrategyOptions,
) {
    context.applyStrategy(new AvoidDeathStrategy())
    context.applyStrategy(new NewMerchantStrategy({
        ...options,
        contexts: friends
    }))
    context.applyStrategy(new TrackerStrategy())
    context.applyStrategy(new AcceptPartyRequestStrategy())
    context.applyStrategy(
        new BaseAttackStrategy({
            contexts: friends,
            disableBasicAttack: true,
        }),
    )
    context.applyStrategy(
        new ToggleStandStrategy({
            offWhenMoving: true,
            onWhenNear: [{ distance: 10, position: options.defaultPosition }],
        }),
    )
}

export type NewMerchantStrategyOptions = {
    contexts: Strategist<PingCompensatedCharacter>[]
    itemConfig: ItemConfig
    /** The default position to stand when upgrading / waiting for things to do */
    defaultPosition: IPosition
    goldToHold?: number
    enableInstanceProvider?: {
        [T in MapName]?: {
            maxInstances?: number
        }
    }
    enableMluck?: {
        /** Should we mluck those that we pass through `contexts`? */
        contexts?: true
        /** Should we mluck others? */
        others?: true
        /** Should we mluck ourself? */
        self?: true
        /** Should we travel to mluck our own characters and others? */
        travel?: true
    }
}

export const defaultNewMerchantStrategyOptions: NewMerchantStrategyOptions = {
    contexts: [],
    itemConfig: DEFAULT_ITEM_CONFIG,
    defaultPosition: { map: "main", x: 0, y: 0 },
    goldToHold: DEFAULT_GOLD_TO_HOLD,
    enableMluck: {
        contexts: true,
        others: true,
        self: true,
        travel: true
    }
}

export class NewMerchantStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    protected options: NewMerchantStrategyOptions

    public constructor(options: NewMerchantStrategyOptions = defaultNewMerchantStrategyOptions) {
        this.options = options

        if (this.options.enableMluck) {
            this.loops.set("mluck", {
                fn: async (bot: Merchant) => {
                    await this.mluck(bot).catch(console.error)
                },
                interval: ["mluck"],
            })
        }

        this.loops.set("move", {
            fn: async (bot: Merchant) => {
                if (bot.rip) return bot.respawn()

                await this.equipBroom(bot).catch(console.error)

                await this.joinGiveaways(bot).catch(console.error)
                await this.doBanking(bot) // NOTE: Don't catch, we don't want to continue if banking fails
                await this.goGetHolidaySpirit(bot).catch(console.error)
                await this.goDeliverReplenishables(bot).catch(console.error)
                await this.goDeliverUpgrades(bot).catch(console.error)
                await this.goGetItemsFromContexts(bot).catch(console.error)
                await this.goFishing(bot).catch(console.error)
                await this.goMining(bot).catch(console.error)
                await this.goCraft(bot).catch(console.error)
                await this.goExchange(bot).catch(console.error)
                // TODO: Deal finder
                await this.goCheckInstances(bot).catch(console.error)
                await this.goSellItems(bot).catch(console.error)
                await this.listForSale(bot).catch(console.error)

                await bot.smartMove(this.options.defaultPosition)
            },
            interval: 1000
        })
    }

    protected async mluck(bot: Merchant) {
        if (!bot.canUse("mluck")) return

        if (
            this.options.enableMluck.self
            && (
                !bot.s.mluck
                || bot.s.mluck.f !== bot.id
            )
        ) return bot.mluck(bot.id)

        const canMluck = (other: Character | Player): boolean => {
            if (Tools.distance(bot, other) > AL.Game.G.skills.mluck.range) return false // Too far away
            if (other.s.invis) return false // Can't mluck invsible players
            if (!other.s.mluck) return true // They don't have mluck
            if (!other.s.mluck.strong) return true // We can steal their mluck
            return other.s.mluck.f === bot.id // We can refresh their mluck
        }

        const shouldMluck = (other: Character | Player): boolean => {
            if (!canMluck(other)) return false
            if (other.s.mluck?.f === "earthMer" && bot.id !== "earthMer") return false // Don't compete with earthMer
            if (other.s.mluck?.f === bot.id && other.s.mluck.ms > AL.Game.G.skills.mluck.duration * 0.75) return false // They still have a lot left
            return true
        }

        // Mluck contexts
        if (this.options.enableMluck.contexts) {
            for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
                if (!shouldMluck(context.bot)) continue
                return bot.mluck(context.bot.id)
            }
        }

        // Mluck others
        if (this.options.enableMluck.others) {
            for (const player of bot.getPlayers({ isNPC: false, withinRange: "mluck" })) {
                if (!shouldMluck(player)) continue
                return bot.mluck(player.id)
            }
        }
    }

    /**
     * The broom gives us a lot of speed, we should equip it
     * unless we're fishing, mining, or attacking
     */
    protected async equipBroom(bot: Merchant): Promise<void> {
        const broomPos = bot.locateItem("broom", bot.items, { returnHighestLevel: true })
        if (broomPos === undefined) return // No broom, or we already have it equipped

        if (!bot.slots.mainhand) return bot.equip(broomPos) // We don't have a broom equipped
        if (bot.slots.mainhand.name !== "broom") return bot.equip(broomPos) // Replace with the broom
        const broom = bot.items[broomPos]
        if (bot.slots.mainhand.level < broom.level) return bot.equip(broomPos) // Replace with better broom
    }

    protected async doBanking(bot: Merchant): Promise<void> {
        let wantToBank = false
        if (bot.esize < 2) wantToBank = true
        if (!wantToBank && this.options.goldToHold && bot.gold > this.options.goldToHold) wantToBank = true
        const checkKey = `${bot.id}_banking`
        if (!wantToBank && checkOnlyEveryMS(checkKey, 600_000, false)) wantToBank = true

        if (!wantToBank) return

        if (!bot.map.startsWith("bank")) await bot.smartMove(bankingPosition)

        const itemCounts = await getItemCounts(bot.owner)

        // Deposit or withdraw gold to match what we want to hold
        const goldDifference = bot.gold - this.options.goldToHold
        if (goldDifference > 0) await bot.depositGold(goldDifference)
        else if (goldDifference < 0 && bot.bank.gold) await bot.withdrawGold(-goldDifference)

        // Dump everything in the bank
        for (const [slot, item] of bot.getItems()) {
            if (item.l) continue // We don't deposit locked items

            if (wantToDestroy(this.options.itemConfig, item)) {
                await bot.destroy(slot) // Destroy works in the bank (as of 2024-02-26), we'll just destroy it now
                continue
            }

            if (wantToHold(this.options.itemConfig, item, bot)) continue
            if (wantToSellToNpc(this.options.itemConfig, item, bot, itemCounts)) continue

            if (item.q) {
                // It's stackable
                const stackableLocations = locateItemsInBank(bot, item.name, { quantityLessThan: AL.Game.G.items[item.name].s - item.q + 1, data: item.data })
                if (stackableLocations.length) {
                    // We can stack it on an existing stack
                    await goAndDepositItem(bot, stackableLocations[0][0], -1, slot).catch(suppress_errors)
                    continue
                }
            }

            // We need to find a new slot for this item
            const emptyBankSlots = locateEmptyBankSlots(bot)
            if (emptyBankSlots.length === 0) continue // Our bank is full

            // Deposit the item in the empty slot
            await goAndDepositItem(bot, emptyBankSlots[0][0], emptyBankSlots[0][1][0], slot).catch(suppress_errors)
        }

        // Look for items to sell, destroy, or hold
        let emptySlot = bot.getFirstEmptyInventorySlot()
        if (bot.esize >= 2) {
            let foundItemToSell = false
            bankSearch:
            for (const [packName, packItems] of bot.getBankItems()) {
                for (const [packSlot, packItem] of packItems) {
                    const config = this.options.itemConfig[packItem.name]
                    if (!config) continue // No config for this item

                    if (wantToDestroy(this.options.itemConfig, packItem)) {
                        await goAndWithdrawItem(bot, packName, packSlot, emptySlot)
                        if (bot.items[emptySlot].name !== packItem.name) continue // Item changed!?
                        if (bot.items[emptySlot].level !== packItem.level) continue // Item changed!?
                        await bot.destroy(emptySlot)
                        continue
                    }

                    if (wantToSellToNpc(this.options.itemConfig, packItem, bot)) {
                        foundItemToSell = true
                        await goAndWithdrawItem(bot, packName, packSlot, emptySlot)
                        emptySlot = bot.getFirstEmptyInventorySlot()
                        if (emptySlot === undefined) break bankSearch // No more empty slots
                        continue
                    }

                    if (wantToHold(this.options.itemConfig, { ...packItem, l: undefined }, bot)) {
                        if (bot.hasItem(packItem.name)) continue // We already have one
                        await goAndWithdrawItem(bot, packName, packSlot, emptySlot)
                        emptySlot = bot.getFirstEmptyInventorySlot()
                        if (emptySlot === undefined) break bankSearch // No more empty slots
                        continue
                    }
                }
            }

            if (foundItemToSell) {
                // Go and sell all the items we found
                await bot.smartMove("main")
                const sellPromises: Promise<boolean>[] = []
                for (const [slot, item] of bot.getItems()) {
                    if (!wantToSellToNpc(this.options.itemConfig, item, bot)) continue
                    sellPromises.push(bot.sell(slot, item.q ?? 1))
                    reduceCount(bot.owner, item)
                }
                await Promise.allSettled(sellPromises)

                // Then restart banking from the beginning
                return this.doBanking(bot)
            }
        }

        // If we have space, clean the bank
        emptySlot = bot.getFirstEmptyInventorySlot()
        if (emptySlot) {
            // Get item counts
            const countableCounts = new Map<ItemName, [BankPackName, number, number][]>()
            for (const [bankPack, packItems] of bot.getBankItems()) {
                for (const [bankSlot, packItem] of packItems) {
                    if (!packItem.q) continue // Not stackable
                    const gInfo = Game.G.items[packItem.name]
                    if (packItem.q >= gInfo.s) continue // Full stack

                    const countable = countableCounts.get(packItem.name) ?? []
                    countable.push([bankPack, bankSlot, packItem.q])
                    countableCounts.set(packItem.name, countable)
                }
            }
            if (bot.esize >= 2) {
                // We can combine stacks to their max stackable size
                for (const [itemName, counts] of countableCounts) {
                    // Sort highest counts to lowest count
                    counts.sort((a, b) => a[2] - b[2])
                    const gInfo = Game.G.items[itemName]

                    for (let countIndex = 1; countIndex < counts.length; countIndex++) {
                        const [packName1, bankSlot1, q1] = counts[countIndex - 1]
                        const [packName2, bankSlot2, q2] = counts[countIndex]

                        if (q1 + q2 < gInfo.s) {
                            // We can stack the first one on the second one
                            await goAndWithdrawItem(bot, packName1, bankSlot1, emptySlot)
                            await goAndWithdrawItem(bot, packName2, bankSlot2, -1)
                            if (bot.items[emptySlot]?.name !== itemName) return this.doBanking(bot) // We have a different item!?
                            await goAndDepositItem(bot, packName2, bankSlot2, emptySlot)

                            // Update counts and re-sort
                            counts[countIndex] = [packName2, bankSlot2, q1 + q2]
                            counts.sort((a, b) => a[2] - b[2])
                        } else if (q1 < gInfo.s) {
                            // We can make one a full stack
                            await goAndWithdrawItem(bot, packName2, bankSlot2, emptySlot)
                            if (bot.items[emptySlot]?.name !== itemName) return this.doBanking(bot) // We have a different item!?
                            const splitSlot = await bot.splitItem(emptySlot, gInfo.s - q1)
                            await goAndDepositItem(bot, packName1, bankSlot1, splitSlot)
                            await goAndDepositItem(bot, packName2, bankSlot2, emptySlot)

                            // Remove full stack, update, and re-sort
                            counts.splice(countIndex, 1)
                            if (
                                !bot.bank[packName1][bankSlot1]
                                || bot.bank[packName1][bankSlot1].name !== itemName
                            ) return this.doBanking(bot) // We have a different item!?

                            // Update counts and re-sort
                            counts[countIndex - 1] = [packName1, bankSlot1, bot.bank[packName1][bankSlot1].q]
                            counts[countIndex] = [packName2, bankSlot2, bot.bank[packName2][bankSlot2].q]
                            counts.sort()
                        }
                    }
                }
            } else if (bot.esize === 1) {
                // We can combine stacks if two combine to at most their stackable size
                for (const [itemName, counts] of countableCounts) {
                    // Sort highest counts to lowest count
                    counts.sort((a, b) => a[2] - b[2])
                    const gInfo = Game.G.items[itemName]

                    for (let countIndex = 1; countIndex < counts.length; countIndex++) {
                        const [packName1, bankSlot1, q1] = counts[countIndex - 1]
                        const [packName2, bankSlot2, q2] = counts[countIndex]

                        if (q1 + q2 < gInfo.s) {
                            // We can stack the first one on the second one
                            await goAndWithdrawItem(bot, packName1, bankSlot1, emptySlot)
                            await goAndWithdrawItem(bot, packName2, bankSlot2, -1)
                            if (bot.items[emptySlot]?.name !== itemName) return this.doBanking(bot) // We have a different item!?
                            await goAndDepositItem(bot, packName2, bankSlot2, emptySlot)

                            // Update counts and re-sort
                            counts[countIndex] = [packName2, bankSlot2, q1 + q2]
                            counts.sort((a, b) => a[2] - b[2])
                        } else {
                            // We don't have enough empty space to split them to make full stacks
                            break
                        }
                    }
                }
            }
        }

        // Look for items to compound
        if (bot.esize >= 4) {
            const itemCounts = await getItemCounts(bot.owner)

            for (const [itemName, levelCounts] of itemCounts) {
                const gInfo = AL.Game.G.items[itemName]
                if (!gInfo.compound) continue // Not compoundable

                const itemConfig = this.options.itemConfig[itemName]
                countSearch:
                for (const [itemLevel, countData] of levelCounts) {
                    if (countData.inventorySpaces < 3) continue // We don't have enough to compound
                    if (!wantToUpgrade(
                        new Item({ name: itemName, level: itemLevel }, AL.Game.G),
                        itemConfig,
                        itemCounts)
                    ) continue // We don't want to upgrade it at this level

                    // Withdraw if we have enough to compound
                    const numHave = bot.countItem(itemName, bot.items, { level: itemLevel, locked: false })
                    if (numHave < 3) {
                        const bankSlots: [BankPackName, number][] = []
                        bankSearch:
                        for (const [packName, packItems] of bot.getBankItems()) {
                            for (const [packSlot, packItem] of packItems) {
                                if (packItem.name !== itemName) continue // Wrong item
                                if (packItem.level !== itemLevel) continue // Wrong level
                                if (!wantToUpgrade(packItem, itemConfig, itemCounts)) continue // Something is special with this one
                                bankSlots.push([packName, packSlot])
                                if (bankSlots.length + numHave >= 3) break bankSearch
                            }
                        }
                        if (numHave + bankSlots.length >= 3) {
                            for (let num = 0; num < (3 - numHave); num++) {
                                await goAndWithdrawItem(bot, bankSlots[num][0], bankSlots[num][1])
                            }
                            break countSearch
                        }
                    }
                }

                if (bot.esize < 4) break // Not enough space remaining
            }
        }

        // Look for items to upgrade
        if (bot.esize >= 2) {
            const itemCounts = await getItemCounts(bot.owner)

            bankSearch:
            for (const [packName, packItems] of bot.getBankItems()) {
                for (const [packSlot, packItem] of packItems) {
                    if (!packItem.upgrade) continue // Not upgradable

                    const itemConfig: UpgradeConfig = this.options.itemConfig[packItem.name]
                    if (!wantToUpgrade(packItem, itemConfig, itemCounts)) continue

                    // Withdraw the item, we'll upgrade it
                    await goAndWithdrawItem(bot, packName, packSlot, emptySlot)
                    emptySlot = bot.getFirstEmptyInventorySlot()
                    if (bot.esize < 2) break bankSearch // Not enough empty slots
                }
            }
        }

        // Look for items to craft
        emptySlot = bot.getFirstEmptyInventorySlot()
        if (emptySlot) {
            for (const key in this.options.itemConfig) {
                const itmeName = key as ItemName
                const config = this.options.itemConfig[itmeName]
                if (!config.craft) continue // We don't want to craft it

                const itemsNeeded = [...AL.Game.G.craft[itmeName].items]
                const itemsFound: [BankPackName, number][] = []
                bankSearch:
                for (const [packName, packItems] of bot.getBankItems()) {
                    for (const [packSlot, packItem] of packItems) {
                        for (let i = 0; i < itemsNeeded.length; i++) {
                            const needed = itemsNeeded[i]
                            if (needed[1] !== packItem.name) continue // Wrong item
                            if (needed[0] > (packItem.q ?? 1)) continue // Not enough
                            if (needed[2] && packItem.level !== needed[2]) continue // Wrong level
                            if (needed[2] === undefined && packItem.level) continue // Wrong level

                            // We found one of the items needed to craft this item
                            itemsFound.push([packName, packSlot])
                            itemsNeeded.splice(i, 1)
                            break
                        }

                        if (itemsNeeded.length === 0) break bankSearch // We found all the items
                    }
                }

                if (
                    itemsNeeded.length === 0 // We found everything
                    && bot.esize >= itemsFound.length // We have enough space for everything
                ) {
                    for (const [packName, packSlot] of itemsFound) {
                        await goAndWithdrawItem(bot, packName, packSlot)
                    }
                } else if (
                    bot.esize >= itemsNeeded.length // We have enough space to buy the remaining items
                ) {
                    let canBuyRemainingFromNPC = true
                    for (let i = 0; i < itemsNeeded.length; i++) {
                        const itemNeeded = itemsNeeded[i]
                        if (bot.canBuy(itemNeeded[1], { ignoreLocation: true })) continue
                        canBuyRemainingFromNPC = false
                        break
                    }

                    if (canBuyRemainingFromNPC) {
                        for (const [packName, packSlot] of itemsFound) {
                            await goAndWithdrawItem(bot, packName, packSlot)
                        }
                    }
                }

                if (bot.esize <= 0) break // No mre space
            }
        }

        // Look for items to exchange
        if (bot.esize >= 2) {
            emptySlot = bot.getFirstEmptyInventorySlot()

            bankSearch:
            for (const [packName, packItems] of bot.getBankItems()) {
                for (const [packSlot, packItem] of packItems) {
                    const config = this.options.itemConfig[packItem.name]
                    if (!config) continue
                    if (!config.exchange) continue
                    if (config.exchangeAtLevel !== undefined && packItem.level !== config.exchangeAtLevel) continue

                    const stackSize = packItem.e ?? 1
                    if ((packItem.q ?? 1) < stackSize) continue // Not enough to exchange

                    // Withdraw the exchangeables
                    await goAndWithdrawItem(bot, packName, packSlot, emptySlot)
                    break bankSearch
                }
            }
        }

        // Move back to main
        await bot.smartMove("main")
        setLastCheck(checkKey)
    }

    protected async goCheckInstances(bot: Merchant): Promise<void> {
        // Remove finished instances every minute
        if (checkOnlyEveryMS("cleanInstances", 60_000)) await cleanInstances()
        if (
            bot.serverData.region !== DEFAULT_REGION
            || bot.serverData.name !== DEFAULT_IDENTIFIER
        ) return // Only open instances on defautlt server

        for (const key in this.options.enableInstanceProvider) {
            const map = key as MapName
            const checkKey = `${bot.id}_instance_check_${map}`
            if (!checkOnlyEveryMS(checkKey, 300_000, false)) continue // Check every 5 minutes

            // Check an existing instance
            const instance = await AL.InstanceModel.findOne({
                map: map,
                in: { $nin: [...new Set(this.options.contexts.map((a) => a.bot.in))] }, // Ignore instances that any of our bots are currently in
                serverIdentifier: bot.serverData.name,
                serverRegion: bot.serverData.region,
            })
                .sort({ lastSeen: -1 })
                .lean()
                .exec()
            if (instance) {
                const gMap = (AL.Game.G.maps[map] as GMap)

                // Move to the spawn entrance
                // If it's not valid, it will be removed from the DB in ALClient
                await bot.smartMove({ map: map, in: instance.in, x: gMap.spawns[0][0], y: gMap.spawns[0][1] })
                if (bot.map !== map) return this.goCheckInstances(bot) // Try again (if deleted, we will check another instance)

                // Move to every spawn until we find a monster
                let moveFailed = false
                let monsterFound = false
                for (const monsterSpawn of gMap.monsters) {
                    const x = (monsterSpawn.boundary[0] + monsterSpawn.boundary[2]) / 2
                    const y = (monsterSpawn.boundary[1] + monsterSpawn.boundary[3]) / 2
                    await bot.smartMove(
                        { map: map, x: x, y: y },
                        {
                            getWithin: 400,
                            numAttempts: 3,
                            stopIfTrue: async () => bot.getEntity() !== undefined,
                        }).catch(() => { moveFailed = true })
                    if (bot.getEntity()) {
                        // We found something
                        monsterFound = true
                        break
                    }
                }

                if (!moveFailed && !monsterFound) {
                    // We looked at all spawns, but didn't find anything
                    await AL.InstanceModel.deleteOne({ _id: instance._id }).lean().exec()
                    await AL.EntityModel.deleteMany({ in: instance.in, serverIdentifier: instance.serverIdentifier, serverRegion: instance.serverRegion }).lean().exec()
                }
            }

            // Open a new instances
            const maxInstances = this.options.enableInstanceProvider[map].maxInstances
            if (maxInstances !== undefined) {
                const numInstances = await AL.InstanceModel.count({
                    map: map,
                    serverIdentifier: bot.serverData.name,
                    serverRegion: bot.serverData.region,
                }).exec()
                if (numInstances >= maxInstances) {
                    setLastCheck(checkKey)
                    continue // Already have plenty open
                }
            }

            const item = getKeyForCrypt(map)
            if (!bot.hasItem(item)) {
                if (bot.esize <= 0) continue // No space for this item

                // Get a key from the bank
                await bot.smartMove(bankingPosition)
                bankSearch:
                for (const [packName, packItems] of bot.getBankItems()) {
                    for (const [packSlot, packItem] of packItems) {
                        if (packItem.name !== item) continue
                        await goAndWithdrawItem(bot, packName, packSlot)
                        break bankSearch // We got it
                    }
                }

                if (!bot.hasItem(item)) {
                    // We didn't find a key in the bank, check our characters
                    for (const friendContext of filterContexts(this.options.contexts, {
                        owner: bot.owner,
                        serverData: bot.serverData,
                    })) {
                        const friendBot = friendContext.bot
                        if (friendBot === bot) continue // Ignore ourself
                        if (!friendBot.hasItem(item)) continue // They don't have a key either

                        // Let's go get a key from them
                        await bot.smartMove(friendBot, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                        if (Tools.squaredDistance(bot, friendBot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) return this.goCheckInstances(bot) // Try again

                        // Get it
                        const itemPos = friendBot.locateItem(item)
                        if (itemPos === undefined) return this.goCheckInstances(bot) // They no longer have the item !?
                        await friendBot.sendItem(bot.id, itemPos, friendBot.items[itemPos].q ?? 1)
                        break
                    }
                }

                if (!bot.hasItem(item)) {
                    // We don't have any keys for this crypt
                    setLastCheck(checkKey)
                    continue
                }
            }

            await bot.smartMove(map).catch()
            if (bot.map !== map) return this.goCheckInstances(bot) // Try again
            await addCryptMonstersToDB(bot, map, bot.in)

            // We finished checking for this instance
            setLastCheck(checkKey)
        }
    }

    protected async goCraft(bot: Merchant) {
        for (const key in this.options.itemConfig) {
            const itemName = key as ItemName
            const config = this.options.itemConfig[itemName]
            if (!config.craft) continue // We don't want to craft it

            if (!bot.canCraft(itemName, { ignoreLocation: true, ignoreNpcItems: true })) continue // We can't craft it
            if (!bot.canCraft(itemName, { ignoreLocation: true })) {
                // We can craft it if we buy the rest of the recipe from NPCs
                const gCraft = AL.Game.G.craft[itemName]
                for (const [requiredQuantity, requiredItem] of gCraft.items) {
                    if (bot.countItem(requiredItem) > requiredQuantity) continue // We have enough of this item
                    if (!bot.canBuy(requiredItem)) {
                        // We need to move to buy it
                        await bot.smartMove(requiredItem, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                    }
                    await bot.buy(requiredItem, requiredQuantity)
                }
            }

            if (!bot.canCraft(itemName, { ignoreLocation: true })) continue // We still can't craft it!?
            if (!bot.canCraft(itemName)) {
                // We need to move to craft it
                const npc = AL.Pathfinder.locateCraftNPC(itemName)
                await bot.smartMove(npc, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
            }

            await bot.craft(itemName)
        }
    }

    protected async goDeliverReplenishables(bot: Merchant): Promise<void> {
        for (const friendContext of filterContexts(this.options.contexts, {
            owner: bot.owner,
            serverData: bot.serverData,
        })) {
            const friendBot = friendContext.bot
            if (friendBot === bot) continue // Ignore ourself
            for (const key in this.options.itemConfig) {
                const itemName = key as ItemName
                const config = this.options.itemConfig[itemName]
                if (!config.replenish) continue
                if (config.hold === undefined) continue
                if (config.hold !== true && !config.hold?.includes(friendBot.ctype)) continue
                if (friendBot.canBuy(itemName)) continue // They can buy their own
                const numFriendHas = friendBot.countItem(itemName)
                if (numFriendHas > config.replenish * 0.25) continue // They have enough

                const numToReplenishFriend = config.replenish - numFriendHas
                const numWeHave = bot.countItem(itemName)
                if (numWeHave < numToReplenishFriend) {
                    if (!bot.canBuy(itemName, { quantity: numToReplenishFriend })) continue // We can't buy them for them
                    await bot.buy(itemName, numToReplenishFriend)
                }

                await bot.smartMove(friendBot, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                if (AL.Tools.squaredDistance(bot, friendBot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                    // They moved somewhere, try again
                    return this.goDeliverReplenishables(bot)
                }

                const itemSlot = bot.locateItem(itemName, bot.items, { quantityGreaterThan: numToReplenishFriend - 1 })
                if (itemSlot === undefined) continue // We don't have the required item(s) anymore!?

                await bot.sendItem(friendBot.id, itemSlot, numToReplenishFriend)
            }
        }
    }

    protected async goDeliverUpgrades(bot: Merchant): Promise<void> {
        if (bot.esize <= 2) return // We don't have enough room in our inventory

        const key = `goDeliverUpgrades_${bot.serverData.region}${bot.serverData.name}`
        if (!checkOnlyEveryMS(key, 300_000)) return // We've already checked recently

        const itemCounts = await getItemCounts(bot.owner)
        for (const friendContext of filterContexts(this.options.contexts, {
            owner: bot.owner,
            serverData: bot.serverData,
        })) {
            const friend = friendContext.bot
            if (friend === bot) continue // Don't do anything for ourselves

            const mainStat = AL.Game.G.classes[friend.ctype].main_stat

            for (const s in friend.slots) {
                const slotName = s as SlotType
                const slot = friend.slots[slotName]

                if (slot) {
                    if (slot.level === undefined) continue // Can't upgrade this item

                    // Check if we have the same item at a higher level
                    const levelCounts = itemCounts.get(slot.name)
                    if (!levelCounts) continue // We don't have any information about this item
                    const [highestLevel, countData] = [...levelCounts.entries()].sort((a, b) => b[0] - a[0])[0]
                    if (highestLevel <= slot.level || countData.inventorySpaces === 0) continue // We have the highest level

                    // Go to the bank, we might have a better item
                    await bot.smartMove(bankingPosition)

                    // Look for the item
                    let bestItem: [Item, BankPackName, number]
                    for (const [packName, packItems] of bot.getBankItems()) {
                        for (const [packSlot, packItem] of packItems) {
                            if (packItem.name !== slot.name) continue // Not the same item
                            if (packItem.level <= slot.level) continue // Not higher level
                            if (bestItem && bestItem[0].level >= packItem.level) continue // We already found something better

                            bestItem = [packItem, packName, packSlot]
                        }
                    }
                    if (!bestItem) continue // We didn't find anything better

                    // Withdraw the item
                    await goAndWithdrawItem(bot, bestItem[1], bestItem[2])
                    const itemPos = bot.locateItem(slot.name, bot.items, { levelGreaterThan: slot.level })
                    if (itemPos === undefined) continue // We didn't withdraw the item!?

                    await bot.smartMove("scrolls", { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })

                    const item = new Item(bot.items[itemPos], AL.Game.G)
                    if (item.stat) {
                        if (item.stat_type !== mainStat) {
                            const grade = bestItem[0].calculateGrade()
                            const statScroll = `${mainStat}scroll` as ItemName
                            const numNeeded = Math.pow(10, grade)
                            const numHave = bot.countItem(statScroll, bot.items)
                            if (!bot.canBuy(statScroll, { quantity: numNeeded - numHave })) continue // We can't afford scrolls {

                            // Buy scrolls and apply them to the item
                            const statScrollPosition = await bot.buy(statScroll, numNeeded - numHave)
                            await bot.upgrade(itemPos, statScrollPosition)
                        }
                    }

                    // Go deliver the item
                    await bot.smartMove(friend, { getWithin: Constants.NPC_INTERACTION_DISTANCE / 2 })
                    if (Tools.squaredDistance(bot, friend) > Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // They moved somewhere
                    await bot.sendItem(friend.id, itemPos)

                    // Have them equip the item
                    const friendItemPos = friend.locateItem(item.name, friend.items, { levelGreaterThan: slot.level, returnHighestLevel: true })
                    if (friendItemPos === undefined) continue // Couldn't find the item !?
                    await friend.equip(friendItemPos)
                } else if (
                    !slot
                    && slotName !== "offhand"
                    && slotName !== "mainhand"
                ) {
                    let bestItem: [Item, BankPackName, number]
                    let desiredItem: ItemName

                    if (slotName === "earring1" || slotName === "earring2") {
                        desiredItem = `${mainStat}earring` as ItemName
                    } else if (slotName === "amulet") {
                        desiredItem = `${mainStat}amulet` as ItemName
                    } else if (slotName === "belt") {
                        desiredItem = `${mainStat}amulet` as ItemName
                    } else if (slotName === "ring1" || slotName === "ring2") {
                        desiredItem = `${mainStat}ring` as ItemName
                    } else if (slotName === "orb") {
                        desiredItem = "jacko"
                    }

                    if (!desiredItem) continue // TODO: More logic for other items

                    // Check if we have the desired item
                    const levelCounts = itemCounts.get(desiredItem)
                    if (!levelCounts) continue // We don't have any information about this item

                    // Go to the bank, we might have a better item
                    await bot.smartMove(bankingPosition)

                    // Look for the item
                    for (const [packName, packItems] of bot.getBankItems()) {
                        for (const [packSlot, packItem] of packItems) {
                            if (packItem.name !== desiredItem) continue // Not the same item
                            if (bestItem && bestItem[0].level >= packItem.level) continue // We already found something better
                            bestItem = [packItem, packName, packSlot]
                        }
                    }

                    if (!bestItem) continue // We didn't find anything

                    // Withdraw the item
                    await goAndWithdrawItem(bot, bestItem[1], bestItem[2])
                    const itemPos = bot.locateItem(slot.name, bot.items, { levelGreaterThan: slot.level })
                    if (itemPos === undefined) continue // We didn't withdraw the item!?

                    await bot.smartMove("scrolls", { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })

                    const item = new Item(bot.items[itemPos], AL.Game.G)
                    if (item.stat) {
                        if (item.stat_type !== mainStat) {
                            const grade = bestItem[0].calculateGrade()
                            const statScroll = `${mainStat}scroll` as ItemName
                            const numNeeded = Math.pow(10, grade)
                            const numHave = bot.countItem(statScroll, bot.items)
                            if (!bot.canBuy(statScroll, { quantity: numNeeded - numHave })) continue // We can't afford scrolls {

                            // Buy scrolls and apply them to the item
                            const statScrollPosition = await bot.buy(statScroll, numNeeded - numHave)
                            await bot.upgrade(itemPos, statScrollPosition)
                        }
                    }

                    // Go deliver the item
                    await bot.smartMove(friend, { getWithin: Constants.NPC_INTERACTION_DISTANCE / 2 })
                    if (Tools.squaredDistance(bot, friend) > Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // They moved somewhere
                    await bot.sendItem(friend.id, itemPos)
                } else {
                    // Weapons are hard to deal with
                    continue
                }
            }
        }

        setLastCheck(key)
    }

    protected async goExchange(bot: Merchant): Promise<void> {
        for (const [slot, item] of bot.getItems()) {
            const config = this.options.itemConfig[item.name]
            if (!config) continue // No config
            if (!config.exchange) continue // We don't want to exchange it
            if (config.exchangeAtLevel !== undefined && item.level !== config.exchangeAtLevel) continue // We don't want to exchange it at this level

            if ((item.e ?? 1) > (item.q ?? 1)) continue // We don't have enough to exchange
            if (!bot.canExchange(item.name)) {
                // We need to move to exchange
                const npc = AL.Pathfinder.locateExchangeNPC(item.name)
                await bot.smartMove(npc, { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })
            }

            await bot.exchange(slot)
            if (bot.q.exchange) await sleep(bot.q.exchange.ms)
        }
    }

    protected async goFishing(bot: Merchant): Promise<void> {
        if (!bot.canUse("fishing", { ignoreEquipped: true, ignoreLocation: true })) return // We can't fish
        if (bot.c.fishing) await sleep(bot.c.fishing.ms) // We're already fishing!?

        if (!bot.hasItem("rod") && !bot.isEquipped("rod")) {
            // Check the bank for a rod
            await bot.smartMove(bankingPosition)
            const rods = locateItemsInBank(bot, "rod")
            if (rods.length) {
                // We had one in the bank
                await goAndWithdrawItem(bot, rods[0][0], rods[0][1][0])
            } else {
                // We need to craft a rod
                if (bot.esize < 2) return // Not enough space to craft a rod

                if (!bot.hasItem("spidersilk", bot.items, { locked: false })) {
                    // Withdraw spidersilk
                    const spiderSilk = locateItemsInBank(bot, "spidersilk", { locked: false })
                    if (!spiderSilk.length) {
                        // We didn't find spidersilk in the bank, check our characters
                        for (const friendContext of filterContexts(this.options.contexts, {
                            owner: bot.owner,
                            serverData: bot.serverData,
                        })) {
                            const friendBot = friendContext.bot
                            if (friendBot === bot) continue // Ignore ourself
                            if (!friendBot.hasItem("spidersilk")) continue // They don't have spidersilk either

                            // Let's go get spidersilk from them
                            await bot.smartMove(friendBot, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                            if (Tools.squaredDistance(bot, friendBot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) return this.goCheckInstances(bot) // Try again

                            // Get it
                            const itemPos = friendBot.locateItem("spidersilk")
                            if (itemPos === undefined) return this.goFishing(bot) // They no longer have the item !?
                            await friendBot.sendItem(bot.id, itemPos, friendBot.items[itemPos].q ?? 1)
                            break
                        }

                        if (!bot.hasItem("spidersilk")) return // We couldn't get any
                    }

                    await goAndWithdrawItem(bot, spiderSilk[0][0], spiderSilk[0][1][0])
                }

                if (!bot.hasItem("staff", bot.items, { locked: false, level: 0 })) {
                    // Withdraw a staff
                    const staff = locateItemsInBank(bot, "staff", { locked: false, level: 0 })
                    if (staff.length) await goAndWithdrawItem(bot, staff[0][0], staff[0][1][0])
                }

                await bot.smartMove("main")
                if (!bot.hasItem("spidersilk", bot.items, { locked: false })) return // We don't have spidersilk!?
                if (!bot.hasItem("staff", bot.items, { locked: false, level: 0 })) await bot.buy("staff")

                if (!bot.canCraft("rod")) {
                    if (!bot.canCraft("rod", { ignoreLocation: true })) return // We can't craft!?
                    const npc = Pathfinder.locateCraftNPC("rod")
                    await bot.smartMove(npc, { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })
                }
                await bot.craft("rod")

                if (!bot.hasItem("rod") && !bot.isEquipped("rod")) return // We still don't have a rod!?
            }
        }

        // TODO: Find closest fishing spot
        await bot.smartMove(mainFishingSpot, { costs: { transport: 9999 } }).catch()

        if (!bot.isEquipped("rod")) {
            // Equip the rod
            if (bot.slots.offhand) await bot.unequip("offhand")
            await bot.equip(bot.locateItem("rod"))
        }

        // Wait if we're on cooldown
        if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)

        await bot.fish()
        if (!bot.isOnCooldown("fishing")) return this.goFishing(bot) // Keep fishing
    }

    protected async goGetHolidaySpirit(bot: Merchant): Promise<void> {
        if (!bot.S.holidayseason) return // Not holiday season
        if (bot.s.holidayspirit) return // We already have it

        await bot.smartMove("newyear_tree", { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })
        await bot.getHolidaySpirit()
    }

    protected async goGetItemsFromContexts(bot: Merchant): Promise<void> {
        if (bot.esize <= 1) return // We are low on space

        for (const friendContext of filterContexts(this.options.contexts, {
            owner: bot.owner,
            serverData: bot.serverData,
        })) {
            const friendBot = friendContext.bot
            if (friendBot === bot) continue // Ignore ourself

            let wantToGo = false
            if (friendBot.gold > this.options.goldToHold * 1.5) wantToGo = true // They have a lot of gold
            if (!wantToGo && friendBot.esize <= 5) {
                for (const [, item] of friendBot.getItems()) {
                    if (wantToHold(this.options.itemConfig, item, friendBot)) continue
                    // They have something they can transfer to us
                    wantToGo = true
                    break
                }
            }

            if (!wantToGo) continue

            await bot.smartMove(friendBot, { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })
            if (AL.Tools.squaredDistance(bot, friendBot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) {
                // They moved somewhere, try again
                return this.goGetItemsFromContexts(bot)
            }

            // Take their extra gold
            const goldDifference = friendBot.gold - this.options.goldToHold
            if (goldDifference > 0) await friendBot.sendGold(bot.id, goldDifference)

            // Take their extra items
            for (const [slot, item] of friendBot.getItems()) {
                if (wantToHold(this.options.itemConfig, item, friendBot)) continue
                await friendBot.sendItem(bot.id, slot, item.q ?? 1)
                if (bot.esize <= 1) return this.doBanking(bot) // Go do banking if we're full now
            }
        }
    }

    protected async goMining(bot: Merchant): Promise<void> {
        if (!bot.canUse("mining", { ignoreEquipped: true, ignoreLocation: true })) return // We can't mine
        if (bot.c.mining) await sleep(bot.c.mining.ms) // We're already mining!?
        if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) {
            // Check the bank for a pickaxe
            await bot.smartMove(bankingPosition)
            const pickaxes = locateItemsInBank(bot, "pickaxe")
            if (pickaxes.length) {
                // We had one in the bank
                await goAndWithdrawItem(bot, pickaxes[0][0], pickaxes[0][1][0])
            } else {
                // We need to craft a pickaxe
                if (bot.esize < 3) return // Not enough space to craft a pickaxe

                if (!bot.hasItem("spidersilk", bot.items, { locked: false })) {
                    // Withdraw spidersilk
                    const spiderSilk = locateItemsInBank(bot, "spidersilk", { locked: false })
                    if (!spiderSilk.length) {
                        // We didn't find spidersilk in the bank, check our characters
                        for (const friendContext of filterContexts(this.options.contexts, {
                            owner: bot.owner,
                            serverData: bot.serverData,
                        })) {
                            const friendBot = friendContext.bot
                            if (friendBot === bot) continue // Ignore ourself
                            if (!friendBot.hasItem("spidersilk")) continue // They don't have spidersilk either

                            // Let's go get spidersilk from them
                            await bot.smartMove(friendBot, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                            if (Tools.squaredDistance(bot, friendBot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) return this.goCheckInstances(bot) // Try again

                            // Get it
                            const itemPos = friendBot.locateItem("spidersilk")
                            if (itemPos === undefined) return this.goMining(bot) // They no longer have the item !?
                            await friendBot.sendItem(bot.id, itemPos, friendBot.items[itemPos].q ?? 1)
                            break
                        }

                        if (!bot.hasItem("spidersilk")) return // We couldn't get any
                    }
                    await goAndWithdrawItem(bot, spiderSilk[0][0], spiderSilk[0][1][0])
                }

                if (!bot.hasItem("staff", bot.items, { locked: false, level: 0 })) {
                    // Withdraw a staff
                    const staff = locateItemsInBank(bot, "staff", { locked: false, level: 0 })
                    if (staff.length) await goAndWithdrawItem(bot, staff[0][0], staff[0][1][0])
                }

                if (!bot.hasItem("blade", bot.items, { locked: false, level: 0 })) {
                    // Withdraw a blade
                    const blade = locateItemsInBank(bot, "blade", { locked: false, level: 0 })
                    if (blade.length) await goAndWithdrawItem(bot, blade[0][0], blade[0][1][0])
                }

                await bot.smartMove("main")
                if (!bot.hasItem("spidersilk", bot.items, { locked: false })) return // We don't have spidersilk!?
                if (!bot.hasItem("staff", bot.items, { locked: false, level: 0 })) await bot.buy("staff")
                if (!bot.hasItem("blade", bot.items, { locked: false, level: 0 })) await bot.buy("blade")

                if (!bot.canCraft("pickaxe")) {
                    if (!bot.canCraft("pickaxe", { ignoreLocation: true })) return // We can't craft!?
                    const npc = Pathfinder.locateCraftNPC("pickaxe")
                    await bot.smartMove(npc, { getWithin: Constants.NPC_INTERACTION_DISTANCE - 50 })
                }
                await bot.craft("pickaxe")

                if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) return // We still don't have a pickaxe!?
            }
        }

        // TODO: Find closest mining spot
        await bot.smartMove(miningSpot, { costs: { transport: 9999 } }).catch()

        if (!bot.isEquipped("pickaxe")) {
            // Equip the pickaxe
            if (bot.slots.offhand) await bot.unequip("offhand")
            await bot.equip(bot.locateItem("pickaxe"))
        }

        // Wait if we're on cooldown
        if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)

        await bot.mine()
        if (!bot.isOnCooldown("mining")) return this.goMining(bot) // Keep mining
    }

    protected async goMluck(bot: Merchant): Promise<void> {
        if (!this.options.enableMluck) return // Don't want to mluck
        if (!this.options.enableMluck.travel) return // Don't want to travel
        if (!bot.canUse("mluck", { ignoreCooldown: true, ignoreLocation: true, ignoreMP: true })) return // Can't mluck

        // Travel to mluck
        const key = `goMluck_${bot.serverData.region}${bot.serverData.name}`
        if (!checkOnlyEveryMS(key, 5_000)) return

        const canMluck = (other: Character | Player): boolean => {
            if (other.s.invis) return false // Can't mluck invsible players
            if (!other.s.mluck) return true // They don't have mluck
            if (!other.s.mluck.strong) return true // We can steal their mluck
            return other.s.mluck.f === bot.id // We can refresh their mluck
        }

        const shouldMluck = (other: Character | Player): boolean => {
            if (!canMluck(other)) return false
            if (other.s.mluck?.f === "earthMer" && bot.id !== "earthMer") return false // Don't compete with earthMer
            if (other.s.mluck?.f === bot.id && other.s.mluck.ms > AL.Game.G.skills.mluck.duration * 0.25) return false // They still have a lot left
            return true
        }

        // Find context characters to mluck
        if (this.options.enableMluck.contexts) {
            for (const context of filterContexts(this.options.contexts, { serverData: bot.serverData })) {
                if (!shouldMluck(context.bot)) continue

                await bot.smartMove(context.bot, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                if (
                    AL.Tools.squaredDistance(bot, context.bot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED
                    && shouldMluck(context.bot)
                ) {
                    // They moved somewhere, try again
                    return this.goMluck(bot)
                }
            }
        }

        // Find other characters to mluck
        if (this.options.enableMluck.others && Database.connection) {
            const others = await AL.PlayerModel.find(
                {
                    $or: [
                        { "s.mluck": undefined }, // They don't have mluck
                        { "s.mluck.f": { $ne: bot.id }, "s.mluck.strong": undefined }, // We can steal mluck
                    ],
                    "s.invis": undefined,
                    lastSeen: { $gt: Date.now() - 60_000 },
                    serverIdentifier: bot.server.name,
                    serverRegion: bot.server.region,
                },
                {
                    _id: 0,
                    map: 1,
                    in: 1,
                    name: 1,
                    x: 1,
                    y: 1,
                },
            )
                .lean()
                .exec()

            for (const other of others) {
                await bot.smartMove(other, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
            }
        }

        setLastCheck(key)
    }

    protected async goSellItems(bot: Merchant): Promise<void> {
        const key = `goSellItems_${bot.serverData.region}${bot.serverData.name}`
        if (!checkOnlyEveryMS(key, 60_000)) return // We've already checked recently

        const buyingMerchants = await AL.PlayerModel.find({
            lastSeen: { $gt: Date.now() - 120_000 },
            serverIdentifier: bot.serverData.name,
            serverRegion: bot.serverData.region,
            $or: [
                { "slots.trade1.b": true },
                { "slots.trade2.b": true },
                { "slots.trade3.b": true },
                { "slots.trade4.b": true },
                { "slots.trade5.b": true },
                { "slots.trade6.b": true },
                { "slots.trade7.b": true },
                { "slots.trade8.b": true },
                { "slots.trade9.b": true },
                { "slots.trade10.b": true },
                { "slots.trade11.b": true },
                { "slots.trade12.b": true },
                { "slots.trade13.b": true },
                { "slots.trade14.b": true },
                { "slots.trade15.b": true },
                { "slots.trade16.b": true },
                { "slots.trade17.b": true },
                { "slots.trade18.b": true },
                { "slots.trade19.b": true },
                { "slots.trade20.b": true },
                { "slots.trade21.b": true },
                { "slots.trade22.b": true },
                { "slots.trade23.b": true },
                { "slots.trade24.b": true },
                { "slots.trade25.b": true },
                { "slots.trade26.b": true },
                { "slots.trade27.b": true },
                { "slots.trade28.b": true },
                { "slots.trade29.b": true },
                { "slots.trade30.b": true },
            ],
        }).lean().exec()

        // Check if there's anything we want to sell
        const itemCounts = await getItemCounts(bot.owner)
        merchantSearch:
        for (const buyingMerchant of buyingMerchants) {
            for (const sN in buyingMerchant.slots) {
                if (!sN.startsWith("trade")) continue // Not a trade slot
                const slotName = sN as TradeSlotType
                const slotData = buyingMerchant.slots[slotName]
                if (!slotData) continue // No slot data
                if (!slotData.b) continue // Not buying

                const tradeItem = new TradeItem(slotData, AL.Game.G)
                if (!wantToSellToPlayer(this.options.itemConfig, tradeItem, bot)) continue // We don't want to sell

                // Check if we might have it in the bank
                const levelCounts = itemCounts.get(slotData.name)
                if (!levelCounts) continue // We don't have any
                const countData = levelCounts.get(slotData.level)
                if (!countData || countData.inventorySpaces <= 0) continue // We don't have any at the given level

                // Check if we have it in the bank
                await bot.smartMove(bankingPosition)
                const itemsToSell = locateItemsInBank(bot, slotData.name, { level: slotData.level, locked: false, special: false })
                if (itemsToSell.length === 0) continue // We don't have any

                // Withdraw it
                await goAndWithdrawItem(bot, itemsToSell[0][0], itemsToSell[0][1][0])

                // Move to the merchant
                // NOTE: Requires `ItemStrategy` to be active to sell it
                await bot.smartMove(buyingMerchant, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                await sleep(1000)
                break merchantSearch
            }
        }

        // Check if there's anything we can craft to sell
        merchantSearch:
        for (const buyingMerchant of buyingMerchants) {
            slotSearch:
            for (const sN in buyingMerchant.slots) {
                if (!sN.startsWith("trade")) continue // Not a trade slot
                const slotName = sN as TradeSlotType
                const slotData = buyingMerchant.slots[slotName]
                if (!slotData) continue // No slot data
                if (!slotData.b) continue // Not buying

                const config = this.options.itemConfig[slotData.name]
                if (!config) continue // No config
                if (config.destroyBelowLevel) continue // We would immediately destroy it

                const gCraft = AL.Game.G.craft[slotData.name]
                if (!gCraft) continue // Not craftable

                const tradeItem = new TradeItem(slotData, AL.Game.G)
                if (!wantToSellToPlayer(this.options.itemConfig, tradeItem, bot)) continue // We don't want to sell

                const itemsNeeded = [...gCraft.items]
                for (const [, itemName, level] of itemsNeeded) {
                    if ((level === 0 || level === undefined) && bot.canBuy(itemName, { ignoreLocation: true })) continue // It's OK, we can buy it from an NPC!
                    const levelCounts = itemCounts.get(itemName)
                    if (!levelCounts) continue slotSearch // We don't have any
                    const countData = levelCounts.get(level)
                    if (!countData || countData.inventorySpaces <= 0) continue slotSearch // We don't have any at the given level, and we can't buy it from an NPC
                }

                // We might have all of the items we need in the bank
                await bot.smartMove(bankingPosition)
                const itemsFound: [BankPackName, number][] = []
                bankSearch:
                for (const [packName, packItems] of bot.getBankItems()) {
                    for (const [packSlot, packItem] of packItems) {
                        for (let i = 0; i < itemsNeeded.length; i++) {
                            const needed = itemsNeeded[i]
                            if (needed[1] !== packItem.name) continue // Wrong item
                            if (needed[0] > (packItem.q ?? 1)) continue // Not enough
                            if (needed[2] && packItem.level !== needed[2]) continue // Wrong level
                            if (needed[2] === undefined && packItem.level) continue // Wrong level

                            // We found one of the items needed to craft this item
                            itemsFound.push([packName, packSlot])
                            itemsNeeded.splice(i, 1)
                            break
                        }

                        if (itemsNeeded.length === 0) break bankSearch // We found all the items
                    }
                }

                // Withdraw the items if we have everything
                if (
                    itemsNeeded.length === 0 // We found everything
                    && bot.esize >= itemsFound.length // We have enough space for everything
                ) {
                    for (const [packName, packSlot] of itemsFound) {
                        await goAndWithdrawItem(bot, packName, packSlot)
                    }
                } else if (
                    bot.esize >= itemsNeeded.length // We have enough space to buy the remaining items
                ) {
                    let canBuyRemainingFromNPC = true
                    for (let i = 0; i < itemsNeeded.length; i++) {
                        const itemNeeded = itemsNeeded[i]
                        if (bot.canBuy(itemNeeded[1], { ignoreLocation: true })) continue
                        canBuyRemainingFromNPC = false
                        break
                    }

                    if (canBuyRemainingFromNPC) {
                        for (const [packName, packSlot] of itemsFound) {
                            await goAndWithdrawItem(bot, packName, packSlot)
                        }
                    } else {
                        continue
                    }
                } else {
                    continue
                }

                // Go buy remaining items from NPC
                await bot.smartMove("main")
                for (let i = 0; i < itemsNeeded.length; i++) {
                    const itemNeeded = itemsNeeded[i]
                    if (!bot.canBuy(itemNeeded[1]) && bot.canBuy(itemNeeded[1], { ignoreLocation: true })) {
                        await bot.smartMove(itemNeeded[1])
                    } else {
                        continue slotSearch // We can't buy it anymore!?
                    }
                    await bot.buy(itemNeeded[1])
                }

                // Go craft
                if (!bot.canCraft(slotData.name)) {
                    if (bot.canCraft(slotData.name, { ignoreLocation: true })) {
                        await bot.smartMove(Pathfinder.locateCraftNPC(slotData.name))
                    } else {
                        continue slotSearch // We can't craft it anymore!?
                    }
                    await bot.craft(slotData.name)
                }

                // Move to the merchant
                // NOTE: Requires `ItemStrategy` to be active to sell it
                await bot.smartMove(buyingMerchant, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
                await sleep(1000)
                break merchantSearch
            }
        }

        setLastCheck(key)
    }

    protected async joinGiveaways(bot: Merchant): Promise<void> {
        // Join nearby giveaways
        const joinNearby = async () => {
            const giveawayPromises: Promise<unknown>[] = []
            for (const player of bot.getPlayers({ withinRange: AL.Constants.NPC_INTERACTION_DISTANCE })) {
                for (const s in player.slots) {
                    const slot = s as TradeSlotType
                    const item = player.slots[slot]
                    if (!item) continue // Nothing in the slot
                    if (!item.giveaway) continue // Not a giveaway
                    if (item.list && item.list.includes(bot.id)) continue // We're already in the giveaway
                    giveawayPromises.push(bot.joinGiveaway(slot, player.id, item.rid))
                }
            }
            return Promise.allSettled(giveawayPromises)
        }

        await joinNearby()

        // Travel to join giveaways
        const key = `joinGiveaways_${bot.serverData.region}${bot.serverData.name}`
        if (!checkOnlyEveryMS(key, 60_000)) return
        const giveawayMerchants = await AL.PlayerModel.find({
            lastSeen: { $gt: Date.now() - 120_000 },
            serverIdentifier: bot.serverData.name,
            serverRegion: bot.serverData.region,
            $or: [
                { "slots.trade1.giveaway": true, "slots.trade1.list": { $ne: bot.id } },
                { "slots.trade2.giveaway": true, "slots.trade2.list": { $ne: bot.id } },
                { "slots.trade3.giveaway": true, "slots.trade3.list": { $ne: bot.id } },
                { "slots.trade4.giveaway": true, "slots.trade4.list": { $ne: bot.id } },
                { "slots.trade5.giveaway": true, "slots.trade5.list": { $ne: bot.id } },
                { "slots.trade6.giveaway": true, "slots.trade6.list": { $ne: bot.id } },
                { "slots.trade7.giveaway": true, "slots.trade7.list": { $ne: bot.id } },
                { "slots.trade8.giveaway": true, "slots.trade8.list": { $ne: bot.id } },
                { "slots.trade9.giveaway": true, "slots.trade9.list": { $ne: bot.id } },
                { "slots.trade10.giveaway": true, "slots.trade10.list": { $ne: bot.id } },
                { "slots.trade11.giveaway": true, "slots.trade11.list": { $ne: bot.id } },
                { "slots.trade12.giveaway": true, "slots.trade12.list": { $ne: bot.id } },
                { "slots.trade13.giveaway": true, "slots.trade13.list": { $ne: bot.id } },
                { "slots.trade14.giveaway": true, "slots.trade14.list": { $ne: bot.id } },
                { "slots.trade15.giveaway": true, "slots.trade15.list": { $ne: bot.id } },
                { "slots.trade16.giveaway": true, "slots.trade16.list": { $ne: bot.id } },
                { "slots.trade17.giveaway": true, "slots.trade17.list": { $ne: bot.id } },
                { "slots.trade18.giveaway": true, "slots.trade18.list": { $ne: bot.id } },
                { "slots.trade19.giveaway": true, "slots.trade19.list": { $ne: bot.id } },
                { "slots.trade20.giveaway": true, "slots.trade20.list": { $ne: bot.id } },
                { "slots.trade21.giveaway": true, "slots.trade21.list": { $ne: bot.id } },
                { "slots.trade22.giveaway": true, "slots.trade22.list": { $ne: bot.id } },
                { "slots.trade23.giveaway": true, "slots.trade23.list": { $ne: bot.id } },
                { "slots.trade24.giveaway": true, "slots.trade24.list": { $ne: bot.id } },
                { "slots.trade25.giveaway": true, "slots.trade25.list": { $ne: bot.id } },
                { "slots.trade26.giveaway": true, "slots.trade26.list": { $ne: bot.id } },
                { "slots.trade27.giveaway": true, "slots.trade27.list": { $ne: bot.id } },
                { "slots.trade28.giveaway": true, "slots.trade28.list": { $ne: bot.id } },
                { "slots.trade29.giveaway": true, "slots.trade29.list": { $ne: bot.id } },
                { "slots.trade30.giveaway": true, "slots.trade30.list": { $ne: bot.id } },
            ],
        }).lean().exec()

        for (const giveawayMerchant of giveawayMerchants) {
            await bot.smartMove(giveawayMerchant, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
            const merchant = bot.players.get(giveawayMerchant.name)
            if (merchant) await joinNearby()
        }

        setLastCheck(key)
    }

    protected async listForSale(bot: Merchant): Promise<void> {
        if (!bot.stand) return // We don't have the stand open

        for (const iN in this.options.itemConfig) {
            const itemName = iN as ItemName
            const config = this.options.itemConfig[itemName]
            if (!config.list) continue // We don't want to list

            if (config.buy) {
                if (bot.isListedForPurchase(itemName)) continue // Already listed for sale

                if (typeof config.buyPrice == "number") {
                    await bot.listForPurchase(itemName, config.buyPrice)
                } else if (config.buyPrice == "ponty") {
                    const item = new Item({
                        name: itemName,
                        level: (Game.G.items[itemName].upgrade || Game.G.items[itemName].compound) ? 0 : undefined
                    }, Game.G)
                    await bot.listForPurchase(itemName, item.calculateValue() * Game.G.multipliers.secondhands_mult)
                }

                // TODO: Add support for buyPrice array
            } else if (config.sell) {
                const itemPos = bot.locateItem(itemName)
                if (itemPos === undefined) continue // We don't have the item in our inventory

                if (typeof config.sellPrice === "number") {
                    await bot.listForSale(itemPos, config.sellPrice)
                }

                // TODO: Add support for sellPrice array
            }
        }
    }
}