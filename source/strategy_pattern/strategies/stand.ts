import { Merchant } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class ToggleStandByMovement<Type extends Merchant> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("merchant_stand", {
            fn: async (bot: Type) => { await this.checkStand(bot) },
            interval: 100
        })
    }

    async checkStand(bot: Type) {
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