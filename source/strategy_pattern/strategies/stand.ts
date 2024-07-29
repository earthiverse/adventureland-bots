import { IPosition, Merchant, Tools } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class ToggleStandByMovementStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    public constructor() {
        this.loops.set("merchant_stand", {
            fn: async (bot: Merchant) => {
                await this.checkStand(bot)
            },
            interval: 100,
        })
    }

    private async checkStand(bot: Merchant) {
        if (bot.moving || bot.smartMoving) {
            if (bot.stand) {
                bot.closeMerchantStand()
            }
        } else {
            if (!bot.stand) {
                bot.openMerchantStand()
            }
        }
    }
}

export type ToggleStandStrategyOptions = {
    /** If set, we will toggle the stand off when moving */
    offWhenMoving?: true
    /** If set, we will toggle the stand on when near any of the positions */
    onWhenNear?: {
        distance: number
        position: IPosition
    }[]
}

export class ToggleStandStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    protected options: ToggleStandStrategyOptions

    public constructor(options?: ToggleStandStrategyOptions) {
        if (!options) options = {}
        this.options = options

        this.loops.set("merchant_stand", {
            fn: async (bot: Merchant) => {
                await this.checkStand(bot)
            },
            interval: 100,
        })
    }

    private async checkStand(bot: Merchant) {
        if (!bot.hasItem(["stand0", "stand1", "computer", "supercomputer"])) return // No stand

        if (this.options.offWhenMoving) {
            if (bot.moving || bot.smartMoving) {
                return bot.closeMerchantStand()
            }
        }

        if (this.options.onWhenNear) {
            for (const onWhenNear of this.options.onWhenNear) {
                if (Tools.distance(bot, onWhenNear.position) > onWhenNear.distance) continue // Far away from this position
                return bot.openMerchantStand()
            }
        }
    }
}
