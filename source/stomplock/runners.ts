import AL from "alclient-mongo"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull, startScareLoop, startSendStuffDenylistLoop, ITEMS_TO_SELL, goToNearestWalkableToMonster } from "../base/general.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { stompPartyLeader, stompPartyMembers } from "../base/party.js"

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "II"

const targets: AL.MonsterName[] = ["greenfairy", "bluefairy", "redfairy"]
const LOOP_MS = 10

export async function startSellSticksToMerchantsLoop(bot: AL.Character): Promise<void> {
    async function sellToMerchants() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (const [, player] of bot.players) {
                if (!player) continue
                if (AL.Tools.distance(bot, player) > AL.Constants.NPC_INTERACTION_DISTANCE) continue

                const sticks = bot.locateItems("stick", bot.items, { level: 0 })
                if (!sticks || sticks.length == 0) break // No more sticks

                for (const slotName in player.slots) {
                    const slot: AL.ItemDataTrade = player.slots[slotName]
                    if (!slot || !slot.b) continue // They aren't buying anything in this slot
                    if (slot.name !== "stick") continue // They aren't buying sticks
                    if (slot.price < 2_500_000) continue // They aren't paying enough

                    await bot.sellToMerchant(player.id, slotName as AL.TradeSlotType, slot.rid, 1)
                }
            }

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellToMerchants() }, 1000)
    }
    sellToMerchants()
}

export async function startShared(bot: AL.Warrior, merchantName: string): Promise<void> {
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

    startSellSticksToMerchantsLoop(bot)

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.isOnCooldown("scare")) {
                setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("scare")))
                return
            }

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (!entity) continue // Entity died?
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                    if (!entity.s.stunned || entity.s.stunned.ms < ((LOOP_MS + Math.max(...bot.pings)) * 4)) continue // Enemy is not stunned, or is about to be free, don't attack!

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
                for (const [, entity] of bot.entities) {
                    if (!entity) continue // Entity died?
                    if (!entity.target || entity.target != bot.id) continue // Not targeting us
                    if (entity.s.stunned && entity.s.stunned.ms > ((LOOP_MS + Math.min(...bot.pings)) * 4)) continue // Enemy is still stunned

                    // Scare, because it is, or will soon be, no longer stunned.
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

    async function stompLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // Equip the basher if we don't have one equipped
            if ((!bot.slots.mainhand || bot.slots.mainhand.name !== "basher") && bot.hasItem("basher")) {
                const promises: Promise<unknown>[] = []
                if (bot.slots.offhand) promises.push(bot.unequip("offhand"))
                promises.push(bot.equip(bot.locateItem("basher")))
                await Promise.all(promises)
            }

            // Stomp if we can
            if (bot.canUse("stomp")) {
                await bot.stomp()

                // Equip fireblades if we have two
                if ((!bot.slots.mainhand || bot.slots.mainhand.name == "basher") && bot.countItem("fireblade") >= 2) {
                    const promises: Promise<unknown>[] = []
                    const fireblades = bot.locateItems("fireblade")
                    if (bot.hasItem("fireblade")) promises.push(bot.equip(fireblades[0], "mainhand"))
                    if (bot.hasItem("fireblade")) promises.push(bot.equip(fireblades[1], "offhand"))
                    await Promise.all(promises)
                }

                // Queue up the next stomp
                const now = Date.now()
                const numPartyMembers = bot.partyData ? bot.partyData.list ? bot.partyData.list.length : 1 : 1
                const partyMemberIndex = bot.partyData ? bot.partyData.list ? bot.partyData.list.indexOf(bot.id) : 0 : 0
                const cooldown = AL.Game.G.skills.stomp.cooldown
                const nextInterval = (cooldown - now % cooldown)
                const offset = partyMemberIndex * (cooldown / numPartyMembers)

                setTimeout(async () => { stompLoop() }, nextInterval + offset)
                return
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { stompLoop() }, Math.max(LOOP_MS, bot.getCooldown("stomp")))
    }
    stompLoop()

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

            await goToNearestWalkableToMonster(bot, targets, spawn, 0)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
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

    startSellSticksToMerchantsLoop(bot)

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