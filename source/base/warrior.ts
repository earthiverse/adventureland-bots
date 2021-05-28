
import AL from "alclient"
import ALM from "alclient-mongo"
import { LOOP_MS } from "./general.js"

export function startChargeLoop(bot: AL.Warrior | ALM.Warrior): void {
    async function chargeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("charge")) await bot.charge()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("chargeloop", setTimeout(async () => { chargeLoop() }, Math.max(LOOP_MS, bot.getCooldown("charge"))))
    }
    chargeLoop()
}

export function startWarcryLoop(bot: AL.Warrior | ALM.Warrior): void {
    async function warcryLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.warcry && bot.canUse("warcry")) await bot.warcry()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("warcryloop", setTimeout(async () => { warcryLoop() }, Math.max(LOOP_MS, bot.getCooldown("warcry"))))
    }
    warcryLoop()
}