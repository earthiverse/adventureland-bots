import AL from "alclient"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull, startScareLoop, startSendStuffDenylistLoop, ITEMS_TO_SELL, goToNearestWalkableToMonster, startTrackerLoop } from "../base/general.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { stompPartyLeader, stompPartyMembers } from "../base/party.js"

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "PVP"

const targets: AL.MonsterName[] = ["pinkgoblin"]
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

                    await bot.sellToMerchant(player.id, slotName as AL.TradeSlotType, slot.rid, 1).catch((e) => { console.error(e) })
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellToMerchants() }, 1000)
    }
    sellToMerchants()
}

export async function startMailBankKeysToEarthiverseLoop(bot: AL.Character): Promise<void> {
    async function mailBankKeys() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const bankKey = bot.locateItem("bkey")
            if (bankKey !== undefined) {
                // TODO: Implement these in ALClient
                bot.socket.emit("imove", { "a": 0, "b": bankKey })
                bot.socket.emit("mail", { item: true, message: "sell it", subject: "bank key!", to: "earthiverse", })
            }
        } catch (e) {
            console.error
        }
        setTimeout(async () => { mailBankKeys() }, 5000)
    }
    mailBankKeys()
}

export async function startLeader(bot: AL.Warrior): Promise<void> {
    startTrackerLoop(bot)

    async function tauntLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: targets,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (!entity) continue // Entity died?
                    if (entity.target == bot.name) continue // Already targeting us
                    if (!entity.s.stunned || entity.s.stunned.ms < ((LOOP_MS + Math.max(...bot.pings)) * 4)) continue // Enemy is not stunned, or is about to be free, don't taunt!

                    await bot.taunt(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { tauntLoop() }, Math.max(LOOP_MS, bot.getCooldown("taunt")))
    }
    tauntLoop()

    async function equipLuckStuffLoop() {
        try {
            const promises: Promise<unknown>[] = []

            // TODO: Improve so we have other stuff equipped until we're close to killing our target

            // Wanderer's Set (+16% luck)
            if (bot.hasItem("wcap")) promises.push(bot.equip(bot.locateItem("wcap"), "helmet"))
            if (bot.hasItem("wattire")) promises.push(bot.equip(bot.locateItem("wattire"), "chest"))
            if (bot.hasItem("wbreeches")) promises.push(bot.equip(bot.locateItem("wbreeches"), "pants"))
            if (bot.hasItem("wshoes")) promises.push(bot.equip(bot.locateItem("wshoes"), "shoes"))
            if (bot.hasItem("wgloves")) promises.push(bot.equip(bot.locateItem("wgloves"), "gloves"))

            // Rabbit's Foot (+10% luck)
            if (bot.hasItem("rabbitsfoot")) promises.push(bot.equip(bot.locateItem("rabbitsfoot"), "orb"))

            // Enchanted Earring (+2% luck)
            if (bot.hasItem("dexearringx")) {
                if (bot.slots.earring1?.name == "dexearringx") promises.push(bot.equip(bot.locateItem("dexearringx"), "earring2"))
                else promises.push(bot.equip(bot.locateItem("dexearringx"), "earring1"))
            }

            // Shield M (+15% luck)
            if (bot.hasItem("mshield")) promises.push(bot.equip(bot.locateItem("mshield"), "offhand"))

            await Promise.all(promises)
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { tauntLoop() }, Math.max(LOOP_MS, 500))
    }
    equipLuckStuffLoop()
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
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: targets,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (!entity) continue // Entity died?
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

            let incomingDamage = 0
            let stunned = true
            for (const [, entity] of bot.entities) {
                if (entity.target !== bot.id) continue
                if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.min(...bot.pings)) * 4)) stunned = false
                incomingDamage += entity.calculateDamageRange(bot)[1]
            }

            if (bot.canUse("scare", { ignoreEquipped: true }) && (
                bot.isScared() // We are scared
                || !stunned // Target is not stunned
                || (bot.s.burned && bot.s.burned.intensity > bot.max_hp / 5) // We are burning pretty badly
                || (bot.targets > 0 && bot.c.town) // We are teleporting
                || (bot.targets > 0 && bot.hp < bot.max_hp * 0.25) // We are low on HP
                || (incomingDamage > bot.hp) // We could literally die with the next attack
            )) {
                // Equip the jacko if we need to
                let inventoryPos: number
                if (!bot.canUse("scare") && bot.hasItem("jacko")) {
                    inventoryPos = bot.locateItem("jacko")
                    bot.equip(inventoryPos)
                }

                // Scare, because we are scared
                bot.scare()

                // Re-equip our orb
                if (inventoryPos !== undefined) bot.equip(inventoryPos)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("scareloop", setTimeout(async () => { scareLoop() }, Math.max(250, bot.getCooldown("scare"))))
    }

    // If we have too many targets, we can't go through doors.
    bot.socket.on("game_response", (data: AL.GameResponseData) => {
        if (typeof data == "string") {
            if (data == "cant_escape") {
                if (bot.isScared() || bot.targets >= 5) {
                    // Equip the jacko if we need to
                    let inventoryPos: number
                    if (!bot.canUse("scare") && bot.hasItem("jacko")) {
                        inventoryPos = bot.locateItem("jacko")
                        bot.equip(inventoryPos)
                    }

                    // Scare, because we are scared
                    bot.scare()

                    // Re-equip our orb
                    if (inventoryPos !== undefined) bot.equip(inventoryPos)
                }
            }
        }
    })

    scareLoop()


    function getNextStunTime() {
        const now = Date.now()
        const numPartyMembers = bot.partyData ? bot.partyData.list ? bot.partyData.list.length : 1 : 1
        const partyMemberIndex = bot.partyData ? bot.partyData.list ? bot.partyData.list.indexOf(bot.id) : 0 : 0
        const cooldown = AL.Game.G.skills.stomp.cooldown + 500
        const nextInterval = (cooldown - now % cooldown)
        const offset = partyMemberIndex * (cooldown / numPartyMembers)

        return nextInterval + offset
    }

    async function stompLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            console.log(`It's ${bot.id}'s turn to stomp. (${Date.now()})`)

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
                    if (bot.hasItem("mshield")) promises.push(bot.equip(bot.locateItem("mshield"), "offhand"))
                    else if (!bot.slots.offhand && bot.hasItem("fireblade")) promises.push(bot.equip(fireblades[1], "offhand"))
                    await Promise.all(promises)
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { stompLoop() }, Math.max(LOOP_MS, bot.getCooldown("stomp"), getNextStunTime()))
    }
    setTimeout(async () => { stompLoop() }, Math.max(getNextStunTime()))

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

    // startSellSticksToMerchantsLoop(bot)
    startMailBankKeysToEarthiverseLoop(bot)

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
    async function pvpMoveLoop() {
        try {
            await bot.closeMerchantStand()
            await bot.smartMove(holdPosition)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("pvpMoveLoop", setTimeout(async () => { pvpMoveLoop() }, LOOP_MS))
    }
    if (identifier !== "PVP") moveLoop()
    else pvpMoveLoop()
}