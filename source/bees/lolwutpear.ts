import AL from "alclient-mongo"
import { goToPoitonSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, goToBankIfFull, ITEMS_TO_SELL } from "../base/general.js"
import { mainBeesNearTunnel } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"

/** Config */
const partyLeader = "lolwutpear"
const partyMembers = ["lolwutpear", "shoopdawhoop", "ytmnd"]
const mage1Name = "lolwutpear"
const mage2Name = "shoopdawhoop"
const mage3Name = "ytmnd"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"
const targets: AL.MonsterName[] = ["cutebee", "bee"]
const defaultLocation: AL.IPosition = mainBeesNearTunnel

let mage1: AL.Mage
let mage2: AL.Mage
let mage3: AL.Mage
const friends: [AL.Mage, AL.Mage, AL.Mage] = [undefined, undefined, undefined]

async function startMage(bot: AL.Mage, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "stinger": 2 })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesMage(bot, targets, friends)
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
                friends[0] = mage1
                startMage(mage1)
            } catch (e) {
                console.error(e)
                if (mage1) await mage1.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (mage1) await mage1.disconnect()
                mage1 = undefined
                friends[0] = undefined
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
    startMage1Loop(mage1Name, region, identifier)

    const startmage2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                mage2 = await AL.Game.startMage(name, region, identifier)
                friends[1] = mage2
                startMage(mage2, { x: 25, y: 0 })
            } catch (e) {
                console.error(e)
                if (mage2) await mage2.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (mage2) await mage2.disconnect()
                mage2 = undefined
                friends[1] = undefined
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
    startmage2Loop(mage2Name, region, identifier)

    const startmage3Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                mage3 = await AL.Game.startMage(name, region, identifier)
                friends[2] = mage3
                startMage(mage3, { x: -25, y: 0 })
            } catch (e) {
                console.error(e)
                if (mage3) await mage3.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (mage3) await mage3.disconnect()
                friends[2] = undefined
                mage3 = undefined
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
    startmage3Loop(mage3Name, region, identifier)
}
run()