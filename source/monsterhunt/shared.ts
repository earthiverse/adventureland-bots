import AL from "alclient-mongo"
import { startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startEventLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop } from "../base/general.js"
import { partyLeader, partyMembers } from "./party.js"

export async function startShared(bot: AL.Character): Promise<void> {
    bot.socket.on("magiport", async (data: { name: string }) => {
        if (partyMembers.has(data.name)) {
            if (bot.c?.town) await bot.stopWarpToTown()
            await bot.acceptMagiport(data.name)
            return
        }
    })

    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startEventLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    if (bot.ctype !== "merchant") startPartyLoop(bot, partyLeader, partyMembers)
    startPontyLoop(bot)
    startSellLoop(bot)
    startUpgradeLoop(bot)
}