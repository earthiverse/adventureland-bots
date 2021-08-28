import AL from "alclient"
import { goToBankIfFull, goToPoitonSellerIfLow, LOOP_MS, startBuyLoop, startHealLoop, startLootLoop, startSellLoop } from "../base/general.js"
import { attackTheseTypesRanger } from "../base/ranger.js"

/** Config */
const region: AL.ServerRegion = "EU"
const identifier: AL.ServerIdentifier = "II"
const mageName = "earthRan2"

/** Characters */
let ranger: AL.Ranger

async function startRanger(bot: AL.Ranger) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { "cclaw": 2, "crabclaw": 2, "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "wcap": 2, "wshoes": 2 })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            await attackTheseTypesRanger(bot, ["crab"], [ranger])
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const crabSpawn = bot.locateMonster("crab")[0]
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
                return
            }

            await goToPoitonSellerIfLow(bot)
            await goToBankIfFull(bot)

            await bot.smartMove(crabSpawn)

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const connectLoop = async () => {
        try {
            ranger = await AL.Game.startRanger(mageName, region, identifier)
            startRanger(ranger)
        } catch (e) {
            console.error(e)
            if (ranger) await ranger.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
    }

    const disconnectLoop = async () => {
        try {
            if (ranger) await ranger.disconnect()
            ranger = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { disconnectLoop() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
    }

    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
    setTimeout(async () => { disconnectLoop() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
}
run()