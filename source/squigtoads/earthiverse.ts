import AL from "alclient-mongo"
import { goToBankIfFull, goToPoitonSellerIfLow, ITEMS_TO_HOLD, LOOP_MS, MY_CHARACTERS, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop } from "../base/general.js"
import { attackTheseTypesPriest } from "../base/priest.js"
import { getTargetServer, SERVER_HOP_SERVERS } from "../base/serverhop.js"

/** Config */
const priestName = "earthPri2"

/** Characters */
let priest: AL.Priest

async function startPriest(bot: AL.Priest) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "shield": 2, "wcap": 2, "wshoes": 2 })
    startPartyLoop(bot, "earthPri2", MY_CHARACTERS)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            await attackTheseTypesPriest(bot, ["squigtoad", "squig"], [priest])
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    const squigtoadSpawn = bot.locateMonster("squigtoad")[0]
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


            if (bot.countItem("seashell") > 1000 || bot.hasItem("gem0") || bot.gold > 5_000_000) {
                await bot.smartMove("items0") // Move to bank teller to give bank time to get ready

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
            let nearest: AL.Entity
            let distance = Number.MAX_VALUE
            for (const squigtoad of bot.getEntities({
                couldGiveCredit: true,
                type: "squigtoad",
                willBurnToDeath: false,
                willDieToProjectiles: false
            })) {
                const d = AL.Tools.distance(bot, squigtoad)
                if (d < distance) {
                    nearest = squigtoad
                    distance = d
                }
            }
            if (nearest) {
                bot.smartMove(nearest, { getWithin: bot.range - nearest.speed }).catch(() => { /* Suppress errors */ })
            } else {
                // Look for squigs
                for (const squig of bot.getEntities({
                    couldGiveCredit: true,
                    type: "squig",
                    willBurnToDeath: false,
                    willDieToProjectiles: false
                })) {
                    const d = AL.Tools.distance(bot, squig)
                    if (d < distance) {
                        nearest = squig
                        distance = d
                    }
                }
                if (nearest) {
                    bot.smartMove(nearest, { getWithin: bot.range - nearest.speed }).catch(() => { /* Suppress errors */ })
                } else {
                    bot.smartMove(squigtoadSpawn).catch(() => { /* Suppress errors */ })
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
            const server = getTargetServer()
            priest = await AL.Game.startPriest(priestName, server[0], server[1])
            startPriest(priest)
        } catch (e) {
            console.error(e)
            if (priest) await priest.disconnect()
        }
        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
    }

    const disconnectLoop = async () => {
        try {
            if (priest) await priest.disconnect()
            priest = undefined
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