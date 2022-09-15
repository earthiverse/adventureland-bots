import AL, { ItemName, MonsterName, PingCompensatedCharacter, Ranger } from "alclient"
import { Strategist } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { getMsToNextMinute } from "../base/general.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

/**
 * Farm jrats
 */

const RANGER = "earthiverse"
const MONSTERS: MonsterName[] = ["jrat"]
const BUFFER = 10_000

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(CONTEXTS)
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500],
        ["xptome", 1],
    ])
})
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()

async function startRanger(context: Strategist<Ranger>, contexts: Strategist<PingCompensatedCharacter>[]) {

    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)

    // Attack
    context.applyStrategy(new RangerAttackStrategy({ contexts: contexts, typeList: MONSTERS }))

    // TODO: Move this to a move strategy
    // Go to jail
    setInterval(async () => {
        try {
            const bot = context.bot
            if (!bot || !bot.ready || bot.rip || bot.map == "jail") return
            console.log("warping to jail!")
            await bot.warpToJail()
        } catch (e) {
            console.error(e)
        }
    }, 250)
}

setTimeout(async () => {
    const ranger = await AL.Game.startRanger(RANGER, "US", "II")
    const RANGER_CONTEXT = new Strategist<Ranger>(ranger, baseStrategy)
    startRanger(RANGER_CONTEXT, CONTEXTS).catch(console.error)
    CONTEXTS.push(RANGER_CONTEXT)

    const connectLoop = async () => {
        try {
            console.log("Connecting...")
            await RANGER_CONTEXT.reconnect()
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + BUFFER)
        }
    }
    setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + BUFFER)

    const disconnectLoop = async () => {
        try {
            console.log("Disconnecting...")

            // Remove the disconnect listener so it doesn't automatically reconnect
            RANGER_CONTEXT.bot.socket.off("disconnect")

            await RANGER_CONTEXT.bot.disconnect()
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(disconnectLoop, getMsToNextMinute() + (60_000 - BUFFER))
        }
    }
    setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() - BUFFER)

}, getMsToNextMinute() + BUFFER)
