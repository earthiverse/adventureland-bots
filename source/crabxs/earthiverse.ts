import AL, { MonsterName, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { goToPotionSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, goToNearestWalkableToMonster, ITEMS_TO_SELL, startScareLoop } from "../base/general.js"
import { attackTheseTypesWarrior, startChargeLoop, startWarcryLoop } from "../base/warrior.js"

/** Config */
const warriorName = "earthWar3"
const region: ServerRegion = "ASIA"
const identifier: ServerIdentifier = "I"
const targets: MonsterName[] = ["crabx"]

let warrior: Warrior

async function startWarrior(bot: Warrior) {
    startChargeLoop(bot)
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "stinger": 2 })
    startWarcryLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.isOnCooldown("scare")) {
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("scare"))))
                return
            }

            await attackTheseTypesWarrior(bot, targets, [warrior])
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    const crabXSpawn = bot.locateMonster("crabx")[0]
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            await goToPotionSellerIfLow(bot)
            await goToBankIfFull(bot)

            await goToNearestWalkableToMonster(bot, targets, crabXSpawn)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const startWarriorLoop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                warrior = await AL.Game.startWarrior(name, region, identifier)
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
    startWarriorLoop(warriorName, region, identifier)
}
run()