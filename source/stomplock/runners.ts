import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startTrackerLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull } from "../base/general.js"
import { partyLeader, partyMembers } from "./party.js"

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "II"

const targets: AL.MonsterName[] = ["redfairy", "greenfairy", "bluefairy"]
const LOOP_MS = 10

/** CM Types */
type StompReadyCM = {
    type: "ready"
    ready: boolean
}
type StompOrderCM = {
    type: "stompOrder"
    playerOrder: string[]
    entityOrder: string[]
}
type CM = StompOrderCM | StompReadyCM

export async function startShared(bot: AL.Warrior): Promise<void> {
    let stompOrder: string[] = []
    let entityOrder: string[] = []

    function sendStompReady() {
        const stompReadyCM: StompReadyCM = {
            ready: bot.canUse("stomp"),
            type: "ready"
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

            if (bot.isOnCooldown("scare")) {
                setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("scare")))
                return
            }

            if (bot.canUse("attack")) {
                for (const entityID of entityOrder) {
                    const entity = bot.entities.get(entityID)
                    if (!entity) continue // Entity died?
                    if (!targets.includes(entity.type)) continue // Not a target
                    if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent
                    if (entity.willBurnToDeath()) continue // Will burn to death
                    if (!entity.s.stunned || entity.s.stunned.ms < ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is not stunned, or is about to be free, don't attack!

                    await bot.basicAttack(entity.id)
                    break
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
                for (const entityID of entityOrder) {
                    const entity = bot.entities.get(entityID)
                    if (!entity) continue // Entity died?
                    if (!entity.target || entity.target != bot.id) continue // Not targeting us
                    if (entity.s.stunned && entity.s.stunned.ms > ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is still stunned

                    // Scare, because we might run out of stun soon!
                    await bot.scare()
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { scareLoop() }, Math.max(LOOP_MS, bot.getCooldown("scare")))
    }
    scareLoop()

    bot.socket.on("cm", async (data: AL.CMData) => {
        if (!partyMembers.includes(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: CM = JSON.parse(data.message)
            if (decodedMessage.type == "stompOrder") {
                stompOrder = decodedMessage.playerOrder
                entityOrder = decodedMessage.entityOrder
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

                for (const entityID of entityOrder) {
                    const entity = bot.entities.get(entityID)
                    if (!entity) continue // Entity died?
                    if (!targets.includes(entity.type)) continue // Not a target
                    if (entity.s.stunned) {
                        // Check if enemy is still stunned long enough
                        if (entity.s.stunned.ms >= Math.min((LOOP_MS + Math.min(...bot.pings)) * 2, bot.G.skills.stomp.duration * 0.9 - (bot.G.skills.stomp.cooldown / bot.partyData?.list.length))) continue
                    }
                    if (AL.Tools.distance(bot, entity) > bot.G.skills.stomp.range) continue // Too far to stomp

                    // It's our turn to stomp!
                    await bot.stomp()
                    sendStompReady()
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
        setTimeout(() => { sendStompReadyLoop() }, bot.G.skills.stomp.duration * 0.9)
    }
    sendStompReadyLoop()

    const spawn = bot.locateMonster(targets[0])[0]
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

            let next: AL.Entity
            for (const entityID of entityOrder) {
                const entity = bot.entities.get(entityID)
                if (!entity) continue // Entity died?
                if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                next = entity
                break
            }

            let destination: AL.IPosition = { ...spawn }
            if (next) destination = { map: next.map, x: next.x, y: next.y }
            if (bot.party) {
                // Avoid stacking on party members
                switch (bot.partyData.list.indexOf(bot.id)) {
                case 1:
                    destination.x += 6
                    break
                case 2:
                    destination.x -= 6
                    break
                case 3:
                    destination.y += 6
                    break
                case 4:
                    destination.y -= 6
                    break
                case 5:
                    destination.x += 6
                    destination.y += 6
                    break
                case 6:
                    destination.x += 6
                    destination.y -= 6
                    break
                case 7:
                    destination.x -= 6
                    destination.y += 6
                    break
                case 8:
                    destination.x -= 6
                    destination.y -= 6
                    break
                case 9:
                    destination.x += 12
                    break
                }
            }
            if (!next) await bot.smartMove(destination)
            else bot.smartMove(destination).catch(() => { /* Suppress errors */ })
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startLeader(bot: AL.Warrior): Promise<void> {
    const readyToStomp: string[] = []

    startTrackerLoop(bot)

    bot.socket.on("cm", async (data: AL.CMData) => {
        if (!partyMembers.includes(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: CM = JSON.parse(data.message)
            if (decodedMessage.type == "ready") {
                if (decodedMessage.ready) {
                    if (!readyToStomp.includes(data.name)) { readyToStomp.push(data.name) }
                } else {
                    readyToStomp.splice(readyToStomp.indexOf(data.name), 1)
                }
            }
        } catch (e) {
            console.error(e)
        }
    })

    async function sendStompOrderLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const priority = (a: AL.Entity, b: AL.Entity): boolean => {
                // Order in array
                const a_index = targets.indexOf(a.type)
                const b_index = targets.indexOf(b.type)
                if (a_index < b_index) return true
                else if (a_index > b_index) return false

                // Has a target -> higher priority
                if (a.target && !b.target) return true
                else if (!a.target && b.target) return false

                // Could die -> lower priority
                const a_couldDie = a.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)
                const b_couldDie = b.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)
                if (!a_couldDie && b_couldDie) return true
                else if (a_couldDie && !b_couldDie) return false

                // Will burn to death -> lower priority
                const a_willBurn = a.willBurnToDeath()
                const b_willBurn = b.willBurnToDeath()
                if (!a_willBurn && b_willBurn) return true
                else if (a_willBurn && !b_willBurn) return false

                // Lower HP -> higher priority
                if (a.hp < b.hp) return true
                else if (a.hp > b.hp) return false

                // Closer -> higher priority
                return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
            }
            const entities = new FastPriorityQueue<AL.Entity>(priority)
            for (const entity of bot.getEntities({
                couldGiveCredit: true,
                typeList: targets,
                willDieToProjectiles: false,
            })) {
                entities.add(entity)
            }

            const entityOrder: string[] = []
            while (entities.size > 0) {
                entityOrder.push(entities.poll().id)
            }

            const stompOrder: StompOrderCM = {
                entityOrder: entityOrder,
                playerOrder: [...readyToStomp],
                type: "stompOrder"
            }
            bot.sendCM([...partyMembers], stompOrder)
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { sendStompOrderLoop() }, (bot.G.skills.stomp.duration * 0.9) / 3)
    }
    sendStompOrderLoop()
}