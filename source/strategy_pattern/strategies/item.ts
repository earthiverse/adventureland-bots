import AL, { GItem, ItemName, PingCompensatedCharacter, Player } from "alclient"
import { DEFAULT_ITEMS_TO_HOLD } from "../../base/defaults.js"
import { Strategy, LoopName, Loop, Strategist, filterContexts } from "../context.js"

export type OptimizeItemsStrategyOptions = {
    contexts?: Strategist<PingCompensatedCharacter>[]
    itemsToHold?: Set<ItemName>
    itemsToSell?: Set<ItemName>

    /** If set, we will transfer items to this player if we see them and they have space */
    transferItemsTo?: string
}

export class OptimizeItemsStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: OptimizeItemsStrategyOptions

    public constructor(options?: OptimizeItemsStrategyOptions) {
        // Set default options
        if (!options) options = {}
        if (!options.contexts) options.contexts = []
        if (!options.itemsToHold) options.itemsToHold = DEFAULT_ITEMS_TO_HOLD
        this.options = options

        this.loops.set("item", {
            fn: async (bot: Type) => {
                await this.stackItems(bot)
                await this.organizeItems(bot)
                await this.moveOverflowItems(bot)
                await this.transferItems(bot)
                await this.transferSellableItems(bot)
                await this.transferStackableItems(bot)
            },
            interval: 5_000
        })
    }

    /**
     * Sort items how I like them to be sorted
     */
    private async organizeItems (bot: Type) {
        // Sort locked items first
        for (let i = 0; i < bot.isize - 1; i++) {
            const item = bot.items[i]
            if (!item) continue // No item
            if (item.l) continue // Locked item is already here

            let foundLocked = false
            for (let j = i + 1; j < bot.isize; j++) {
                const item2 = bot.items[j]
                if (!item2) continue
                if (!item2.l) continue // Item isn't locked
                if (["computer", "supercomputer", "tracker"].includes(item2.name)) continue // We sort these differently
                console.debug(`swapping ${i} (${bot.items[i].name}) and ${j} (${bot.items[j].name}) (locked first)`)
                await bot.swapItems(i, j)
                foundLocked = true
                break
            }
            if (!foundLocked) break
        }

        const items: {
            name: ItemName
            num: number
        }[] = []
        for (let i = 0; i < bot.isize; i++) {
            const item = bot.items[i]
            if (!item) continue

            items.push({
                ...item,
                num: i
            })
        }

        /**
         * Swaps the item to the given slot if it isn't there
         */
        const fixNum = async (find: ItemName[], num: number) => {
            const item = items.find(i => find.includes(i.name))
            if (item === undefined) return
            if (item?.num && item.num !== num) await bot.swapItems(item.num, num)
        }

        // Put things in certain slots
        await fixNum(["cscroll0"], 28)
        await fixNum(["cscroll1"], 29)
        await fixNum(["cscroll2"], 30)
        await fixNum(["scroll0"], 35)
        await fixNum(["scroll1"], 36)
        await fixNum(["scroll2"], 37)
        await fixNum(["mpot0"], 38)
        await fixNum(["hpot0"], 39)
        await fixNum(["computer", "supercomputer"], 40)
        await fixNum(["tracker"], 41)
    }

    /**
     * Look for items that can be stacked and stack them
     */
    private async stackItems(bot: Type) {
        for (let i = 0; i < bot.isize - 1; i++) {
            const item1 = bot.items[i]
            if (!item1) continue // No item
            if (!item1.q) continue // Not stackable
            for (let j = i + 1; j < bot.isize; j++) {
                const item2 = bot.items[j]
                if (!item2) continue // No item
                if (!item2.q) continue // Not stackable
                if (item1.name !== item2.name) continue // Different items
                if (item1.p !== item2.p) continue // Item is a different kind of special
                if (item1.v && !item2.v) continue // One is PVP marked

                const gInfo = AL.Game.G.items[item1.name]
                if (item1.q + item2.q > gInfo.s) continue // Too many to stack

                // Stack the items!
                await bot.swapItems(j, i).catch(console.error)
            }
        }
    }

    private async transferItems(bot: Type) {
        if (!this.options.transferItemsTo) return // The player to transfer items to isn't set
        if (bot.id == this.options.transferItemsTo) return // We'd be transferring items to ourself

        const player: PingCompensatedCharacter | Player = bot.players.get(this.options.transferItemsTo)
        if (!player) return // They're too far away
        if (AL.Tools.squaredDistance(bot, player) >= AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) return // They're too far away

        for (const context of filterContexts(this.options.contexts, { owner: bot.owner, serverData: bot.serverData })) {
            if (context.bot.id == this.options.transferItemsTo) continue // Not the player we want to transfer items to
            if (context.bot.esize <= 0) return // They're full
            break
        }

        // Transfer items
        for (let i = 0; i < bot.isize; i++) {
            const item = bot.items[i]
            if (!item) continue // No item in this slot
            if (item.l) continue // Item is locked
            if (this.options.itemsToHold.has(item.name)) continue // We want to hold this item
            try {
                // Send them the item
                await bot.sendItem(this.options.transferItemsTo, i, item.q ?? 1)
            } catch {
                // Don't send any more items if something went wrong
                break
            }
        }
    }

    private async transferSellableItems(bot: Type) {
        if (!this.options.contexts || this.options.contexts.length <= 1) return // No contexts
        if (!this.options.itemsToSell) return // No items to sell
        if (bot.hasItem(["computer", "supercomputer"])) return // We already have a computer, we can sell it ourself

        for (const context of filterContexts(this.options.contexts, { owner: bot.owner, serverData: bot.serverData })) {
            const friend = context.bot
            if (friend.esize <= 0) continue // They have no space
            if (AL.Tools.distance(bot, friend)) continue // They're too far away
            if (!friend.hasItem(["computer", "supercomputer"])) continue // They don't have a computer to sell the item

            for (let i = 0; i < bot.isize; i++) {
                const item = bot.items[i]
                if (!item) continue // No item
                if (item.l) continue // Item is locked
                if (!this.options.itemsToSell.has(item.name)) continue // We don't want to sell it
                try {
                    // Send them the item so they can sell it
                    await bot.sendItem(friend.id, i, item.q ?? 1)
                } catch {
                    break
                }
            }
        }
    }

    /**
     * Transfer items to others
     * @param bot
     */
    private async transferStackableItems(bot: Type) {
        if (!this.options.contexts || this.options.contexts.length <= 1) return // No contexts

        // Look for items that we both have that are stackable
        const ourStackables = new Map<ItemName, number>()
        for (let i = 0 ; i < bot.isize; i++) {
            const item = bot.items[i]
            if (!item) continue // No item
            if (!item.q) continue // It's not stackable
            if (item.l) continue // It's locked
            if (this.options.itemsToHold.has(item.name)) continue // We want to hold it
            ourStackables.set(item.name, i)
        }
        if (ourStackables.size == 0) return // No stackables

        for (const context of filterContexts(this.options.contexts, { owner: bot.owner, serverData: bot.serverData })) {
            const friend = context.bot
            if (friend == bot) continue // Skip ourself
            if (AL.Tools.squaredDistance(bot, friend) >= AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // Too far away

            for (let i = 0 ; i < friend.isize; i++) {
                const item = friend.items[i]
                if (!item) continue // No item
                if (!item.q) continue // It's not stackable
                if (item.l) continue // It's locked
                if (!ourStackables.has(item.name)) continue // We don't have any

                const ourPosition = ourStackables.get(item.name)
                const ourItem = bot.items[ourPosition]
                if (!ourItem) continue // We no longer have this item
                if (ourItem.v && !item.v) continue // One is PvP marked, the other isn't
                if (ourItem.q >= item.q) continue // We have more, don't transfer
                const gItem: GItem = AL.Game.G.items[item.name]

                // Send our stacks to combine them
                await bot.sendItem(friend.id, ourPosition, Math.min(ourItem.q, gItem.s as number - ourItem.q)).catch(console.error)
            }
        }
    }

    /**
     * Look for items that are in the overflow area of the items, and swap them to normal inventory spaces
     */
    private async moveOverflowItems(bot: Type) {
        for (let i = bot.isize; i < bot.items.length; i++) {
            const item = bot.items[i]
            if (!item) continue // No item in overflow slot
            for (let j = 0; j < bot.isize; j++) {
                const item2 = bot.items[j]
                if (item2) continue // Item in normal inventory slot
                await bot.swapItems(i, j).catch(console.error) // Swap the item from overflow in to our normal inventory
                break
            }
        }
    }
}