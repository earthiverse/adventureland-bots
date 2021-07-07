import AL from "alclient-mongo"
import { goToPoitonSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, goToNearestWalkableToMonster, ITEMS_TO_SELL } from "../base/general.js"
import { mainBeesNearTunnel } from "../base/locations.js"
import { attackTheseTypesRogue } from "../base/rogue.js"

/** Config */
const rogue1Name = "earthRog"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "III"
const targets: AL.MonsterName[] = ["cutebee", "bee"]
const defaultLocation: AL.IPosition = mainBeesNearTunnel

let rogue1: AL.Rogue

async function startRogue(bot: AL.Rogue, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "stinger": 2 })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesRogue(bot, targets, [rogue1])
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("quickstab")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            await goToPoitonSellerIfLow(bot)
            await goToBankIfFull(bot)

            await goToNearestWalkableToMonster(bot, targets, { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y })
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

    // Start all characters
    console.log("Connecting...")
    const startRogue1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                rogue1 = await AL.Game.startRogue(name, region, identifier)
                startRogue(rogue1)
            } catch (e) {
                console.error(e)
                if (rogue1) await rogue1.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (rogue1) await rogue1.disconnect()
                rogue1 = undefined
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
    startRogue1Loop(rogue1Name, region, identifier)
}
run()