import AL from "alclient-mongo"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, goToBankIfFull } from "../base/general.js"
import { mainBeesNearTunnel } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"

/** Config */
const partyLeader = "facilitating"
const partyMembers = ["facilitating", "gratuitously", "hypothesized"]
const mage1Name = "facilitating"
const mage2Name = "gratuitously"
const mage3Name = "hypothesized"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"
const targets: AL.MonsterName[] = ["cutebee", "bee"]
const defaultLocation: AL.IPosition = mainBeesNearTunnel

let mage1: AL.Mage
let mage2: AL.Mage
let mage3: AL.Mage

async function startMage(bot: AL.Mage, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesMage(bot, targets, [mage1, mage2, mage3])
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
            await goToNPCShopIfFull(bot)
            await goToBankIfFull(bot)

            const destination: AL.IPosition = { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }
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

    // Start all characters
    console.log("Connecting...")
    const startMage1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                mage1 = await AL.Game.startMage(name, region, identifier)
                startMage(mage1)
            } catch (e) {
                console.error(e)
                if (mage1) await mage1.disconnect()
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (mage1) await mage1.disconnect()
                mage1 = undefined
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
    startMage1Loop(mage1Name, region, identifier)

    const startmage2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                mage2 = await AL.Game.startMage(name, region, identifier)
                startMage(mage2, { x: 25, y: 0 })
            } catch (e) {
                console.error(e)
                if (mage2) await mage2.disconnect()
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (mage2) await mage2.disconnect()
                mage2 = undefined
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
    startmage2Loop(mage2Name, region, identifier)

    const startmage3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                mage3 = await AL.Game.startMage(name, region, identifier)
                startMage(mage3, { x: -25, y: 0 })
            } catch (e) {
                console.error(e)
                if (mage3) await mage3.disconnect()
            }
            const msToNextSecondMinute = 120_000 - (Date.now() % 120_000)
            setTimeout(async () => { connectLoop() }, msToNextSecondMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (mage3) await mage3.disconnect()
                mage3 = undefined
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
    startmage3Loop(mage3Name, region, identifier)
}
run()