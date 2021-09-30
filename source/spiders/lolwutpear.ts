import AL, { MonsterName } from "alclient"
import { goToBankIfFull, goToNearestWalkableToMonster, goToPoitonSellerIfLow, startAvoidStacking, startBuyLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop } from "../base/general.js"
import { mainSpiders, offsetPosition } from "../base/locations.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { getTargetServerFromPlayer } from "../base/serverhop.js"
import { attackTheseTypesWarrior, startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { Information } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION } from "../monsterhunt/shared.js"

let TARGET_REGION = DEFAULT_REGION
let TARGET_IDENTIFIER = DEFAULT_IDENTIFIER
const defaultLocation = mainSpiders
const targets: MonsterName[] = ["spider", "phoenix"]

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

    // Default Equipment
    const fireBlade1 = bot.locateItem("fireblade", bot.items, { locked: true })
    if (fireBlade1 !== undefined) await bot.equip(fireBlade1, "offhand")
    const fireBlade2 = bot.locateItem("fireblade", bot.items, { locked: true })
    if (fireBlade2 !== undefined) await bot.equip(fireBlade2, "mainhand")
    const testOrb = bot.locateItem("test_orb", bot.items)
    if (testOrb !== undefined) await bot.equip(testOrb, "orb")

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
        const loopBot = async () => {
            const connectLoop = async () => {
                try {
                    if (information.bot1.bot) await information.bot1.bot.disconnect()
                    information.bot1.bot = await AL.Game.startWarrior(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                    information.friends[1] = information.bot1.bot
                    startWarrior(information.bot1.bot as AL.Warrior)
                } catch (e) {
                    console.error(e)
                    if (information.bot1.bot) await information.bot1.bot.disconnect()
                    information.bot1.bot = undefined
                }
                const msToNextMinute = 60_000 - (Date.now() % 60_000)
                setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
            }

            const disconnectLoop = async () => {
                try {
                    if (information.bot1.bot) await information.bot1.bot.disconnect()
                    information.bot1.bot = undefined
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
        loopBot()
    }
    startWarrior1Loop().catch(() => { /* ignore errors */ })

    const startWarrior2Loop = async () => {
        const loopBot = async () => {
            const connectLoop = async () => {
                try {
                    if (information.bot2.bot) await information.bot2.bot.disconnect()
                    information.bot2.bot = await AL.Game.startWarrior(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                    information.friends[2] = information.bot2.bot
                    startWarrior(information.bot2.bot as AL.Warrior)
                } catch (e) {
                    console.error(e)
                    if (information.bot2.bot) await information.bot2.bot.disconnect()
                    information.bot2.bot = undefined
                }
                const msToNextMinute = 60_000 - (Date.now() % 60_000)
                setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
            }

            const disconnectLoop = async () => {
                try {
                    if (information.bot2.bot) await information.bot2.bot.disconnect()
                    information.bot2.bot = undefined
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
        loopBot()
    }
    startWarrior2Loop().catch(() => { /* ignore errors */ })

    const startWarrior3Loop = async () => {
        const loopBot = async () => {
            const connectLoop = async () => {
                try {
                    if (information.bot3.bot) await information.bot3.bot.disconnect()
                    information.bot3.bot = await AL.Game.startWarrior(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                    information.friends[3] = information.bot3.bot
                    startWarrior(information.bot3.bot as AL.Warrior)
                } catch (e) {
                    console.error(e)
                    if (information.bot3.bot) await information.bot3.bot.disconnect()
                    information.bot3.bot = undefined
                }
                const msToNextMinute = 60_000 - (Date.now() % 60_000)
                setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
            }

            const disconnectLoop = async () => {
                try {
                    if (information.bot3.bot) await information.bot3.bot.disconnect()
                    information.bot3.bot = undefined
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
        loopBot()
    }
    startWarrior3Loop().catch(() => { /* ignore errors */ })

    const targetServerLoop = async () => {
        try {
            const targetServer = await getTargetServerFromPlayer(TARGET_REGION, TARGET_IDENTIFIER, partyLeader)

            if (targetServer[0] == "US" && targetServer[1] == "III") {
                // Avoid this server
                setTimeout(async () => { targetServerLoop() }, 1000)
                return
            }

            // Change servers to attack this entity
            TARGET_REGION = targetServer[0]
            TARGET_IDENTIFIER = targetServer[1]
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { targetServerLoop() }, 1000)
    }
    targetServerLoop()
}
run()