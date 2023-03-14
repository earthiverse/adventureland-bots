import { Character, ItemName, Rogue } from "alclient"
import { sleep } from "../../base/general.js"
import { DEFAULT_ITEMS_TO_HOLD } from "../../merchant/strategy.js"
import { Strategy, LoopName, Loop } from "../context.js"
import { suppress_errors } from "../logging.js"

export type MoveToBankAndDepositStuffStrategyOptions = {
    invisibleRogue?: true,
    itemsToHold?: Set<ItemName>,
    map?: "bank_b" | "bank_u" | "bank",
}

export class MoveToBankAndDepositStuffStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: MoveToBankAndDepositStuffStrategyOptions

    public constructor(options?: MoveToBankAndDepositStuffStrategyOptions) {
        // Set default options
        if (!options) options = {}
        if (!options.itemsToHold) options.itemsToHold = DEFAULT_ITEMS_TO_HOLD
        if (!options.map) options.map = "bank"
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Type) => { await this.moveAndBank(bot) },
            interval: 100
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    private async moveAndBank(bot: Type) {
        if (this.options.invisibleRogue && bot.ctype == "rogue") {
            await (bot as unknown as Rogue).invis()
        }

        await bot.smartMove(this.options.map).catch(suppress_errors)


        await sleep(2000)

        for (let i = 0; i < bot.isize; i++) {
            const item = bot.items[i]
            if (!item) continue // No item
            if (item.l) continue // Item is locked
            if (this.options.itemsToHold.has(item.name)) continue // We want to hold this item

            // Deposit the items
            await bot.depositItem(i).catch(console.error)
        }
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}