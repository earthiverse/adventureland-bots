import AL from "alclient-mongo"
import { startBuyLoop, startHealLoop } from "../base/general.js"

export async function startRanger(bot: AL.Ranger): Promise<void> {
    startBuyLoop(bot)
    startHealLoop(bot)
}