import AL, { Constants, IPosition, Mage, MonsterName, ServerIdentifier, ServerRegion, Tools } from "alclient"
import { goToPoitonSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, goToBankIfFull, ITEMS_TO_SELL, startSendStuffAllowlistLoop, ITEMS_TO_HOLD } from "../base/general.js"
import { mainBeesNearRats, offsetPosition } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"

/** Config */
const partyLeader = "facilitating"
const partyMembers = ["facilitating", "gratuitously", "hypothesized"]
const mage1Name = "facilitating"
const mage2Name = "gratuitously"
const mage3Name = "hypothesized"
const region: ServerRegion = "US"
const identifier: ServerIdentifier = "PVP"
const targets: MonsterName[] = ["bee"]
const defaultLocation: IPosition = mainBeesNearRats

let mage1: Mage
let mage2: Mage
let mage3: Mage
const friends: [Mage, Mage, Mage] = [undefined, undefined, undefined]

async function startMage(bot: Mage, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "beewings": 9999, "hpamulet": 2, "hpbelt": 2, "ringsj": 2, "stinger": 2 })

    // Send kouin wanderers things
    startSendStuffAllowlistLoop(bot, "kouin", ["wcap", "wshoes"], 999_999_999)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesMage(bot, targets, friends, { cburstWhenHPLessThan: 301 })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
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
            await goToBankIfFull(bot, ITEMS_TO_HOLD, 0)

            const destination: IPosition = offsetPosition(defaultLocation, positionOffset.x, positionOffset.y)
            if (AL.Tools.distance(bot, destination) > 1) await bot.smartMove(destination)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const startmage1Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                friends[0] = mage1
                startMage(mage1)
                mage1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage1) mage1.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startmage1Loop(mage1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startmage2Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                friends[1] = mage2
                startMage(mage2, { x: 25, y: 0 })
                mage2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage2) mage2.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startmage2Loop(mage2Name, region, identifier).catch(() => { /* ignore errors */ })

    const startmage3Loop = async (name: string, region: ServerRegion, identifier: ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage3) mage3.disconnect()
                mage3 = await AL.Game.startMage(name, region, identifier)
                friends[2] = mage3
                startMage(mage3, { x: -25, y: 0 })
                mage3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage3) mage3.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 2000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startmage3Loop(mage3Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()