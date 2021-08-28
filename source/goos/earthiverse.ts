import AL from "alclient"
import { goToPoitonSellerIfLow, startBuyLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startAvoidStacking, goToNearestWalkableToMonster, goToBankIfFull } from "../base/general.js"
import { mainGoos } from "../base/locations.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { getTargetServerFromDate } from "../base/serverhop.js"

/** Config */
const partyLeader = "earthiverse"
const partyMembers = ["earthiverse", "earthRan2", "earthRan3"]
const ranger1Name = "earthiverse"
const ranger2Name = "earthRan2"
const ranger3Name = "earthRan3"
const targets: AL.MonsterName[] = ["goo"]
const defaultLocation: AL.IPosition = mainGoos

let ranger1: AL.Ranger
let ranger2: AL.Ranger
let ranger3: AL.Ranger

async function startRanger(bot: AL.Ranger, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesRanger(bot, targets, [ranger1, ranger2, ranger3])
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    startAvoidStacking(bot)

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToPoitonSellerIfLow(bot)
            await goToBankIfFull(bot)

            await bot.smartMove({ map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const connectLoop1 = async () => {
        try {
            const server = getTargetServerFromDate(1)
            ranger1 = await AL.Game.startRanger(ranger1Name, server[0], server[1])
            startRanger(ranger1)
        } catch (e) {
            console.error(e)
            if (ranger1) await ranger1.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop1() }, msToNextMinute + 10000)
    }

    const disconnectLoop1 = async () => {
        try {
            if (ranger1) await ranger1.disconnect()
            ranger1 = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { disconnectLoop1() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
    }
    let msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { connectLoop1() }, msToNextMinute + 10000)
    setTimeout(async () => { disconnectLoop1() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

    const connectLoop2 = async () => {
        try {
            const server = getTargetServerFromDate(1)
            ranger2 = await AL.Game.startRanger(ranger2Name, server[0], server[1])
            startRanger(ranger2, { x: -50, y: 0 })
        } catch (e) {
            console.error(e)
            if (ranger2) await ranger2.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop2() }, msToNextMinute + 10000)
    }

    const disconnectLoop2 = async () => {
        try {
            if (ranger2) await ranger2.disconnect()
            ranger2 = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { disconnectLoop2() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
    }
    msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { connectLoop2() }, msToNextMinute + 10000)
    setTimeout(async () => { disconnectLoop2() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)

    const connectLoop3 = async () => {
        try {
            const server = getTargetServerFromDate(1)
            ranger3 = await AL.Game.startRanger(ranger3Name, server[0], server[1])
            startRanger(ranger3, { x: 50, y: 0 })
        } catch (e) {
            console.error(e)
            if (ranger3) await ranger3.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop3() }, msToNextMinute + 10000)
    }

    const disconnectLoop3 = async () => {
        try {
            if (ranger3) await ranger3.disconnect()
            ranger3 = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { disconnectLoop3() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
    }
    msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { connectLoop3() }, msToNextMinute + 10000)
    setTimeout(async () => { disconnectLoop3() }, msToNextMinute - 10000 < 0 ? msToNextMinute + 50_000 : msToNextMinute - 10000)
}
run()