import AL from "alclient-mongo"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startAvoidStacking, goToNearestWalkableToMonster } from "../base/general.js"
import { mainScorpions } from "../base/locations.js"
import { attackTheseTypesWarrior, startChargeLoop, startWarcryLoop } from "../base/warrior.js"

/** Config */
const partyLeader = "fgsfds"
const partyMembers = ["fgsfds", "fsjal", "funny"]
const warrior1Name = "fgsfds"
const warrior2Name = "fsjal"
const warrior3Name = "funny"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"
const targets: AL.MonsterName[] = ["scorpion"]
const defaultLocation: AL.IPosition = mainScorpions

let warrior1: AL.Warrior
let warrior2: AL.Warrior
let warrior3: AL.Warrior

async function startWarrior(bot: AL.Warrior, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesWarrior(bot, targets, [warrior1, warrior2, warrior3])
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    startAvoidStacking(bot)
    startChargeLoop(bot)

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
            await goToNPCShopIfFull(bot)

            goToNearestWalkableToMonster(bot, targets, { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    startWarcryLoop(bot)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const startWarrior1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                warrior1 = await AL.Game.startWarrior(name, region, identifier)
                startWarrior(warrior1)
            } catch (e) {
                console.error(e)
                if (warrior1) await warrior1.disconnect()
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (warrior1) await warrior1.disconnect()
                warrior1 = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { disconnectLoop() }, msToNextSecondMinute - 10000 < 0 ? msToNextSecondMinute + 110_000 : msToNextSecondMinute - 10000)
        }

        const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
        setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        setTimeout(async () => { disconnectLoop() }, msToNextSecondMinute - 10000 < 0 ? msToNextSecondMinute + 110_000 : msToNextSecondMinute - 10000)
    }
    startWarrior1Loop(warrior1Name, region, identifier)

    const startwarrior2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                warrior2 = await AL.Game.startWarrior(name, region, identifier)
                startWarrior(warrior2)
            } catch (e) {
                console.error(e)
                if (warrior2) await warrior2.disconnect()
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (warrior2) await warrior2.disconnect()
                warrior2 = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { disconnectLoop() }, msToNextSecondMinute - 10000 < 0 ? msToNextSecondMinute + 110_000 : msToNextSecondMinute - 10000)
        }

        const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
        setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        setTimeout(async () => { disconnectLoop() }, msToNextSecondMinute - 10000 < 0 ? msToNextSecondMinute + 110_000 : msToNextSecondMinute - 10000)
    }
    startwarrior2Loop(warrior2Name, region, identifier)

    const startwarrior3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                warrior3 = await AL.Game.startWarrior(name, region, identifier)
                startWarrior(warrior3)
            } catch (e) {
                console.error(e)
                if (warrior3) await warrior3.disconnect()
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (warrior3) await warrior3.disconnect()
                warrior3 = undefined
            } catch (e) {
                console.error(e)
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { disconnectLoop() }, msToNextSecondMinute - 10000 < 0 ? msToNextSecondMinute + 110_000 : msToNextSecondMinute - 10000)
        }

        const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
        setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        setTimeout(async () => { disconnectLoop() }, msToNextSecondMinute - 10000 < 0 ? msToNextSecondMinute + 110_000 : msToNextSecondMinute - 10000)
    }
    startwarrior3Loop(warrior3Name, region, identifier)
}
run()