import AL from "alclient-mongo"
import { LOOP_MS, startHealLoop, startLootLoop, startSellLoop } from "../base/general.js"

/** Config */
let region:AL.ServerRegion = "ASIA"
let identifier:AL.ServerIdentifier = "I"
const mageName = "earthMag3"

/** Characters */
let mage: AL.Mage

async function startMage(bot: AL.Mage) {
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "shield": 2, "wcap": 2, "wshoes": 2 })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    type: "frog",
                    willBurnToDeath: false,
                    willDieToProjectiles: false,
                    withinRange: bot.range,
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }

            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    type: "tortoise",
                    willBurnToDeath: false,
                    willDieToProjectiles: false,
                    withinRange: bot.range,
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
                return
            }

            // Look for frogs
            let nearest:AL.Entity
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
                await bot.smartMove(nearest)
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
                    await bot.smartMove(nearest)
                } else {
                    await bot.smartMove("frog")
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
        const now = new Date()
        const nextStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 10)
        setTimeout(async () => { connectLoop() }, nextStart.getTime() - Date.now())
    }

    const disconnectLoop = async () => {
        try {
            if (mage) await mage.disconnect()
            if (region == "ASIA" && identifier == "I") {
                region = "US"
                identifier = "I"
            } else if (region == "US" && identifier == "I") {
                region = "EU"
                identifier = "I"
            } else if (region == "EU" && identifier == "I") {
                region = "EU"
                identifier = "II"
            } else if (region == "EU" && identifier == "II") {
                region = "ASIA"
                identifier = "I"
            }
            mage = undefined
        } catch (e) {
            console.error(e)
        }
        const now = new Date()
        const nextStop = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 50)
        setTimeout(async () => { disconnectLoop() }, nextStop.getTime() - Date.now())
    }

    const now = new Date()
    const nextStop = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 50)
    const nextStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 10)
    setTimeout(async () => { connectLoop() }, nextStart.getTime() - Date.now())
    setTimeout(async () => { disconnectLoop() }, nextStop.getTime() - Date.now())
}
run()