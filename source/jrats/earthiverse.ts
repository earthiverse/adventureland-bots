import AL, { Ranger, ServerIdentifier, ServerRegion } from "alclient"
import { goToKiteMonster, LOOP_MS, startBuyLoop, startHealLoop, startLootLoop, startScareLoop } from "../base/general.js"
import { getTargetServerFromDate, getTargetServerFromPlayer } from "../base/serverhop.js"
import { attackTheseTypesRanger } from "../base/ranger.js"

/** Config */
const rangerName = "earthiverse"
let lastServer: [ServerRegion, ServerIdentifier] = ["US", "II"]

/** Characters */
let ranger: Ranger

async function startRanger(bot: Ranger) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)

    const firebow = bot.locateItem("firebow", bot.items, { locked: true })
    if (firebow !== undefined) bot.equip(firebow)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.isOnCooldown("scare")) {
                await attackTheseTypesRanger(bot, ["jrat"], [], { disableHuntersMark: true })
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
                return
            }

            if (bot.map !== "jail") await bot.warpToJail()

            if (!AL.Pathfinder.canStand(bot)) console.log(`We aren't supposed to be able to stand at ${bot.map}:${bot.x},${bot.y}`)

            const jRats = bot.getEntities({ type: "jrat" })
            if (jRats.length) goToKiteMonster(bot, { kiteDistance: bot.G.monsters.jrat.range * 2, type: "jrat" })
            else if (!bot.smartMoving) { bot.smartMove("jrat") }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true, false)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const connectLoop = async () => {
        try {
            const avoidServer = await getTargetServerFromPlayer(lastServer[0], lastServer[1], "earthWar")
            const targetServer = getTargetServerFromDate(0, true)
            if (targetServer[0] !== avoidServer[0] || targetServer[1] !== avoidServer[1]) lastServer = targetServer

            ranger = await AL.Game.startRanger(rangerName, lastServer[0], lastServer[1])
            startRanger(ranger)
        } catch (e) {
            console.error(e)
            if (ranger) ranger.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop() }, msToNextMinute + 1000)
    }

    const disconnectLoop = async () => {
        try {
            if (ranger) ranger.disconnect()
            ranger = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { disconnectLoop() }, msToNextMinute - 1000 < 0 ? msToNextMinute + 59_000 : msToNextMinute - 1000)
    }

    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { connectLoop() }, msToNextMinute + 1000)
    setTimeout(async () => { disconnectLoop() }, msToNextMinute - 1000 < 0 ? msToNextMinute + 59_000 : msToNextMinute - 1000)
}
run()