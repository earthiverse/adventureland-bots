import AL, { DeathData, GameResponseData, IPosition, Mage, MapName, MonsterName, ServerIdentifier, ServerInfoData, ServerRegion } from "alclient"
import { goToPotionSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, ITEMS_TO_SELL, startPartyLoop, startScareLoop, startAvoidStacking, sleep } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { getTargetServerFromCurrentServer } from "../base/serverhop.js"
import trilateration from "node-trilateration"

/** Config */
let region: ServerRegion = "EU"
let identifier: ServerIdentifier = "II"
const toLookForMap: MapName = "cave"
const toLookFor: MonsterName[] = ["bat", "minimush", "snake", "stoneworm", "phoenix", "ghost", "jr", "xscorpion", "mrgreen"]
const extraToLook: IPosition[] = [{ map: "spookytown", x: 250, y: -1129 }, { map: "spookytown", x: -525, y: -715 }, { map: "halloween", x: 920, y: -120 }]
const toAttack: MonsterName[] = ["bat", "bee", "goo", "goldenbat", "minimush", "snake", "scorpion", "stoneworm", "osnake", "jr", "greenjr"]

const mage1Name = "facilitating"
const mage2Name = "gratuitously"
const mage3Name = "hypothesized"

let mage1: Mage
let mage2: Mage
let mage3: Mage

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

let slenderID: string
let slenderTrilateration: (IPosition & {distance: number})[] = [undefined, undefined, undefined]

