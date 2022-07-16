import { Merchant } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class ToggleStandByMovementStrategy implements Strategy<Merchant> {
    public loops = new Map<LoopName, Loop<Merchant>>()

    public constructor() {
        this.loops.set("merchant_stand", {
            fn: async (bot: Merchant) => { await this.checkStand(bot) },
            interval: 100
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