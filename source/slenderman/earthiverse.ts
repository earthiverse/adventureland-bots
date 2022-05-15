import AL, { CMData, DeathData, GameResponseData, IPosition, Rogue, MapName, Merchant, MonsterName, ServerIdentifier, ServerInfoData, ServerInfoDataLive, ServerRegion } from "alclient"
import { goToPotionSellerIfLow, startBuyLoop, startHealLoop, startLootLoop, startSellLoop, goToBankIfFull, ITEMS_TO_SELL, startPartyLoop, startScareLoop, startAvoidStacking, sleep, ITEMS_TO_HOLD, startSendStuffDenylistLoop, startCompoundLoop, startCraftLoop, startUpgradeLoop, LOOP_MS, startTrackerLoop } from "../base/general.js"
import { attackTheseTypesRogue } from "../base/rogue.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { getTargetServerFromCurrentServer } from "../base/serverhop.js"
import trilateration from "node-trilateration"
import { doBanking, doEmergencyBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"

/** Config */
let region: ServerRegion = "US"
let identifier: ServerIdentifier = "I"
const toLookFor: MonsterName[] = ["bat", "booboo", "mummy", "minimush", "snake", "stoneworm", "phoenix", "ghost", "jr", "xscorpion", "mrgreen"]
const extraToLook: IPosition[] = [{ map: "spookytown", x: -525, y: -715 }, { map: "halloween", x: 920, y: -120 }]

const toLookForMap: MapName = "halloween"
const merchantPosition: IPosition = { map: "main", x: 0, y: 0 }
const rogue1Name = "earthRog"
const rogue2Name = "earthRog2"
const rogue3Name = "earthRog3"
const merchantName = "earthMer"

let rogue1: Rogue
let rogue2: Rogue
let rogue3: Rogue
let merchant: Merchant

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

let slenderID: string
let slenderTrilateration: (IPosition & {distance: number})[] = [undefined, undefined, undefined]

async function sendSlenderIDLoop(bot: Rogue) {
    async function sendSlenderIDLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            if (slenderID) bot.sendCM(partyMembers, { slenderID: slenderID })
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("sendSlenderIDLoop", setTimeout(async () => { sendSlenderIDLoop() }, 5000))
    }
    sendSlenderIDLoop()
}

