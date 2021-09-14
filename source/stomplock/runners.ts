import AL from "alclient"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startUpgradeLoop, startAvoidStacking, goToPoitonSellerIfLow, goToBankIfFull, startScareLoop, startSendStuffDenylistLoop, ITEMS_TO_SELL, goToNearestWalkableToMonster, startTrackerLoop, getFirstEmptyInventorySlot, startBuyFriendsReplenishablesLoop } from "../base/general.js"
import { doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { stompPartyLeader, stompPartyMembers } from "../base/party.js"
import { startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import FastPriorityQueue from "fastpriorityqueue"

export const region: AL.ServerRegion = "US"
export const identifier: AL.ServerIdentifier = "II"

const targets: AL.MonsterName[] = ["bluefairy", "greenfairy", "redfairy"]
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

                    await bot.sellToMerchant(player.id, slotName as AL.TradeSlotType, slot.rid, 1).catch(e => console.error(e))
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
                    if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is not stunned, or is about to be free, don't taunt!

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

    async function swapLuckStuffLoop() {
        try {
            const promises: Promise<unknown>[] = []

            const entity = bot.entities.get(bot.target)
            if (entity && entity.hp < 50_000) { // Entity has low hp, let's equip our luck stuff
                // Wanderer's Set (+16% luck)
                const helmet = bot.locateItem("wcap", bot.items, { locked: true })
                const chest = bot.locateItem("wattire", bot.items, { locked: true })
                const pants = bot.locateItem("wbreeches", bot.items, { locked: true })
                const shoes = bot.locateItem("wshoes", bot.items, { locked: true })
                const gloves = bot.locateItem("wgloves", bot.items, { locked: true })
                if (helmet !== undefined) promises.push(bot.equip(helmet, "helmet"))
                if (chest !== undefined) promises.push(bot.equip(chest, "chest"))
                if (pants !== undefined) promises.push(bot.equip(pants, "pants"))
                if (shoes !== undefined) promises.push(bot.equip(shoes, "shoes"))
                if (gloves !== undefined) promises.push(bot.equip(gloves, "gloves"))

                // Rabbit's Foot (+10% luck)
                const orb = bot.locateItem("rabbitsfoot", bot.items, { locked: true })
                if (orb !== undefined) promises.push(bot.equip(orb, "orb"))

                // Enchanted Earrings (+2% luck each)
                const earrings = bot.locateItems("dexearringx", bot.items, { locked: true })
                if (earrings.length > 0) {
                    if (earrings.length == 2) promises.push(bot.equip(earrings[1], "earring2"))
                    if (bot.slots.earring1?.name == "dexearringx") promises.push(bot.equip(earrings[0], "earring2"))
                    else promises.push(bot.equip(earrings[0], "earring1"))
                }

                // Shield M (+15% luck)
                const offhand = bot.locateItem("mshield", bot.items, { locked: true })
                if (offhand !== undefined) promises.push(bot.equip(offhand, "offhand"))
            } else { // Entity has high hp, let's equip stuff that does a lot of damage
                // Rugged Set with Winged Boots
                const helmet = bot.locateItem("helmet1", bot.items, { locked: true })
                const chest = bot.locateItem("coat1", bot.items, { locked: true })
                const pants = bot.locateItem("pants1", bot.items, { locked: true })
                const shoes = bot.locateItem("wingedboots", bot.items, { locked: true })
                const gloves = bot.locateItem("gloves1", bot.items, { locked: true })
                if (helmet !== undefined) promises.push(bot.equip(helmet, "helmet"))
                if (chest !== undefined) promises.push(bot.equip(chest, "chest"))
                if (pants !== undefined) promises.push(bot.equip(pants, "pants"))
                if (shoes !== undefined) promises.push(bot.equip(shoes, "shoes"))
                if (gloves !== undefined) promises.push(bot.equip(gloves, "gloves"))

                // Orb of Testing
                const orb = bot.locateItem("test_orb", bot.items, { locked: true })
                if (orb !== undefined) promises.push(bot.equip(orb, "orb"))

                // Strength Earrings
                const earrings = bot.locateItems("strearring", bot.items, { locked: true })
                if (earrings.length > 0) {
                    if (earrings.length == 2) promises.push(bot.equip(earrings[1], "earring2"))
                    if (bot.slots.earring1?.name == "strearring") promises.push(bot.equip(earrings[0], "earring2"))
                    else promises.push(bot.equip(earrings[0], "earring1"))
                }

                // Fireblades
                const offhand = bot.locateItem("fireblade", bot.items, { locked: true })
                if (offhand !== undefined) promises.push(bot.equip(offhand, "offhand"))
            }

            await Promise.all(promises)
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { tauntLoop() }, Math.max(LOOP_MS, 500))
    }
    swapLuckStuffLoop()
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
                    if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is not stunned, or is about to be free, don't attack!

                    await bot.basicAttack(entity.id)
                    break
                }
            }

            if (!bot.canUse("stomp") && bot.canUse("cleave", { ignoreEquipped: true }) && (bot.hasItem("bataxe") || bot.slots.mainhand?.name == "bataxe")) {
                let allStomped = true
                for (const entity of bot.getEntities({
                    typeList: targets,
                    withinRange: bot.G.skills.stomp.range
                })) {
                    if (!entity) continue // Entity died?
                    if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.max(...bot.pings)) * 2)) {
                        allStomped = false
                        break
                    }
                }
                if (allStomped) {
                    // Equip the bataxe if we don't have one equipped
                    let offhandSlot: number
                    let mainhandSlot: number
                    if ((!bot.slots.mainhand || bot.slots.mainhand.name !== "bataxe") && bot.hasItem("bataxe")) {
                        const promises: Promise<unknown>[] = []

                        if (bot.slots.offhand) {
                            offhandSlot = getFirstEmptyInventorySlot(bot.items)
                            promises.push(bot.unequip("offhand"))
                        }
                        if (bot.slots.mainhand?.name !== "bataxe") {
                            mainhandSlot = bot.locateItem("bataxe")
                            promises.push(bot.equip(mainhandSlot))
                        }
                        await Promise.all(promises)
                    }

                    // Cleave
                    await bot.cleave()

                    // Re-equip our stuff
                    const promises: Promise<unknown>[] = []
                    if (mainhandSlot) promises.push(bot.equip(mainhandSlot, "mainhand"))
                    if (offhandSlot) promises.push(bot.equip(offhandSlot, "offhand"))
                    await Promise.all(promises)
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
                if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.min(...bot.pings)) * 2)) stunned = false
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

    function getMSToNextStun() {
        const now = Date.now()

        let numStompers = 0
        let partyMemberIndex = 0
        if (bot.partyData && bot.partyData.list) {
            for (const id of bot.partyData.list) {
                const member = bot.partyData.party[id]
                if (id == bot.id) partyMemberIndex = numStompers
                if (member.type == "warrior") numStompers++
            }
        } else {
            numStompers = 1
        }

        const cooldown = AL.Game.G.skills.stomp.cooldown + 100
        const nextInterval = (cooldown - now % cooldown)
        const offset = partyMemberIndex * (cooldown / numStompers)

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
        setTimeout(async () => { stompLoop() }, Math.max(LOOP_MS, bot.getCooldown("stomp"), getMSToNextStun()))
    }
    setTimeout(async () => {
        // Start our stomp loop in 5s, after we have a party
        setTimeout(async () => { stompLoop() }, Math.max(getMSToNextStun()))
    }, 5000)

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

            // const spawn: AL.IPosition = bot.S.franky as ServerInfoDataLive || mainGoos

            await goToNearestWalkableToMonster(bot, targets, spawn, 0)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startPriest(bot: AL.Priest, merchantName: string): Promise<void> {
    startAvoidStacking(bot)
    startBuyLoop(bot, new Set())
    startCompoundLoop(bot)
    startDarkBlessingLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, stompPartyLeader, stompPartyMembers)
    startPartyHealLoop(bot)
    startPontyLoop(bot)
    startSellLoop(bot)
    startUpgradeLoop(bot, { ...ITEMS_TO_SELL, "stick": 100 }) // Don't upgrade sticks
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
                const healPriority = (a: AL.Player, b: AL.Player) => {
                    // Heal those with lower HP first
                    const a_hpRatio = a.hp / a.max_hp
                    const b_hpRatio = b.hp / b.max_hp
                    if (a_hpRatio < b_hpRatio) return true
                    else if (b_hpRatio < a_hpRatio) return false

                    // Heal closer players
                    return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
                }
                const players = new FastPriorityQueue<AL.Character | AL.Player>(healPriority)
                // Potentially heal ourself
                if (bot.hp / bot.max_hp <= 0.8) players.add(bot)
                // Potentially heal others
                for (const [, player] of bot.players) {
                    if (AL.Tools.distance(bot, player) > bot.range) continue // Too far away to heal
                    if (player.rip) continue // Player is already dead
                    if (player.hp / player.max_hp > 0.8) continue // Player still has a lot of hp

                    if (bot.party && bot.party !== player.party) continue // They're not our friend, and not in our party

                    players.add(player)
                }
                const toHeal = players.peek()
                if (toHeal) await bot.heal(toHeal.id)
            }

            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    typeList: targets,
                    willDieToProjectiles: false,
                    withinRange: bot.range
                })) {
                    if (!entity) continue // Entity died?
                    if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.max(...bot.pings)) * 2)) continue // Enemy is not stunned, or is about to be free, don't attack!

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
                if (!entity.s.stunned || entity.s.stunned.ms <= ((LOOP_MS + Math.min(...bot.pings)) * 2)) stunned = false
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

            // const spawn: AL.IPosition = bot.S.franky as ServerInfoDataLive || mainGoos

            await goToNearestWalkableToMonster(bot, targets, spawn, 0)
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

export async function startMerchant(bot: AL.Merchant, friends: AL.Character[], holdPosition: AL.IPosition): Promise<void> {
    startBuyFriendsReplenishablesLoop(bot, friends)
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