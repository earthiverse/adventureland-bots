import AL from "alclient"
import { startTrackerLoop, sleep, goToBankIfFull, goToNearestWalkableToMonster, goToPoitonSellerIfLow, startAvoidStacking, startBuyLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop } from "../base/general.js"
import { mainScorpions, offsetPosition } from "../base/locations"
import { partyLeader, partyMembers } from "../base/party"
import { getTargetServerFromPlayer } from "../base/serverhop.js"
import { attackTheseTypesWarrior, startChargeLoop, startWarcryLoop } from "../base/warrior"
import { targets } from "../crabs/runners.js"
import { Information } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION } from "../monsterhunt/shared"

let TARGET_REGION = DEFAULT_REGION
let TARGET_IDENTIFIER = DEFAULT_IDENTIFIER
const TARGET_PLAYER = partyLeader
const defaultLocation = mainScorpions

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "fgsfds",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "fsjal",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "funny",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "orlyowl",
        nameAlt: "orlyowl",
        target: undefined
    }
}

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
            await attackTheseTypesWarrior(bot, targets, information.friends, { disableAgitate: true })
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
            await goToBankIfFull(bot)

            await goToNearestWalkableToMonster(bot, targets, offsetPosition(defaultLocation, positionOffset.x, positionOffset.y))
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

    const startWarrior1Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) await information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startWarrior(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[1] = information.bot1.bot
                startWarrior(information.bot1.bot as AL.Warrior)
                startTrackerLoop(information.bot1.bot)
                information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) await information.bot1.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startWarrior1Loop().catch(() => { /* ignore errors */ })

    const startWarrior2Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) await information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startWarrior(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                startWarrior(information.bot2.bot as AL.Warrior)
                information.bot2.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) await information.bot2.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startWarrior2Loop().catch(() => { /* ignore errors */ })

    const startWarrior3Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) await information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startWarrior(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[3] = information.bot3.bot
                startWarrior(information.bot3.bot as AL.Warrior)
                information.bot3.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) await information.bot3.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startWarrior3Loop().catch(() => { /* ignore errors */ })

    let lastServerChangeTime = Date.now()
    const serverLoop = async () => {
        try {
            // We haven't logged in yet
            if (!information.bot1.bot) {
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers too fast
            if (lastServerChangeTime > Date.now() - 60_000) {
                setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime + AL.Constants.RECONNECT_TIMEOUT_MS - Date.now()))
                return
            }

            const currentRegion = information.bot1.bot.server.region
            const currentIdentifier = information.bot1.bot.server.name

            const targetServer = await getTargetServerFromPlayer(TARGET_REGION, TARGET_IDENTIFIER, TARGET_PLAYER)
            if (currentRegion == targetServer[0] && currentIdentifier == targetServer[1]) {
                // We're already on the correct server
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            if (targetServer[0] == "US" && targetServer[1] == "III") {
                // Avoid this server
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Change servers to attack this entity
            TARGET_REGION = targetServer[0]
            TARGET_IDENTIFIER = targetServer[1]
            console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${TARGET_REGION} ${TARGET_IDENTIFIER}`)

            // Loot all of our remaining chests
            await sleep(1000)
            for (const [, chest] of information.bot1.bot?.chests) await information.bot1.bot.openChest(chest.id)
            await sleep(1000)

            // Disconnect everyone
            await Promise.race([Promise.allSettled([
                information.bot1.bot?.disconnect(),
                information.bot2.bot?.disconnect(),
                information.bot3.bot?.disconnect(),
                information.merchant.bot?.disconnect()
            ]), new Promise((_resolve, reject) => { setTimeout(reject, 30_000, "Bots didn't disconnect within 30s") })])
            await sleep(5000)
            lastServerChangeTime = Date.now()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { serverLoop() }, 1000)
    }
    serverLoop()
}
run()