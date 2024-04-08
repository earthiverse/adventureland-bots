import AL, { Item, ItemName, Merchant } from "alclient"
import { sleep, getMsToNextMinute } from "./base/general.js"
import { Loop, LoopName, Strategist, Strategy } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { HoldPositionMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { TrackUpgradeStrategy } from "./strategy_pattern/strategies/statistics.js"

const CREDENTIALS = "../credentials.json"

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, false), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })


class BuyAndUpgradeStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    public testSlotIndexes = new Map<string, number>()

    public constructor(options: { item: ItemName } = { item: "wshield" }) {
        this.loops.set("upgrade", {
            fn: async (bot: Merchant) => {
                if (bot.q.upgrade) return // Already upgrading
                if (bot.gold < 10_000) return // We ran out of money

                // Get the item
                let itemSlot = bot.locateItem(options.item)
                if (itemSlot) {
                    const item = new Item(bot.items[itemSlot], AL.Game.G)
                    if (item.calculateGrade() !== 0) {
                        // It's too high of a level now, just sell it
                        await bot.sell(itemSlot)
                        return
                    }
                }
                if (itemSlot === undefined) {
                    itemSlot = await bot.buy(options.item)
                }

                // Swap item to the test slot
                const testSlots = [19, 11, 5, 8, 31, 39, 38, 34, 26, 3, 6, 12, 29, 41, 18, 9]
                const testSlotIndex = (this.testSlotIndexes.get(bot.id) + 1) % testSlots.length
                const testSlot = testSlots[testSlotIndex]
                if (itemSlot !== testSlot) {
                    await bot.swapItems(testSlot, itemSlot)
                    itemSlot = testSlot
                }

                // Get the scroll
                let scrollSlot = bot.locateItem("scroll0")
                if (scrollSlot === undefined) {
                    scrollSlot = await bot.buy("scroll0")
                }

                // Speed up upgrade
                if (bot.canUse("massproduction")) {
                    await bot.massProduction()
                }

                // Upgrade
                await bot.upgrade(itemSlot, scrollSlot)
                this.testSlotIndexes.set(bot.id, testSlotIndex)
            },
            interval: 100,
        })
    }

    public onApply(bot: Merchant) {
        if (!this.testSlotIndexes.has(bot.id)) {
            this.testSlotIndexes.set(bot.id, 0)
        }
    }
}

const baseStrategy = new BaseStrategy()
const moveStrategy = new HoldPositionMoveStrategy({ map: "main", x: -200, y: -100 })
const trackUpgradeStrategy = new TrackUpgradeStrategy()
const upgradeStrategy = new BuyAndUpgradeStrategy({ item: "wshield" })

// Wait
await sleep(getMsToNextMinute() + 5_000)

const merchant1 = await AL.Game.startMerchant("earthMer2", "ASIA", "I")
const context = new Strategist<Merchant>(merchant1, baseStrategy)
context.applyStrategy(moveStrategy)
context.applyStrategy(trackUpgradeStrategy)
context.applyStrategy(upgradeStrategy)

const connectLoop = async () => {
    try {
        await context.reconnect(false)
    } catch (e) {
        console.error(e)
    } finally {
        context?.bot?.socket?.removeAllListeners("disconnect")
        setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + 5_000)
    }
}
setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + 5_000)

const disconnectLoop = async () => {
    try {
        console.log("Disconnecting...")

        context.bot.socket.removeAllListeners("disconnect")
        await context.bot.disconnect()
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() + (60_000 - 5_000))
    }
}
setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() - 5_000)