import AL, { ServerIdentifier, ServerRegion, MonsterName, Mage } from "alclient"
import { goToNearestWalkableToMonster, ITEMS_TO_SELL, LOOP_MS, startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startScareLoop, startSellLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { Information } from "../definitions/bot.js"

const DEFAULT_REGION: ServerRegion = "EU"
const DEFAULT_IDENTIFIER: ServerIdentifier = "I"
const TARGETS: MonsterName[] = ["osnake", "snake", "greenjr"]

/** Config */
const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "lolwutpear",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "shoopdawhoop",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "ytmnd",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: undefined,
        nameAlt: undefined,
        target: undefined
    }
}
function startMage(bot: Mage) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, information.bot1.name, [information.bot1.name, information.bot2.name, information.bot3.name])
    startPontyLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "dexamulet": 1, "intamulet": 1, "stramulet": 1, "wbreeches": 1, "wgloves": 1 })
    startUpgradeLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesMage(bot, TARGETS, information.friends, { cburstWhenHPLessThan: 301 })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("cburst")))))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.id == information.bot1.name){
                await goToNearestWalkableToMonster(bot, TARGETS, { map: "halloween", x: -589, y: -335 })
            } else if (bot.id == information.bot2.name) {
                await goToNearestWalkableToMonster(bot, TARGETS, { map: "halloween", x: -488, y: -708 })
            } else {
                await goToNearestWalkableToMonster(bot, TARGETS, { map: "halloween", x: 347, y: -747 })
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

    // Start all characters
    console.log("Connecting...")

    const startMage1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                information.bot1.bot = await AL.Game.startMage(name, region, identifier)
                information.friends[1] = information.bot1.bot
                startMage(information.bot1.bot as Mage)
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) information.bot1.bot.disconnect()
                information.bot1.bot = undefined
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
        }

        const disconnectLoop = async () => {
            try {
                if (information.bot1.bot) information.bot1.bot.disconnect()
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
    startMage1Loop(information.bot1.name, DEFAULT_REGION, DEFAULT_IDENTIFIER)

    const startMage2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                information.bot2.bot = await AL.Game.startMage(name, region, identifier)
                information.friends[2] = information.bot2.bot
                startMage(information.bot2.bot as Mage)
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) information.bot2.bot.disconnect()
                information.bot2.bot = undefined
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
        }

        const disconnectLoop = async () => {
            try {
                if (information.bot2.bot) information.bot2.bot.disconnect()
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
    startMage2Loop(information.bot1.name, DEFAULT_REGION, DEFAULT_IDENTIFIER)

    const startMage3Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                information.bot3.bot = await AL.Game.startMage(name, region, identifier)
                information.friends[3] = information.bot3.bot
                startMage(information.bot3.bot as Mage)
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) information.bot3.bot.disconnect()
                information.bot3.bot = undefined
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 5000)
        }

        const disconnectLoop = async () => {
            try {
                if (information.bot3.bot) information.bot3.bot.disconnect()
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
    startMage3Loop(information.bot3.name, DEFAULT_REGION, DEFAULT_IDENTIFIER)
}
run()