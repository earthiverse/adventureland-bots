import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startTrackerLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull, startScareLoop, startSendStuffDenylistLoop, ITEMS_TO_HOLD, ITEMS_TO_SELL } from "../base/general.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { stompPartyLeader, stompPartyMembers } from "../base/party.js"

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "II"

const targets: AL.MonsterName[] = ["bluefairy"]
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

export async function startShared(bot: AL.Warrior, merchantName: string): Promise<void> {
    let stompOrder: string[] = []
    let entityOrder: string[] = []

    function sendStompReady() {
        const stompReadyCM: StompReadyCM = {
            ready: bot.canUse("stomp"),
            type: "ready"
        }
        bot.sendCM([stompPartyLeader], stompReadyCM)
    }

    startAvoidStacking(bot)
    startBuyLoop(bot, new Set())
    startChargeLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, stompPartyLeader, stompPartyMembers)
    startPontyLoop(bot)
    startSellLoop(bot)
    startUpgradeLoop(bot, { ...ITEMS_TO_SELL, "stick": 100 }) // Don't upgrade sticks
    startWarcryLoop(bot)
    startSendStuffDenylistLoop(bot, [merchantName])

    // NOTE: Temporary for Kouin
    async function sellToKouinLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const sticks = bot.locateItems("stick", bot.items, { level: 0 })
            const kouin = bot.players.get("kouin")

            if (sticks && sticks.length > 0
                && kouin && AL.Tools.distance(bot, kouin) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                for (const stick of sticks) {
                    for (const slotName in kouin.slots) {
                        const slot: AL.ItemDataTrade = kouin.slots[slotName]
                        if (!slot || !slot.b) continue
                        if (slot.name !== "stick") continue
                        if (slot.price < 2_000_000) continue

                        await bot.sellToMerchant("kouin", slotName as AL.TradeSlotType, slot.rid, 1)
                    }
                }
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellToKouinLoop() }, 1000)
    }
    sellToKouinLoop()

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
                    if (AL.Tools.distance(bot, entity) > bot.range) break // Too far
                    if (!entity.s.stunned || entity.s.stunned.ms < ((LOOP_MS + Math.max(...bot.pings)) * 3)) break // Enemy is not stunned, or is about to be free, don't attack!

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
                    if (entity.s.stunned && entity.s.stunned.ms >= ((LOOP_MS + Math.min(...bot.pings)) * 3)) continue // Enemy is still stunned

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
        if (!stompPartyMembers.includes(data.name)) return // Discard messages from other players

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
                    if (entity.s.stunned && entity.s.stunned.ms >= (LOOP_MS + Math.min(...bot.pings)) * 5) break // Enemy is still stunned long enough
                    if (AL.Tools.distance(bot, entity) > bot.G.skills.stomp.range) break // Too far to stomp

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
                    destination.x += 10
                    break
                case 2:
                    destination.x -= 10
                    break
                case 3:
                    destination.y += 10
                    break
                case 4:
                    destination.y -= 10
                    break
                case 5:
                    destination.x += 10
                    destination.y += 10
                    break
                case 6:
                    destination.x += 10
                    destination.y -= 10
                    break
                case 7:
                    destination.x -= 10
                    destination.y += 10
                    break
                case 8:
                    destination.x -= 10
                    destination.y -= 10
                    break
                case 9:
                    destination.x += 20
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
        if (!stompPartyMembers.includes(data.name)) return // Discard messages from other players

        try {
            const decodedMessage: CM = JSON.parse(data.message)
            if (decodedMessage.type == "ready") {
                if (decodedMessage.ready) {
                    if (!readyToStomp.includes(data.name)) readyToStomp.push(data.name)
                } else {
                    if (readyToStomp.includes(data.name)) readyToStomp.splice(readyToStomp.indexOf(data.name), 1)
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
                // Older -> higher priority
                return a.id < b.id
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
            bot.sendCM([...stompPartyMembers], stompOrder)
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { sendStompOrderLoop() }, (bot.G.skills.stomp.duration * 0.9) / 3)
    }
    sendStompOrderLoop()
}

export async function startMerchant(bot: AL.Merchant, friends: AL.Character[], holdPosition: AL.IPosition): Promise<void> {
    startHealLoop(bot)
    startMluckLoop(bot)
    startUpgradeLoop(bot, { ...ITEMS_TO_SELL, "stick": 100 }) // Don't upgrade sticks
    startCompoundLoop(bot)
    startLootLoop(bot)
    startScareLoop(bot)
    startSellLoop(bot)
    startExchangeLoop(bot)

    // NOTE: Temporary for Kouin
    async function sellToKouinLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const sticks = bot.locateItems("stick", bot.items, { level: 0 })
            const kouin = bot.players.get("kouin")

            if (sticks && sticks.length > 0
                && kouin && AL.Tools.distance(bot, kouin) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                for (const stick of sticks) {
                    for (const slotName in kouin.slots) {
                        const slot: AL.ItemDataTrade = kouin.slots[slotName]
                        if (!slot || !slot.b) continue
                        if (slot.name !== "stick") continue
                        if (slot.price < 2_000_000) continue

                        await bot.sellToMerchant("kouin", slotName as AL.TradeSlotType, slot.rid, 1)
                    }
                }
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellToKouinLoop() }, 1000)
    }
    sellToKouinLoop()

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // mluck our friends
            if (bot.canUse("mluck")) {
                for (const friend of friends) {
                    if (!friend) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.mluck.range) {
                            await bot.closeMerchantStand()
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await bot.smartMove(friend, { getWithin: bot.G.skills.mluck.range / 2 })
                        }

                        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            // get stuff from our friends
            for (const friend of friends) {
                if (!friend) continue
                if (friend.isFull()) {
                    await bot.smartMove(friend, { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    lastBankVisit = Date.now()
                    await doBanking(bot)
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }
            }

            // Go fishing if we can
            await goFishing(bot)

            // Go mining if we can
            await goMining(bot)

            // Hang out in town
            await bot.smartMove(holdPosition)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}