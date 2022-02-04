import { Merchant } from "alclient"
import { Loop, Loops, Strategy } from "../context.js"

export class OpenStandWhenMovingStrategy<Type extends Merchant> implements Strategy<Type> {
    public name = "OpenStandWhenMovingStrategy"
    public loops: Loops<Type> = new Map<string, Loop<Type>>()

    public constructor() {
        this.loops.set("stand", {
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