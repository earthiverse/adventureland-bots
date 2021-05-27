import AL, { Tools } from "alclient-mongo"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startTrackerLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToNPCShopIfFull, goToPoitonSellerIfLow } from "../base/general.js"
import { partyLeader, partyMembers } from "./party.js"

/** Config */
const leaderName = partyLeader
const follower1Name = "earthWar2"
const follower2Name = "earthWar3"
const region: AL.ServerRegion = "ASIA"
const identifier: AL.ServerIdentifier = "I"
const targets: AL.MonsterName[] = ["tortoise"]
const LOOP_MS = 25

/** Characters */
let leader: AL.Warrior
let follower1: AL.Warrior
let follower2: AL.Warrior

/** CM Types */
type StompReadyCM = {
    type: "ready"
    ready: boolean
}
type StompOrderCM = {
    type: "stompOrder"
    order: string[]
}
type CM = StompReadyCM | StompOrderCM

async function startShared(bot: AL.Warrior) {
    function sendStompReady() {
        const stompReadyCM: StompReadyCM = {
            type: "ready",
            ready: bot.canUse("stomp")
        }
        bot.sendCM([partyLeader], stompReadyCM)
    }

    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startPontyLoop(bot)
    startSellLoop(bot)

    startUpgradeLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (!targets.includes(entity.type)) continue // Not a target
                    if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent
                    if (entity.willBurnToDeath()) continue // Will burn to death
                    if (!entity.s.stunned || entity.s.stunned.ms < ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is not stunned, or is about to be free, don't attack!

                    await bot.basicAttack(entity.id)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack")))
    }
    attackLoop()

    async function scareLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.isScared() && bot.canUse("scare")) {
                // Scare, because we are scared
                await bot.scare()
            } else if (bot.targets > 0 && bot.canUse("scare")) {
                for (const [, entity] of bot.entities) {
                    if (!entity.target || entity.target != bot.id) continue // Not targeting us
                    if (entity.s.stunned && entity.s.stunned.ms > ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is still stunned

                    // Scare, because we might run out of stun soon!
                    await bot.scare()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { scareLoop() }, Math.max(LOOP_MS, bot.getCooldown("scare")))
    }
    scareLoop()

    let stompOrder: string[] = []

    // TODO: Update with CMData type when ALClient gets updated
    bot.socket.on("cm", async (data: { name: string, message: string }) => {
        if (!partyMembers.has(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: CM = JSON.parse(data.message)
            if (decodedMessage.type == "stompOrder") {
                stompOrder = decodedMessage.order
            }
        } catch (e) {
            console.error(e)
        }
    })

    async function stompLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (stompOrder[0] == bot.id) {
                if (!bot.canUse("stomp")) {
                    // Uhh... it's our turn, but we're not ready?
                    sendStompReady()
                    setTimeout(async () => { stompLoop() }, Math.max(LOOP_MS, bot.getCooldown("stomp")))
                    return
                }

                for (const [, entity] of bot.entities) {
                    if (!targets.includes(entity.type)) continue // Not a target
                    if (entity.s.stunned && entity.s.stunned.ms > ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is still stunned
                    if (AL.Tools.distance(bot, entity) > bot.G.skills.stomp.range) continue // Too far to stomp

                    // It's our turn to stomp!
                    await bot.stomp()
                    sendStompReady()
                    setTimeout(async () => { sendStompReady() }, bot.G.skills.stomp.cooldown)
                    break
                }
            }

        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { stompLoop() }, Math.max(LOOP_MS, bot.getCooldown("stomp")))
    }
    stompLoop()

    function sendStompReadyLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            sendStompReady()
        } catch (e) {
            console.error(e)
        }
        setTimeout(() => { sendStompReadyLoop() }, bot.G.skills.stomp.duration)
    }
    sendStompReadyLoop()

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

            let closest: AL.Entity
            let distance = Number.MAX_VALUE
            for (const [, entity] of bot.entities) {
                if (!targets.includes(entity.type)) continue // Only attack our target
                if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                const d = Tools.distance(bot, entity)
                if (d < distance) {
                    closest = entity
                    distance = d
                }
            }

            if (!closest) {
                const destination: AL.IPosition = bot.locateMonster(targets[0])[0]
                if (AL.Tools.distance(bot, destination) > 1) await bot.smartMove(destination)
            } else if (AL.Tools.distance(bot, closest) > bot.range) {
                bot.smartMove(closest, { getWithin: bot.range / 2 }).catch(() => { /* suppress warnings */ })
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function startLeader(bot: AL.Warrior) {
    const readyToStomp = new Set<string>()

    startTrackerLoop(bot)

    bot.socket.on("cm", async (data: AL.CMData) => {
        if (!partyMembers.has(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: CM = JSON.parse(data.message)
            if (decodedMessage.type == "ready") {
                if (decodedMessage.ready) {
                    readyToStomp.add(data.name)
                } else {
                    readyToStomp.delete(data.name)
                }
            }
        } catch (e) {
            console.error(e)
        }
    })

    async function sendStompOrderLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const stompOrder: StompOrderCM = {
                type: "stompOrder",
                order: [...readyToStomp]
            }
            bot.sendCM([...readyToStomp], stompOrder)
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { sendStompOrderLoop() }, bot.G.skills.stomp.duration / 2)
    }
    sendStompOrderLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const startLeaderLoop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (leader) await leader.disconnect()
                leader = await AL.Game.startWarrior(name, region, identifier)
                startShared(leader)
                startLeader(leader)
                leader.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (leader) await leader.disconnect()
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
    startLeaderLoop(leaderName, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower1Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower1) await follower1.disconnect()
                follower1 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower1)
                follower1.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower1) await follower1.disconnect()
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
    startFollower1Loop(follower1Name, region, identifier).catch(() => { /* ignore errors */ })

    const startFollower2Loop = async (name: string, region: AL.ServerRegion, identifier: AL.ServerIdentifier) => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (follower2) await follower2.disconnect()
                follower2 = await AL.Game.startWarrior(name, region, identifier)
                startShared(follower2)
                follower2.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (follower2) await follower2.disconnect()
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
    startFollower2Loop(follower2Name, region, identifier).catch(() => { /* ignore errors */ })
}
run()