async function startRogue(bot: Rogue, trilaterationIndex: number) {
    const locations: IPosition[] = []
    for (const location of extraToLook) {
        if (location.map !== toLookForMap) continue
        locations.push(location)
    }
    for (const monster of toLookFor) {
        for (const location of bot.locateMonster(monster)) {
            if (location.map !== toLookForMap) continue
            locations.push(location)
        }
    }

    bot.socket.on("cm", (data: CMData) => {
        // Update SlenderID from party members
        if (!partyMembers.includes(data.name)) return
        const dataJSON = JSON.parse(data.message)
        if (dataJSON.slenderID) slenderID = dataJSON.slenderID
    })
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
                    if (!trilateration) continue
                    if (trilateration.map !== bot.map) {
                        // Found on a different map, clear the trilaterations
                        slenderTrilateration = [undefined, undefined, undefined]
                        break
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
    startSendStuffDenylistLoop(bot, [merchantName], ITEMS_TO_HOLD, 10_000_000)
    startPartyLoop(bot, partyLeader, partyMembers)

    async function trilaterationLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (slenderTrilateration[0] && slenderTrilateration[1] && slenderTrilateration[2]) {
                const map = slenderTrilateration[0].map
                const position: {x: number, y: number} = trilateration.calculate([slenderTrilateration[0], slenderTrilateration[1], slenderTrilateration[2]])
                if (AL.Pathfinder.canStand({ map: map, x: position.x, y: position.y })) {
                    console.log(`Slenderman trilaterated to ${map},${position.x},${position.y}.`)
                    const movingPromises: Promise<unknown>[] = []
                    for (const rogue of [rogue1, rogue2, rogue3]) {
                        if (!rogue) continue // Rogue isn't up
                        if (!rogue.s.invis) continue // Rogue isn't invisible
                        if (rogue.map !== toLookForMap) continue // Rogue isn't on the same map
                        movingPromises.push(rogue.smartMove(position))
                    }
                    await Promise.allSettled(movingPromises)
                    slenderTrilateration = [undefined, undefined, undefined]
                } else {
                    console.log(`Slenderman trilaterated to inside the wall @ ${map},${position.x},${position.y}.`)
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("trilaterationLoop", setTimeout(async () => { trilaterationLoop() }, 1000))
    }
    trilaterationLoop()

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const slenderman = bot.getEntity({ returnNearest: true, type: "slenderman" })
            if (slenderman) slenderID = slenderman.id

            await attackTheseTypesRogue(bot, ["slenderman"])

            // Trilateration attack
            if (slenderID && !bot.c.town && bot.canUse("attack")) {
                await bot.basicAttack(slenderID).catch(() => { /** Suppress errors */ })
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("burst"), bot.getCooldown("cburst")))))
    }
    attackLoop()

    async function invisLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.invis && bot.canUse("invis")) bot.invis()
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { invisLoop() }, Math.max(100, bot.getCooldown("invis"))))
    }
    invisLoop()

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

            const slenderman = bot.getEntity({ returnNearest: true, type: "slenderman" })
            if (slenderman) slenderID = slenderman.id

            if (!bot.s.invis) {
                // We aren't invisible, hang out at the spawn until we are
                if (!bot.smartMoving) bot.smartMove(toLookForMap)
            } else {
                // We are invisible, go look for Slender
                if (slenderman) {
                    // Go to slenderman
                    console.log(`Slenderman spotted at ${slenderman.map},${slenderman.x},${slenderman.y} with ${slenderman.hp}/${slenderman.max_hp} HP.`)
                    await bot.smartMove(slenderman)
                } else if (!bot.smartMoving || bot.map == "jail") {
                    // Go to a random location
                    bot.smartMove(locations[randomIntFromInterval(0, locations.length)]).catch(() => { /** Suppress warnings */ })
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

async function startMerchant(bot: Merchant) {
    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    startUpgradeLoop(bot)

    startMluckLoop(bot)
    startPartyLoop(bot, bot.id) // Let anyone who wants to party with me do so

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                await doEmergencyBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // mluck our friends
            if (bot.canUse("mluck", { ignoreCooldown: true })) {
                for (const friend of [rogue1, rogue2, rogue3]) {
                    if (!friend) continue
                    if (friend.id == bot.id) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.mluck.range) {
                            await bot.closeMerchantStand()
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await bot.smartMove(friend, { getWithin: bot.G.skills.mluck.range / 2 })
                        }

                        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            // get stuff from our friends
            for (const friend of [rogue1, rogue2, rogue3]) {
                if (!friend) continue
                if (friend.isFull()) {
                    await bot.smartMove(friend, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    lastBankVisit = Date.now()
                    await doBanking(bot)
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }
            }

            // Go fishing if we can
            await goFishing(bot)
            if (!bot.isOnCooldown("fishing") && (bot.hasItem("rod") || bot.isEquipped("rod"))) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Go mining if we can
            await goMining(bot)
            if (!bot.isOnCooldown("mining") && (bot.hasItem("pickaxe") || bot.isEquipped("pickaxe"))) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if ((bot.id == "earthMer" || bot.id == "earthMer2") && bot.canUse("mluck", { ignoreCooldown: true })) {
                // MLuck people if there is a server info target
                for (const mN in bot.S) {
                    const type = mN as MonsterName
                    if (!bot.S[type].live) continue
                    if (!(bot.S[type] as ServerInfoDataLive).target) continue
                    if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                    if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 100) {
                        await bot.closeMerchantStand()
                        await bot.smartMove((bot.S[type] as IPosition), { getWithin: 100 })
                    }

                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }

                // Find other characters that need mluck and go find them
                const charactersToMluck = await AL.PlayerModel.find({
                    $or: [{ "s.mluck": undefined },
                        { "s.mluck.f": { "$ne": bot.id }, "s.mluck.strong": undefined }],
                    lastSeen: { $gt: Date.now() - 120000 },
                    serverIdentifier: bot.server.name,
                    serverRegion: bot.server.region },
                {
                    _id: 0,
                    map: 1,
                    name: 1,
                    x: 1,
                    y: 1
                }).lean().exec()
                for (const stranger of charactersToMluck) {
                    // Move to them, and we'll automatically mluck them
                    if (AL.Tools.distance(bot, stranger) > bot.G.skills.mluck.range) {
                        await bot.closeMerchantStand()
                        console.log(`[merchant] We are moving to ${stranger.name} to mluck them!`)
                        await bot.smartMove(stranger, { getWithin: bot.G.skills.mluck.range / 2 })
                    }

                    setTimeout(async () => { moveLoop() }, 250)
                    return
                }
            }

            // Hang out in town
            await bot.smartMove(merchantPosition)
            await bot.openMerchantStand()
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
    const startRogue1Loop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (rogue1) rogue1.disconnect()
                rogue1 = await AL.Game.startRogue(name, region, identifier)
                startRogue(rogue1, 0)
                startTrackerLoop(rogue1)
                sendSlenderIDLoop(rogue1)
                rogue1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (rogue1) rogue1.disconnect()
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
    startRogue1Loop(rogue1Name).catch(() => { /* ignore errors */ })

    const startRogue2Loop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (rogue2) rogue2.disconnect()
                rogue2 = await AL.Game.startRogue(name, region, identifier)
                startRogue(rogue2, 1)
                rogue2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (rogue2) rogue2.disconnect()
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
    startRogue2Loop(rogue2Name).catch(() => { /* ignore errors */ })

    const startRogue3Loop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (rogue3) rogue3.disconnect()
                rogue3 = await AL.Game.startRogue(name, region, identifier)
                startRogue(rogue3, 2)
                rogue3.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (rogue3) rogue3.disconnect()
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
    startRogue3Loop(rogue3Name).catch(() => { /* ignore errors */ })

    const startMerchantLoop = async (name: string) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (merchant) merchant.disconnect()
                merchant = await AL.Game.startMerchant(name, region, identifier)
                startMerchant(merchant)
                merchant.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (merchant) merchant.disconnect()
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
    startMerchantLoop(merchantName).catch(() => { /* ignore errors */ })

    let lastServerChangeTime = Date.now()
    const serverLoop = async () => {
        try {
            // We haven't logged in yet
            if (!rogue1) {
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers too fast
            if (lastServerChangeTime > Date.now() - AL.Constants.RECONNECT_TIMEOUT_MS) {
                setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime + AL.Constants.RECONNECT_TIMEOUT_MS - Date.now()))
                return
            }

            // Don't change servers if slender is live, and we haven't spent a lot of time on the server looking for him
            if (rogue1.S?.slenderman && rogue1.S.slenderman.live && lastServerChangeTime > (Date.now() - 900_000)) {
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            const currentRegion = rogue1.serverData.region
            const currentIdentifier = rogue1.serverData.name

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

            // Sleep to give a chance to loot
            await sleep(5000)

            // Disconnect everyone
            console.log("Disconnecting characters")
            lastServerChangeTime = Date.now()
            rogue1.disconnect()
            rogue2?.disconnect()
            rogue3?.disconnect()
            merchant?.disconnect()
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