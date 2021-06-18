import AL from "alclient-mongo"
import { goToBankIfFull, goToPoitonSellerIfLow, LOOP_MS, MY_CHARACTERS, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"

/** Config */
let region: AL.ServerRegion = "ASIA"
let identifier: AL.ServerIdentifier = "I"
const mageName = "earthMag3"

/** Characters */
let mage: AL.Mage

async function startMage(bot: AL.Mage) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "shield": 2, "wcap": 2, "wshoes": 2 })
    startPartyLoop(bot, "earthPri2", MY_CHARACTERS)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            await attackTheseTypesMage(bot, ["frog", "tortoise"], [mage])
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const frogSpawn = bot.locateMonster("frog")[0]
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

            // Look for frogs
            let nearest: AL.Entity
            let distance = Number.MAX_VALUE
            for (const frog of bot.getEntities({
                couldGiveCredit: true,
                type: "frog",
                willBurnToDeath: false,
                willDieToProjectiles: false
            })) {
                const d = AL.Tools.distance(bot, frog)
                if (d < distance) {
                    nearest = frog
                    distance = d
                }
            }
            if (nearest) {
                bot.smartMove(nearest, { getWithin: bot.range - nearest.speed }).catch(() => { /* Suppress errors */ })
            } else {
                for (const tortoise of bot.getEntities({
                    couldGiveCredit: true,
                    type: "tortoise",
                    willBurnToDeath: false,
                    willDieToProjectiles: false
                })) {
                    const d = AL.Tools.distance(bot, tortoise)
                    if (d < distance) {
                        nearest = tortoise
                        distance = d
                    }
                }
                if (nearest) {
                    bot.smartMove(nearest, { getWithin: bot.range - nearest.speed }).catch(() => { /* Suppress errors */ })
                } else {
                    bot.smartMove(frogSpawn).catch(() => { /* Suppress errors */ })
                }
            }

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
            mage = await AL.Game.startMage(mageName, region, identifier)
            startMage(mage)
        } catch (e) {
            console.error(e)
            if (mage) await mage.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
    }

    const disconnectLoop = async () => {
        try {
            if (mage) await mage.disconnect()
            if (region == "ASIA" && identifier == "I") {
                region = "US"
                identifier = "I"
            } else if (region == "US" && identifier == "I") {
                region = "US"
                identifier = "III"
            } else if (region == "US" && identifier == "III") {
                region = "US"
                identifier = "PVP"
            } else if (region == "US" && identifier == "PVP") {
                region = "EU"
                identifier = "I"
            } else if (region == "EU" && identifier == "I") {
                region = "EU"
                identifier = "II"
            } else if (region == "EU" && identifier == "II") {
                region = "EU"
                identifier = "PVP"
            } else if (region == "EU" && identifier == "PVP") {
                region = "ASIA"
                identifier = "I"
            }
            mage = undefined
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