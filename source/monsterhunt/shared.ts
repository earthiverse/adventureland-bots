import AL, { Character, CMData, Entity, IPosition, Mage, Merchant, MonsterName, Priest, Ranger, Rogue, ServerIdentifier, ServerInfoDataLive, ServerRegion, SlotType, Warrior } from "alclient"
import { FRIENDLY_ROGUES, getMonsterHuntTargets, getPriority1Entities, getPriority2Entities, ITEMS_TO_HOLD, LOOP_MS, sleep, startAvoidStacking, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { attackTheseTypesMerchant, doBanking, doEmergencyBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesWarrior, startChargeLoop, startHardshellLoop, startWarcryLoop } from "../base/warrior.js"
import { Information, Strategy } from "../definitions/bot.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { attackTheseTypesRogue, startRSpeedLoop } from "../base/rogue.js"

const DEFAULT_TARGET: MonsterName = "goo"

export const DEFAULT_REGION: ServerRegion = "US"
export const DEFAULT_IDENTIFIER: ServerIdentifier = "II"

export async function getTarget(bot: Character, strategy: Strategy, information: Information): Promise<MonsterName> {
    for (const entity of await getPriority1Entities(bot)) {
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requireCtype &&
            !((information.bot1.bot?.ctype == strategy[entity.type].requireCtype && information.bot1.target == entity.type)
            || (information.bot2.bot?.ctype == strategy[entity.type].requireCtype && information.bot2.target == entity.type)
            || (information.bot3.bot?.ctype == strategy[entity.type].requireCtype && information.bot3.target == entity.type))) continue
        const realEntity = bot.entities.get(entity.name) || bot.entities.get((entity as Entity).id)
        if (realEntity) {
            return realEntity.type
        } else {
            if (AL.Tools.distance(bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {

                // We're close, but we can't see the entity. It's probably dead
                AL.Database.lastMongoUpdate.delete(entity.name)
                await AL.EntityModel.deleteOne({ name: entity.name, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region }).lean().exec()
            } else {
                return entity.type
            }
        }
    }

    for (const entity of await getPriority2Entities(bot)) {
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requireCtype &&
            !((information.bot1.bot?.ctype == strategy[entity.type].requireCtype && information.bot1.target == entity.type)
            || (information.bot2.bot?.ctype == strategy[entity.type].requireCtype && information.bot2.target == entity.type)
            || (information.bot3.bot?.ctype == strategy[entity.type].requireCtype && information.bot3.target == entity.type))) continue
        const realEntity = bot.entities.get(entity.name) || bot.entities.get((entity as Entity).id)
        if (realEntity) {
            if (realEntity.couldGiveCreditForKill(bot)) return realEntity.type

            // Update the database to let others know that this entity is taken
            AL.Database.lastMongoUpdate.set(realEntity.id, new Date())
            await AL.EntityModel.updateOne({ name: realEntity.id, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region, type: realEntity.type },
                { hp: realEntity.hp, lastSeen: Date.now(), level: realEntity.level, map: realEntity.map, target: realEntity.target, x: realEntity.x, y: realEntity.y },
                { upsert: true }).lean().exec()
        } else {
            if (AL.Tools.distance(bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {
                // We're close, but we can't see the entity. It's probably dead
                AL.Database.lastMongoUpdate.delete(entity.name)
                await AL.EntityModel.deleteOne({ name: entity.name, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region }).lean().exec()
                continue
            }
            if (bot.G.monsters[entity.type].cooperative // Cooperative monsters always give credit
                || !entity.target // It doesn't have a target yet
                || [information.bot1.name, information.bot2.name, information.bot3.name].includes(entity.target)// It's attacking one of our players
                || (bot.party && bot.partyData.list.includes(entity.target))) { // It's attacking one of our party members
                return entity.type
            }
        }
    }

    for (const type of await getMonsterHuntTargets(bot, information.friends)) {
        if (!strategy[type]) continue // No strategy
        if (strategy[type].requireCtype &&
            !((information.bot1.bot?.ctype == strategy[type].requireCtype && information.bot1.target == type)
            || (information.bot2.bot?.ctype == strategy[type].requireCtype && information.bot2.target == type)
            || (information.bot3.bot?.ctype == strategy[type].requireCtype && information.bot3.target == type))) continue

        return type
    }

    return strategy.defaultTarget ?? DEFAULT_TARGET
}

export async function startMage(bot: Mage, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    const idleTargets: MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as MonsterName].attackWhileIdle) continue
        idleTargets.push(t as MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: MonsterName
            if (bot.id == information.bot1.name) {
                target = information.bot1.target
            } else if (bot.id == information.bot2.name) {
                target = information.bot2.target
            } else if (bot.id == information.bot3.name) {
                target = information.bot3.target
            }

            if (target) {
                // Equipment
                if (strategy[target].equipment) {
                    for (const s in strategy[target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesMage(bot, idleTargets, information.friends)

            // Attack things targeting us
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    targetingPartyMember: true,
                    withinRange: bot.range
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("cburst")))))
    }
    attackLoop()
}

export async function startMerchant(bot: Merchant, information: Information, strategy: Strategy, standPlace: IPosition): Promise<void> {
    startShared(bot, strategy, information)
    startMluckLoop(bot)
    startPartyLoop(bot, bot.id)

    const idleTargets: MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as MonsterName].attackWhileIdle) continue
        idleTargets.push(t as MonsterName)
    }

    // Equip good weapons
    try {
        if (bot.slots.mainhand) await bot.unequip("mainhand")
        if (bot.slots.offhand) await bot.unequip("offhand")
        const dartGun = bot.locateItem("dartgun", bot.items, { locked: true })
        if (dartGun !== undefined) await bot.equip(dartGun, "mainhand")
        const wbook0 = bot.locateItem("wbook0", bot.items, { locked: true })
        const wbook1 = bot.locateItem("wbook1", bot.items, { locked: true })
        if (wbook0 !== undefined) await bot.equip(wbook0, "offhand")
        else if (wbook1 !== undefined) await bot.equip(wbook1, "offhand")
    } catch (e) {
        console.error(e)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            if (information.merchant.target
                && !bot.isOnCooldown("scare")) {
                // Equipment
                if (strategy[information.merchant.target].equipment) {
                    for (const s in strategy[information.merchant.target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[information.merchant.target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[information.merchant.target].attack()
            }

            // Idle strategy
            await attackTheseTypesMerchant(bot, idleTargets, information.friends)
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
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
                for (const friend of information.friends) {
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
            for (const friend of information.friends) {
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
            if (!bot.isOnCooldown("fishing")) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Go mining if we can
            await goMining(bot)
            if (!bot.isOnCooldown("mining")) {
                bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            if ((bot.id == "earthMer" || bot.id == "earthMer2") && bot.canUse("mluck", { ignoreCooldown: true })) {
                // MLuck people if there is a server info target
                for (const mN in bot.S) {
                    const type = mN as MonsterName
                    if (!bot.S[type].live) continue
                    if (!(bot.S[type] as ServerInfoDataLive).target) continue

                    if (AL.Tools.distance(bot, (bot.S[type] as ServerInfoDataLive)) > 100) {
                        await bot.closeMerchantStand()
                        await bot.smartMove((bot.S[type] as ServerInfoDataLive), { getWithin: 100 })
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
            await bot.smartMove(standPlace)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

export async function startPriest(bot: Priest, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)
    startDarkBlessingLoop(bot)
    startPartyHealLoop(bot, information.friends)

    const idleTargets: MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as MonsterName].attackWhileIdle) continue
        idleTargets.push(t as MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: MonsterName
            if (bot.id == information.bot1.name) {
                target = information.bot1.target
            } else if (bot.id == information.bot2.name) {
                target = information.bot2.target
            } else if (bot.id == information.bot3.name) {
                target = information.bot3.target
            }

            if (target
                && !bot.isOnCooldown("scare")) {
                // Equipment
                if (strategy[target].equipment) {
                    for (const s in strategy[target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesPriest(bot, idleTargets, information.friends)

            // Attack things targeting us
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    targetingPartyMember: true,
                    withinRange: bot.range
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}

export async function startRanger(bot: Ranger, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    const idleTargets: MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as MonsterName].attackWhileIdle) continue
        idleTargets.push(t as MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: MonsterName
            if (bot.id == information.bot1.name) {
                target = information.bot1.target
            } else if (bot.id == information.bot2.name) {
                target = information.bot2.target
            } else if (bot.id == information.bot3.name) {
                target = information.bot3.target
            }

            if (target
                && !bot.isOnCooldown("scare")) {
                // Equipment
                if (strategy[target].equipment) {
                    for (const s in strategy[target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesRanger(bot, idleTargets, information.friends)

            // Attack things targeting us
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    targetingPartyMember: true,
                    withinRange: bot.range
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))))
    }
    attackLoop()
}

export async function startRogue(bot: Rogue, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    startRSpeedLoop(bot, { enableGiveToStrangers: true })

    const idleTargets: MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as MonsterName].attackWhileIdle) continue
        idleTargets.push(t as MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: MonsterName
            if (bot.id == information.bot1.name) {
                target = information.bot1.target
            } else if (bot.id == information.bot2.name) {
                target = information.bot2.target
            } else if (bot.id == information.bot3.name) {
                target = information.bot3.target
            }

            if (target
                && !bot.isOnCooldown("scare")) {
                // Equipment
                if (strategy[target].equipment) {
                    for (const s in strategy[target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesRogue(bot, idleTargets, information.friends)

            // Attack things targeting us
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    targetingPartyMember: true,
                    withinRange: bot.range
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("quickstab"), bot.getCooldown("mentalburst")))))
    }
    attackLoop()
}

export async function startWarrior(bot: Warrior, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    startChargeLoop(bot)
    startHardshellLoop(bot)
    startWarcryLoop(bot)

    const idleTargets: MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as MonsterName].attackWhileIdle) continue
        idleTargets.push(t as MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: MonsterName
            if (bot.id == information.bot1.name) {
                target = information.bot1.target
            } else if (bot.id == information.bot2.name) {
                target = information.bot2.target
            } else if (bot.id == information.bot3.name) {
                target = information.bot3.target
            }

            if (target
                && !bot.isOnCooldown("scare")) {
                // Equipment
                if (strategy[target].equipment) {
                    for (const s in strategy[target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.slots["mainhand"]) {
                            const mainhandItem = bot.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.slots[slot]
                            || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesWarrior(bot, idleTargets, information.friends, { disableAgitate: true })

            // Attack things targeting us
            if (bot.canUse("attack")) {
                for (const entity of bot.getEntities({
                    targetingPartyMember: true,
                    withinRange: bot.range
                })) {
                    await bot.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackLoop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, Math.min(bot.getCooldown("attack"), bot.getCooldown("stomp"), bot.getCooldown("cleave")))))
    }
    attackLoop()
}

export async function startShared(bot: Character, strategy: Strategy, information: Information): Promise<void> {
    const magiporters = new Set(["Bjarny", "Clarity", ...partyMembers])
    // TODO: Find type information and add it to ALClient
    bot.socket.on("magiport", async (data: { name: string }) => {
        console.log("~~~ Magiport Data DEBUG (add this type to ALClient) ~~~")
        console.log(data)
        if (magiporters.has(data.name)) {
            await bot.acceptMagiport(data.name)
            await bot.stopSmartMove()
            await bot.stopWarpToTown()
            return
        }
    })

    bot.socket.on("cm", async (data: CMData) => {
        console.log(`~~~ CM from ${data.name} DEBUG ~~~`)
        console.log(data)
    })

    startAvoidStacking(bot)
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startCraftLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    // NOTE: Disabled for Halloween
    // startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    if (bot.ctype !== "merchant") {
        if (bot.id == partyLeader) {
            startPartyLoop(bot, partyLeader, partyMembers)
        } else {
            bot.timeouts.set("partyLoop", setTimeout(async () => { startPartyLoop(bot, partyLeader, partyMembers) }, 2000))
        }
    }
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, [information.merchant.name, information.merchant.nameAlt], ITEMS_TO_HOLD, 10_000_000)
    startUpgradeLoop(bot)

    if (bot.ctype !== "merchant") {
        const friendlyRogues = FRIENDLY_ROGUES
        const moveLoop = async () => {
            try {
                if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

                // If we are dead, respawn
                if (bot.rip) {
                    await bot.respawn()
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, 1000))
                    return
                }

                // Get a MH if we're on the default server and we don't have one
                if (!bot.s.monsterhunt && bot.server.name == DEFAULT_IDENTIFIER && bot.server.region == DEFAULT_REGION) {
                    await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1, useBlink: true })
                    await bot.getMonsterHuntQuest()
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                    return
                }

                // Turn in our monsterhunt if we can
                if (bot.s.monsterhunt && bot.s.monsterhunt.c == 0) {
                    await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1, useBlink: true })
                    await bot.finishMonsterHuntQuest()
                    await bot.getMonsterHuntQuest()
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                    return
                }

                // Get some holiday spirit if it's Christmas
                if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                    await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, useBlink: true })
                    // TODO: Improve ALClient by making this a function
                    bot.socket.emit("interaction", { type: "newyear_tree" })
                    bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, Math.min(...bot.pings) * 2))
                    return
                }

                // Get some buffs from rogues
                if (!bot.s.rspeed) {
                    const friendlyRogue = await AL.PlayerModel.findOne({ lastSeen: { $gt: Date.now() - 120_000 }, name: { $in: friendlyRogues }, serverIdentifier: bot.server.name, serverRegion: bot.server.region }).lean().exec()
                    if (friendlyRogue) {
                        await bot.smartMove(friendlyRogue, { getWithin: 20 })
                        if (!bot.s.rspeed) await sleep(2500)
                        if (!bot.s.rspeed) friendlyRogues.splice(friendlyRogues.indexOf(friendlyRogue.id), 1) // They're not giving rspeed, remove them from our list
                        bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                        return
                    }
                }

                // NOTE: I don't know if it's implemented incorrectly, but @Wizard implied that it no longer (never in the first place?)
                //       gives blessing to other players, only your own.
                // // Get some newcomersblessing
                // if (!bot.s.newcomersblessing) {
                //     const newPlayer = await AL.PlayerModel.findOne({ $expr: { $eq: ["$name", "$s.newcomersblessing.f"] }, lastSeen: { $gt: Date.now() - 120_000 }, serverIdentifier: bot.server.name, serverRegion: bot.server.region }).lean().exec()
                //     if (newPlayer) {
                //         await bot.smartMove(newPlayer, { getWithin: 20 })
                //         bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                //         return
                //     }
                // }

                // Get a luck elixir
                if (!bot.slots.elixir
                     && !(bot.hasItem("computer") || bot.hasItem("supercomputer"))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                    await bot.smartMove("elixirluck")
                }

                // Move to our target
                if (bot.id == information.bot1.name) {
                    if (information.bot1.target) await strategy[information.bot1.target].move()
                } else if (bot.id == information.bot2.name) {
                    if (information.bot2.target) await strategy[information.bot2.target].move()
                } else if (bot.id == information.bot3.name) {
                    if (information.bot3.target) await strategy[information.bot3.target].move()
                }
            } catch (e) {
                console.error(e)
            }
            bot.timeouts.set("moveLoop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
        }
        moveLoop()
    }

    async function targetLoop(): Promise<void> {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const newTarget = await getTarget(bot, strategy, information)
            if (bot.id == information.bot1.name) {
                if (newTarget !== information.bot1.target) bot.stopSmartMove()
                if (newTarget !== information.bot1.target) console.log(`changing ${information.bot1.name}'s target from ${information.bot1.target} to ${newTarget}`)
                information.bot1.target = newTarget
            } else if (bot.id == information.bot2.name) {
                if (newTarget !== information.bot2.target) bot.stopSmartMove()
                if (newTarget !== information.bot2.target) console.log(`changing ${information.bot2.name}'s target from ${information.bot2.target} to ${newTarget}`)
                information.bot2.target = newTarget
            } else if (bot.id == information.bot3.name) {
                if (newTarget !== information.bot3.target) bot.stopSmartMove()
                if (newTarget !== information.bot3.target) console.log(`changing ${information.bot3.name}'s target from ${information.bot3.target} to ${newTarget}`)
                information.bot3.target = newTarget
            } else if (bot.id == information.merchant.target) {
                if (newTarget !== information.merchant.target) bot.stopSmartMove()
                if (newTarget !== information.merchant.target) console.log(`changing ${information.merchant.name}'s target from ${information.merchant.target} to ${newTarget}`)
                information.merchant.target = newTarget
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { await targetLoop() }, 1000)
    }
    if (bot.server.region == DEFAULT_REGION && bot.server.name == DEFAULT_IDENTIFIER) {
        setTimeout(async () => { await targetLoop() }, 2500) // Offset by a few seconds so characters can load
    } else {
        await targetLoop() // We're on a different server, which means there's special monsters, get to them ASAP.
    }
}