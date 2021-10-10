import AL, { Entity, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { goToBankIfFull, goToPotionSellerIfLow, LOOP_MS, MY_CHARACTERS, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop } from "../base/general.js"
import { attackTheseTypesWarrior } from "../base/warrior.js"

/** Config */
let region: ServerRegion = "ASIA"
let identifier: ServerIdentifier = "I"
const warriorName = "earthWar3"

/** Characters */
let warrior: Warrior

async function startWarrior(bot: Warrior) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { "hpamulet": 2, "hpbelt": 2, "ringsj": 2 })
    startPartyLoop(bot, "earthPri2", MY_CHARACTERS)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            await attackTheseTypesWarrior(warrior, ["rooster", "hen"], [warrior])
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const chickenCoop = bot.locateMonster("rooster")[0]
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            // Look for roosters
            let nearest: Entity
            let distance = Number.MAX_VALUE
            for (const rooster of bot.getEntities({
                couldGiveCredit: true,
                type: "rooster",
                willBurnToDeath: false,
                willDieToProjectiles: false
            })) {
                const d = AL.Tools.distance(bot, rooster)
                if (d < distance) {
                    nearest = rooster
                    distance = d
                }
            }
            if (nearest) {
                bot.smartMove(nearest, { getWithin: bot.range - nearest.speed }).catch(() => { /* Suppress errors */ })
            } else {
                for (const hen of bot.getEntities({
                    couldGiveCredit: true,
                    type: "hen",
                    willBurnToDeath: false,
                    willDieToProjectiles: false
                })) {
                    const d = AL.Tools.distance(bot, hen)
                    if (d < distance) {
                        nearest = hen
                        distance = d
                    }
                }
                if (nearest) {
                    bot.smartMove(nearest, { getWithin: bot.range - nearest.speed }).catch(() => { /* Suppress errors */ })
                } else {
                    bot.smartMove(chickenCoop).catch(() => { /* Suppress errors */ })
                }
            }

        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const connectLoop = async () => {
        try {
            warrior = await AL.Game.startWarrior(warriorName, region, identifier)
            startWarrior(warrior)
        } catch (e) {
            console.error(e)
            if (warrior) warrior.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
    }

    const disconnectLoop = async () => {
        try {
            if (warrior) warrior.disconnect()
            if (region == "ASIA" && identifier == "I") {
                region = "US"
                identifier = "I"
            } else if (region == "US" && identifier == "I") {
                region = "US"
                identifier = "III"
            } else if (region == "US" && identifier == "III") {
                region = "EU"
                identifier = "I"
            } else if (region == "EU" && identifier == "I") {
                region = "EU"
                identifier = "II"
            } else if (region == "EU" && identifier == "II") {
                region = "ASIA"
                identifier = "I"
            }
            warrior = undefined
        } catch (e) {
            console.error(e)
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { disconnectLoop() }, msToNextMinute - 5000 < 0 ? msToNextMinute + 55_000 : msToNextMinute - 5000)
    }

    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
    setTimeout(async () => { disconnectLoop() }, msToNextMinute - 5000 < 0 ? msToNextMinute + 55_000 : msToNextMinute - 5000)
}
run()