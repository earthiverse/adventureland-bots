import AL, { Item, ItemName, Merchant, PingCompensatedCharacter, Player } from "alclient"
import {
    DEFAULT_ITEM_CONFIG,
    ItemConfig,
    MailConfig,
    UpgradeConfig,
    getItemCounts,
    reduceCount,
    wantToExchange,
    wantToHold,
    wantToMail,
    wantToSellToNpc,
    wantToUpgrade,
} from "../../base/itemsNew.js"
import { Loop, LoopName, Strategist, Strategy, filterContexts } from "../context.js"

/**
 * There are slots that give a slightly better chance to succeed when upgrading
 */
export const LUCKY_SLOTS = new Map<string, number>([
    ["earthMag", 21],
    ["earthMer", 11],
    ["earthMer2", 34],
    ["earthPri", 12],
    ["earthWar", 20],
])

export type ItemStrategyOptions = {
    itemConfig: ItemConfig
    /** If available, we can do things like stacking items on one character instead of across three */
    contexts?: Strategist<PingCompensatedCharacter>[]
    /** If set, we will transfer items to this player if we see them and they have space */
    transferItemsTo?: string
}

export const defaultNewItemStrategyOptions: ItemStrategyOptions = {
    itemConfig: DEFAULT_ITEM_CONFIG,
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
                await this.mail(bot).catch(console.error)
            },
            interval: 5_000,
        })

        this.loops.set("compound", {
            fn: async (bot: Type) => {
                if (bot.q.compound) return // Waiting for another compound to finish
                await this.compound(bot).catch(console.error)
            },
            interval: 250,
        })

        this.loops.set("exchange", {
            fn: async (bot: Type) => {
                if (bot.q.exchange) return // Waiting for another exchange to finish
                await this.exchange(bot).catch(console.error)
            },
            interval: 250,
        })

        this.loops.set("upgrade", {
            fn: async (bot: Type) => {
                if (bot.q.upgrade) return // Waiting for another upgrade to finish
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
                if (bot.items[slot]?.name === item.name) continue // We already have the same item in that slot
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
                if (item2.v && !item1.v) continue // Different PVP marking
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
                if (itemConfig.hold === true || itemConfig.hold?.includes(bot.ctype)) continue
                if (itemConfig.sell && bot.canSell()) continue // We'll sell it soon
                if (itemConfig.destroyBelowLevel && item.level < itemConfig.destroyBelowLevel) continue // We'll destroy it soon
            }

            if (player instanceof PingCompensatedCharacter && player.esize === 0) {
                if (!item.q) continue // It's not stackable, and they have no space
                if (
                    !player.hasItem(item.name, player.items, {
                        quantityLessThan: AL.Game.G.items[item.name].s + 1 - item.q,
                    })
                )
                    continue // We can't stack it
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

                if (wantToHold(this.options.itemConfig, item, bot)) continue
                if (!wantToSellToNpc(this.options.itemConfig, item, bot)) continue

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

                const friendSlot = friend.locateItem(item.name, friend.items, {
                    quantityLessThan: AL.Game.G.items[item.name].s + 1 - item.q,
                }) // We can't stack it
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

        for (const [, item] of bot.getItems()) {
            const gItem = AL.Game.G.items[item.name]
            if (!gItem.compound) continue // Not compoundable

            const itemConfig: UpgradeConfig = this.options.itemConfig[item.name]
            if (!wantToUpgrade(item, itemConfig, itemCounts)) continue

            const items = bot.locateItems(item.name, bot.items, { level: item.level, locked: false })
            if (items.length < 3) continue // Not enough to compound

            let offering: ItemName
            let cscroll = `cscroll${item.calculateGrade()}` as ItemName
            if (itemConfig) {
                if (item.level >= itemConfig.useOfferingFromLevel) offering = "offering"
                else if (item.level >= itemConfig.usePrimlingFromLevel) offering = "offeringp"

                if (offering && !bot.hasItem(offering)) {
                    // We don't have the offering needed
                    if (bot.canBuy(offering)) await bot.buy(offering)
                    else continue // We can't buy it
                }

                if (item.level >= itemConfig.useScroll3FromLevel) cscroll = "cscroll3"
                else if (item.level >= itemConfig.useScroll2FromLevel) cscroll = "cscroll2"
                else if (item.level >= itemConfig.useScroll1FromLevel) cscroll = "cscroll1"
            }

            let cscrollSlot = bot.locateItem(cscroll)
            if (cscrollSlot === undefined) {
                // We don't have the scroll needed
                if (bot.canBuy(cscroll)) cscrollSlot = await bot.buy(cscroll)
                else continue // We can't buy the scroll needed
            }

            const offeringSlot = offering ? bot.locateItem(offering) : undefined
            if (!bot.canCompound(items[0], items[1], items[2], cscrollSlot, offeringSlot)) return // Can't compound from where we are

            if (bot.canUse("massproduction")) await (bot as unknown as Merchant).massProduction()

            // Reduce counts just in case we fail
            reduceCount(bot.owner, item)
            reduceCount(bot.owner, item)
            reduceCount(bot.owner, item)

            return bot.compound(items[0], items[1], items[2], cscrollSlot, offeringSlot)
        }
    }

    private async mail(bot: Type) {
        for (const [slot, item] of bot.getItems()) {
            if (!item.upgrade) continue // Not upgradable
            if (!wantToMail(this.options.itemConfig, item)) continue // Don't want to mail

            const config: MailConfig = this.options.itemConfig[item.name]

            // Swap it in to slot 0 and mail it
            if (slot !== 0) await bot.swapItems(slot, 0)
            await bot.sendMail(
                config.mailTo,
                item.name,
                `Sent automatically from ${bot.id}.\n If you didn't expect this, a message reaching out would be much appreciated!`,
                true,
            )
            break
        }
    }

    private async upgrade(bot: Type) {
        if (bot.map.startsWith("bank")) return // Can't upgrade in bank
        const itemCounts = await getItemCounts(bot.owner)

        const itemsToUpgrade: [number, Item][] = []

        for (const [slot, item] of bot.getItems()) {
            if (!item.upgrade) continue // Not upgradable

            const itemConfig: UpgradeConfig = this.options.itemConfig[item.name]
            if (!wantToUpgrade(item, itemConfig, itemCounts)) continue

            itemsToUpgrade.push([slot, item])
        }

        if (!itemsToUpgrade.length) return // No items to upgrade

        // Sort itemsToUpgrade lowest -> highest level, so we upgrade the lowest levels first
        itemsToUpgrade.sort((a, b) => a[1].level - b[1].level)

        for (let [slot, item] of itemsToUpgrade) {
            const itemConfig: UpgradeConfig = this.options.itemConfig[item.name]

            let offering: ItemName = undefined
            let scroll = `scroll${item.calculateGrade()}` as ItemName
            if (itemConfig) {
                if (item.level >= itemConfig.useOfferingFromLevel) offering = "offering"
                else if (item.level >= itemConfig.usePrimlingFromLevel) offering = "offeringp"

                if (offering && !bot.hasItem(offering)) {
                    // We don't have the offering needed
                    if (bot.canBuy(offering)) await bot.buy(offering)
                    else continue // We can't buy it
                }

                if (item.level >= itemConfig.useScroll3FromLevel) scroll = "scroll3"
                else if (item.level >= itemConfig.useScroll2FromLevel) scroll = "scroll2"
                else if (item.level >= itemConfig.useScroll1FromLevel) scroll = "scroll1"
            }

            let scrollSlot = bot.locateItem(scroll)
            if (scrollSlot === undefined) {
                // We don't have the scroll needed
                if (bot.canBuy(scroll)) scrollSlot = await bot.buy(scroll)
                else continue // We can't buy the scroll needed
            }

            const offeringSlot = offering ? bot.locateItem(offering) : undefined
            if (!bot.canUpgrade(slot, scrollSlot, offeringSlot)) return // Can't compound from where we are

            if (bot.canUse("massproduction")) await (bot as unknown as Merchant).massProduction()

            if (LUCKY_SLOTS.has(bot.id)) {
                // Swap for improved upgrade chance
                const luckySlot = LUCKY_SLOTS.get(bot.id)
                if (luckySlot !== slot) {
                    await bot.swapItems(luckySlot, slot)
                    slot = luckySlot

                    if (scrollSlot === luckySlot) {
                        scrollSlot = slot
                    }
                }
            }

            // Reduce counts just in case we fail
            reduceCount(bot.owner, item)

            return bot.upgrade(slot, scrollSlot, offeringSlot)
        }
    }

    private async exchange(bot: Type) {
        if (bot.map.startsWith("bank")) return // Can't exchange in bank
        if (bot.esize <= 1) return // Don't want to exchange when it will fill up our inventory

        const itemsToExchange: [number, Item][] = []

        for (const [slot, item] of bot.getItems()) {
            if (!wantToExchange(this.options.itemConfig, item)) continue
            if (!bot.canExchange(item.name)) continue
            itemsToExchange.push([slot, item])
        }

        if (!itemsToExchange.length) return // No items to exchange

        // Sort itemsToExchange lowest -> highest quantity, so we free up inventory the fastest
        itemsToExchange.sort((a, b) => (a[1].q ?? 1) - (b[1].q ?? 1))
        return bot.exchange(itemsToExchange[0][0])
    }
}
