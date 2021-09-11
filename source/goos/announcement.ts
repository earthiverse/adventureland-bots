import AL from "alclient"
import { goToPoitonSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, goToNearestWalkableToMonster, ITEMS_TO_SELL, startPartyLoop } from "../base/general.js"
import { mainGoos } from "../base/locations.js"
import { partyLeader } from "../base/party.js"
import { attackTheseTypesRogue, startRSpeedLoop } from "../base/rogue.js"
import { getTargetServerFromMonsters } from "../base/serverhop.js"

/** Config */
const rogue1Name = "enlightening"
const default_region: AL.ServerRegion = "US"
const default_identifier: AL.ServerIdentifier = "III"
const targets: AL.MonsterName[] = ["cutebee", "goo"]
const defaultLocation: AL.IPosition = mainGoos

let rogue1: AL.Rogue

async function startRogue(bot: AL.Rogue, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "slimestaff": 2, "stinger": 2 })
    startRSpeedLoop(bot, { enableGiveToStrangers: true })
    startPartyLoop(bot, partyLeader)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesRogue(bot, targets, [rogue1])
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("quickpunch"), bot.getCooldown("quickstab")))))
    }
    attackLoop()

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

            goToNearestWalkableToMonster(bot, targets, { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }).catch((e) => { console.error(e) })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 500))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const startRogue1Loop = async (name: string) => {
        const connectLoop = async () => {
            try {
                const bestServer = await getTargetServerFromMonsters(AL.Game.G, default_region, default_identifier)
                if ((bestServer[0] == "US" && bestServer[1] == "II")
                    || (bestServer[0] == "US" && bestServer[1] == "I")) {
                    bestServer[0] = default_region
                    bestServer[1] = default_identifier
                }
                rogue1 = await AL.Game.startRogue(name, bestServer[0], bestServer[1])
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
    startRogue1Loop(rogue1Name)
}
run()