async function startMage(bot: Mage, trilaterationIndex: number) {
    const locations: IPosition[] = extraToLook
    for (const monster of toLookFor) {
        for (const location of bot.locateMonster(monster)) {
            if (location.map !== toLookForMap) continue
            locations.push(location)
        }
    }

    bot.socket.on("death", (data: DeathData) => {
        if (data.id == slenderID) {
            // Clear Slender Data
            slenderID = undefined
            slenderTrilateration = [undefined, undefined, undefined]
        }
    })
    bot.socket.on("server_info", (data: ServerInfoData) => {
        if (data.slenderman && !data.slenderman.live) {
            // Clear Slender Data
            slenderID = undefined
            slenderTrilateration = [undefined, undefined, undefined]
        }
    })
    bot.socket.on("game_response", (data: GameResponseData) => {
        if (typeof data == "object") {
            if (data.response == "too_far" && data.id == slenderID) {
                for (const trilateration of slenderTrilateration) {
                    if (trilateration.map !== bot.map) {
                        // Found on a different map, clear the trilaterations
                        slenderTrilateration = [undefined, undefined, undefined]
                    }
                }
                slenderTrilateration[trilaterationIndex] = { distance: data.dist, map: bot.map, x: bot.x, y: bot.y }
            }
        }
    })

    startAvoidStacking(bot)
    startBuyLoop(bot, new Set())
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot, { ...ITEMS_TO_SELL, "wbook0": 2 })
    startPartyLoop(bot, partyLeader, partyMembers)

    async function trilaterationLoop() {
        try {
            if (slenderTrilateration[0] && slenderTrilateration[1] && slenderTrilateration[2]) {
                const map = slenderTrilateration[0].map
                const position: {x: number, y: number} = trilateration.calculate([slenderTrilateration[0], slenderTrilateration[1], slenderTrilateration[2]])
                console.log(`Slenderman trilaterated to ${map},${position.x},${position.y}.`)
                for (const mage of [mage1, mage2, mage3]) {
                    if (!mage) continue // Mage isn't up
                    if (mage.map !== toLookForMap) continue // Mage isn't on the same map
                    if (mage.canUse("blink")) {
                        if (AL.Pathfinder.canStand({ map: map, x: position.x, y: position.y })) {
                            mage.blink(position.x, position.y).catch(() => { /** Suppress warnings */ })
                        } else {
                            mage.move(position.x, position.y, { disableSafetyCheck: true }).catch(() => { /** Suppress warnings */ })
                        }
                    }
                    if (mage.canUse("attack")) mage.basicAttack(slenderID).catch(() => { /** Suppress warnings */ })
                    if (mage.canUse("burst")) mage.burst(slenderID).catch(() => { /** Suppress warnings */ })
                }
                slenderTrilateration = [undefined, undefined, undefined]
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { trilaterationLoop() }, 1000))
    }
    trilaterationLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const slenderman = bot.getNearestMonster("slenderman")?.monster
            if (slenderman) slenderID = slenderman.id
            if (slenderman && AL.Tools.distance(bot, slenderman) <= bot.range) {
                // NOTE: We are bursting in the move loop, because we can do it really fast there
                if (bot.canUse("attack")) await bot.basicAttack(slenderman.id).catch(() => { /** Suppress warnings */ })
            } else {
                await attackTheseTypesMage(bot, toAttack, [], { disableCburst: true, disableEnergize: true })
            }

            if (slenderID && !bot.c.town && bot.canUse("attack")) {
                await bot.basicAttack(slenderID).catch(() => { /** Suppress errors */ })
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("burst"), bot.getCooldown("cburst")))))
    }
    attackLoop()

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

            const slenderman = bot.getNearestMonster("slenderman")?.monster
            if (slenderman) slenderID = slenderman.id
            if (slenderman && AL.Tools.distance(bot, slenderman) > bot.range) {
                console.log(`Slenderman spotted at ${slenderman.map},${slenderman.x},${slenderman.y} with ${slenderman.hp}/${slenderman.max_hp} HP.`)
                if (bot.canUse("blink")) {
                    if (AL.Pathfinder.canStand(slenderman)) {
                        bot.blink(slenderman.x, slenderman.y).catch(() => { /** Suppress warnings */ })
                    } else {
                        bot.move(slenderman.x, slenderman.y, { disableSafetyCheck: true }).catch(() => { /** Suppress warnings */ })
                    }
                }
                if (bot.canUse("attack")) bot.basicAttack(slenderman.id).catch(() => { /** Suppress warnings */ })
                if (bot.canUse("burst")) bot.burst(slenderman.id).catch(() => { /** Suppress warnings */ })
            } else if (!bot.smartMoving || bot.map == "jail") {
                bot.smartMove(locations[randomIntFromInterval(0, locations.length)]).catch(() => { /** Suppress warnings */ })
            }
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
    const startMage1Loop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage1) mage1.disconnect()
                mage1 = await AL.Game.startMage(name, region, identifier)
                startMage(mage1, 0)
                mage1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage1) mage1.disconnect()
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
    startMage1Loop(mage1Name).catch(() => { /* ignore errors */ })

    const startMage2Loop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage2) mage2.disconnect()
                mage2 = await AL.Game.startMage(name, region, identifier)
                startMage(mage2, 1)
                mage2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage2) mage2.disconnect()
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
    startMage2Loop(mage2Name).catch(() => { /* ignore errors */ })

    const startMage3Loop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (mage3) mage3.disconnect()
                mage3 = await AL.Game.startMage(name, region, identifier)
                startMage(mage3, 2)
                mage3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (mage3) mage3.disconnect()
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
    startMage3Loop(mage3Name).catch(() => { /* ignore errors */ })

    let lastServerChangeTime = Date.now()
    const serverLoop = async () => {
        try {
            // We haven't logged in yet
            if (!mage1) {
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers too fast
            if (lastServerChangeTime > Date.now() - AL.Constants.RECONNECT_TIMEOUT_MS) {
                setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime + AL.Constants.RECONNECT_TIMEOUT_MS - Date.now()))
                return
            }

            // Don't change servers if slender is live, and we haven't spent a lot of time on the server looking for him
            if (mage1.S?.slenderman && mage1.S.slenderman.live && lastServerChangeTime > (Date.now() - 900_000)) {
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            const currentRegion = mage1.server.region
            const currentIdentifier = mage1.server.name

            const targetServer = getTargetServerFromCurrentServer(currentRegion, currentIdentifier, true)
            if (currentRegion == targetServer[0] && currentIdentifier == targetServer[1]) {
                // We're already on the correct server
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            slenderID = undefined

            // Change servers to attack this entity
            region = targetServer[0]
            identifier = targetServer[1]
            console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${region} ${identifier}`)

            // Loot all of our remaining chests
            await sleep(1000)
            console.log("Looting remaining chests")
            for (const [, chest] of mage1.chests) await mage1.openChest(chest.id)
            await sleep(1000)

            // Disconnect everyone
            console.log("Disconnecting characters")
            mage1.disconnect()
            mage2?.disconnect()
            mage3?.disconnect()
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