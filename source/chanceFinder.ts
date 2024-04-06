import fs from "fs"

import AL, { Character, Item, ItemName, Merchant, PQData } from "alclient"
import { sleep, getMsToNextMinute } from "./base/general.js"
import { Loop, LoopName, Strategist, Strategy } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { HoldPositionMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { suppress_errors } from "./strategy_pattern/logging.js"

const CREDENTIALS = "../credentials.json"

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, false), AL.Game.getGData(false)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: false })

class TrackUpgradeStrategy implements Strategy<Character> {
    private onQ: (data: PQData) => void

    public onApply(bot: Character) {
        // Make directory
        const dir = `data/${bot.id}`
        fs.mkdir(dir, { recursive: true }, suppress_errors)

        this.onQ = (data) => {
            if (data.p.failure !== true && data.p.success !== true) return // Still rolling
            const slot = data.num
            const roll = parseFloat(`${data.p.nums[3]}${data.p.nums[2]}.${data.p.nums[1]}${data.p.nums[0]}`)

            // Append roll to file that's tracking what slot we upgraded
            fs.appendFile(`${dir}/${slot}`, roll.toFixed(2) + "\n", suppress_errors)
            console.debug(`rolled a ${roll.toFixed(2)} in slot ${slot}`)
        }
        bot.socket.on("q_data", this.onQ)
    }

    public onRemove(bot: Character) {
        if (this.onQ) bot.socket.removeListener("q_data", this.onQ)
    }
}

class BuyAndUpgradeStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    public testSlot = new Map<string, number>()

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
                const testSlot = (this.testSlot.get(bot.id) + 1) % bot.isize
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
                this.testSlot.set(bot.id, testSlot)
            },
            interval: 500,
        })
    }

    public onApply(bot: Merchant) {
        if (!this.testSlot.has(bot.id)) {
            this.testSlot.set(bot.id, 0)
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