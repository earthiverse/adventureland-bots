import AL from "alclient"
import { goToPoitonSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, goToNearestWalkableToMonster, ITEMS_TO_SELL, startPartyLoop } from "../base/general.js"
import { halloweenMiniMushes, offsetPosition } from "../base/locations.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesRogue, startRSpeedLoop } from "../base/rogue.js"

/** Config */
const rogue1Name = "enlightening"
const priest1Name = "illumination"
const ranger1Name = "journalistic"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "I"
const targets: AL.MonsterName[] = ["minimush", "phoenix"]
const defaultLocation: AL.IPosition = halloweenMiniMushes

let rogue1: AL.Rogue
let priest1: AL.Priest
let ranger1: AL.Ranger
const friends: AL.Character[] = [undefined, undefined, undefined]

async function startRanger(bot: AL.Ranger, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, rogue1Name, [rogue1Name, priest1Name, ranger1Name])
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "stinger": 2 })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesRanger(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))))
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

            await goToNearestWalkableToMonster(bot, targets, offsetPosition(defaultLocation, positionOffset.x, positionOffset.y))
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
    }
    moveLoop()
}

async function startPriest(bot: AL.Priest, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startDarkBlessingLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, rogue1Name, [rogue1Name, priest1Name, ranger1Name])
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "stinger": 2 })
    startPartyHealLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesPriest(bot, targets, friends)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack")))))
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

            await goToNearestWalkableToMonster(bot, targets, offsetPosition(defaultLocation, positionOffset.x, positionOffset.y))
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
    }
    moveLoop()
}

async function startRogue(bot: AL.Rogue, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, rogue1Name, [rogue1Name, priest1Name, ranger1Name])
    startSellLoop(bot, { ...ITEMS_TO_SELL, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "stinger": 2 })
    startRSpeedLoop(bot, { enableGiveToStrangers: true })

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            await attackTheseTypesRogue(bot, targets, friends)
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

            goToNearestWalkableToMonster(bot, targets, offsetPosition(defaultLocation, positionOffset.x, positionOffset.y)).catch(e => console.error(e))
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
                friends[0] = rogue1
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

    const startPriest1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                priest1 = await AL.Game.startPriest(name, region, identifier)
                friends[1] = priest1
                startPriest(priest1)
            } catch (e) {
                console.error(e)
                if (priest1) await priest1.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (priest1) await priest1.disconnect()
                priest1 = undefined
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
    startPriest1Loop(priest1Name, region, identifier)

    const startRanger1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        const connectLoop = async () => {
            try {
                ranger1 = await AL.Game.startRanger(name, region, identifier)
                friends[2] = ranger1
                startRanger(ranger1)
            } catch (e) {
                console.error(e)
                if (ranger1) await ranger1.disconnect()
            }
            const msToNextMinute = 60_000 - (Date.now() % 60_000)
            setTimeout(async () => { connectLoop() }, msToNextMinute + 10000)
        }

        const disconnectLoop = async () => {
            try {
                if (ranger1) await ranger1.disconnect()
                ranger1 = undefined
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
    startRanger1Loop(ranger1Name, region, identifier)
}
run()