import AL, { Entity, Mage, ServerIdentifier, ServerRegion } from "alclient"
import { goToBankIfFull, goToPotionSellerIfLow, ITEMS_TO_HOLD, LOOP_MS, MY_CHARACTERS, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop } from "../base/general.js"
import { bankingPosition } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { partyLeader } from "../base/party.js"
import { getTargetServerFromDate, getTargetServerFromPlayer } from "../base/serverhop.js"

/** Config */
const mageName = "earthMag"
let lastServer: [ServerRegion, ServerIdentifier] = ["US", "II"]

/** Characters */
let mage: Mage

async function startMage(bot: Mage) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { "hpamulet": 2, "hpbelt": 2, "ringsj": 2 })
    startPartyLoop(bot, "earthMag", MY_CHARACTERS)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            await attackTheseTypesMage(bot, ["frog", "tortoise"], [mage])
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const frogSpawn = bot.locateMonster("frog")[0]
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

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, useBlink: true })
                // TODO: Improve ALClient by making this a function
                bot.socket.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                return
            }

            if (bot.countItem("seashell") > 1000 || bot.hasItem("gem0") || bot.gold > 5_000_000) {
                await bot.smartMove(bankingPosition) // Move to bank teller to give bank time to get ready

                for (let i = 0; i < bot.isize; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item in this slot
                    if (item.l == "l") continue // Don't send locked items
                    if (ITEMS_TO_HOLD.has(item.name)) continue

                    try {
                        await bot.depositItem(i)
                    } catch (e) {
                        console.error(e)
                    }
                }

                if (bot.gold > 1_000_000) await bot.depositGold(bot.gold - 1_000_000)
            }

            // Look for frogs
            let nearest: Entity
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
                bot.smartMove(nearest, { getWithin: bot.range - nearest.speed, useBlink: true }).catch(() => { /* Suppress errors */ })
            } else {
                // Look for tortoises
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
                    bot.smartMove(nearest, { getWithin: bot.range - nearest.speed, useBlink: true }).catch(() => { /* Suppress errors */ })
                } else {
                    bot.smartMove(frogSpawn, { useBlink: true }).catch(() => { /* Suppress errors */ })
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
            const avoidServer = await getTargetServerFromPlayer(lastServer[0], lastServer[1], partyLeader)
            const targetServer = getTargetServerFromDate(0, true)
            if (targetServer[0] !== avoidServer[0] || targetServer[1] !== avoidServer[1]) lastServer = targetServer

            mage = await AL.Game.startMage(mageName, lastServer[0], lastServer[1])
            startMage(mage)
        } catch (e) {
            console.error(e)
            if (mage) mage.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
    }

    const disconnectLoop = async () => {
        try {
            if (mage) mage.disconnect()
            mage = undefined
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