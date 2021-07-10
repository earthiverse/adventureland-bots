import AL from "alclient-mongo"
import { ANNOUNCEMENT_CHARACTERS, FRIENDLY_ROGUES, getMonsterHuntTargets, getPriority1Entities, getPriority2Entities, goToBankIfFull, LOLWUTPEAR_CHARACTERS, LOOP_MS, MY_CHARACTERS, sleep, startAvoidStacking, startBuyLoop, startCompoundLoop, startElixirLoop, startEventLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startServerPartyInviteLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { attackTheseTypesMerchant, doBanking, goFishing, goMining, startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesWarrior, startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { Information, Strategy } from "../definitions/bot.js"
import { partyLeader, partyMembers } from "./party.js"

const DEFAULT_TARGET: AL.MonsterName = "crab"

export const DEFAULT_REGION: AL.ServerRegion = "US"
export const DEFAULT_IDENTIFIER: AL.ServerIdentifier = "II"

export async function getTarget(bot: AL.Character, strategy: Strategy, information: Information): Promise<AL.MonsterName> {
    for (const entity of await getPriority1Entities(bot)) {
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requireCtype &&
            !((information.bot1.bot?.ctype == strategy[entity.type].requireCtype && information.bot1.target == entity.type)
            || (information.bot2.bot?.ctype == strategy[entity.type].requireCtype && information.bot2.target == entity.type)
            || (information.bot3.bot?.ctype == strategy[entity.type].requireCtype && information.bot3.target == entity.type))) continue
        const realEntity = bot.entities.get(entity.name)
        if (realEntity) {
            return realEntity.type
        } else {
            if (AL.Tools.distance(bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {

                // We're close, but we can't see the entity. It's probably dead
                AL.Database.lastMongoUpdate.delete(entity.name)
                await AL.EntityModel.deleteOne({ name: entity.name, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region })
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
        const realEntity = bot.entities.get(entity.name)
        if (realEntity) {
            if (realEntity.couldGiveCreditForKill(bot)) return realEntity.type

            // Update the database to let others know that this entity is taken
            AL.Database.lastMongoUpdate.set(realEntity.id, new Date())
            await AL.EntityModel.updateOne({ name: realEntity.id, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region, type: realEntity.type },
                { hp: realEntity.hp, lastSeen: Date.now(), level: realEntity.level, map: realEntity.map, target: realEntity.target, x: realEntity.x, y: realEntity.y },
                { upsert: true }).exec()
        } else {
            if (bot.G.monsters[entity.type].cooperative !== true && entity.target && ![information.bot1.name, information.bot2.name, information.bot3.name].includes(entity.target)) continue // It's targeting someone else
            if (AL.Tools.distance(bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {

                // We're close, but we can't see the entity. It's probably dead
                AL.Database.lastMongoUpdate.delete(entity.name)
                await AL.EntityModel.deleteOne({ name: entity.name, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region })
            }
            return entity.type
        }
    }

    // NOTE: TEMPORARY FOR FARMING MUMMIES
    if (MY_CHARACTERS.includes(bot.id) && strategy.minimush) {
        return "minimush"
    } else if (ANNOUNCEMENT_CHARACTERS.includes(bot.id) && strategy.bee) {
        return "bee"
    } else if (LOLWUTPEAR_CHARACTERS.includes(bot.id) && strategy.crab) {
        return "crab"
    }

    for (const type of await getMonsterHuntTargets(bot, information.friends)) {
        if (!strategy[type]) continue // No strategy
        if (strategy[type].requireCtype &&
            !((information.bot1.bot?.ctype == strategy[type].requireCtype && information.bot1.target == type)
            || (information.bot2.bot?.ctype == strategy[type].requireCtype && information.bot2.target == type)
            || (information.bot3.bot?.ctype == strategy[type].requireCtype && information.bot3.target == type))) continue

        return type
    }

    return DEFAULT_TARGET
}

export async function startMage(bot: AL.Mage, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    const idleTargets: AL.MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as AL.MonsterName].attackWhileIdle) continue
        idleTargets.push(t as AL.MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: AL.MonsterName
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
                        const slot = s as AL.SlotType
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
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}

export async function startMerchant(bot: AL.Merchant, information: Information, strategy: Strategy, standPlace: AL.IPosition): Promise<void> {
    startShared(bot, strategy, information)
    startMluckLoop(bot)
    startPartyLoop(bot, bot.id)
    startServerPartyInviteLoop(bot)

    const idleTargets: AL.MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as AL.MonsterName].attackWhileIdle) continue
        idleTargets.push(t as AL.MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
                || bot.isOnCooldown("scare") // We don't have scare ready
            ) {
                // We are dead
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            if (information.merchant.target) {
                // Equipment
                if (strategy[information.merchant.target].equipment) {
                    for (const s in strategy[information.merchant.target].equipment) {
                        const slot = s as AL.SlotType
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
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()

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
            await goToBankIfFull(bot)
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                lastBankVisit = Date.now()
                await doBanking(bot)
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // mluck our friends
            if (bot.canUse("mluck")) {
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

                        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
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
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                    return
                }
            }

            // Go fishing if we can
            await goFishing(bot)

            // Go mining if we can
            await goMining(bot)

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as AL.MonsterName
                if (!bot.S[type].live) continue
                if (!(bot.S[type] as AL.ServerInfoDataLive).target) continue

                if (AL.Tools.distance(bot, (bot.S[type] as AL.ServerInfoDataLive)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as AL.ServerInfoDataLive), { getWithin: 100 })
                }

                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // Find other characters that need mluck and go find them
            if (bot.canUse("mluck")) {
                const charactersToMluck = await AL.PlayerModel.find({ $or: [{ "s.mluck": undefined }, { "s.mluck.f": { "$ne": bot.id }, "s.mluck.strong": undefined }], lastSeen: { $gt: Date.now() - 120000 }, serverIdentifier: bot.server.name, serverRegion: bot.server.region }).lean().exec()
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

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS))
    }
    moveLoop()
}

export async function startPriest(bot: AL.Priest, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)
    startDarkBlessingLoop(bot)
    startPartyHealLoop(bot, information.friends)

    const idleTargets: AL.MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as AL.MonsterName].attackWhileIdle) continue
        idleTargets.push(t as AL.MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
            ) {
                // We are dead
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: AL.MonsterName
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
                        const slot = s as AL.SlotType
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
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}

export async function startRanger(bot: AL.Ranger, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    const idleTargets: AL.MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as AL.MonsterName].attackWhileIdle) continue
        idleTargets.push(t as AL.MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
                || bot.isOnCooldown("scare") // We don't have scare ready
            ) {
                // We are dead
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: AL.MonsterName
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
                        const slot = s as AL.SlotType
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
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}

export async function startWarrior(bot: AL.Warrior, information: Information, strategy: Strategy): Promise<void> {
    startShared(bot, strategy, information)

    startChargeLoop(bot)
    startWarcryLoop(bot)

    const idleTargets: AL.MonsterName[] = []
    for (const t in strategy) {
        if (!strategy[t as AL.MonsterName].attackWhileIdle) continue
        idleTargets.push(t as AL.MonsterName)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
                || bot.isOnCooldown("scare") // We don't have scare ready
            ) {
                // We are dead
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            let target: AL.MonsterName
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
                        const slot = s as AL.SlotType
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
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}

export async function startShared(bot: AL.Character, strategy: Strategy, information: Information): Promise<void> {
    bot.socket.on("magiport", async (data: { name: string }) => {
        if (partyMembers.includes(data.name)) {
            if (bot.c?.town) await bot.stopWarpToTown()
            await bot.acceptMagiport(data.name)
            return
        }
    })

    startAvoidStacking(bot)
    startBuyLoop(bot)
    startBuyLoop(bot, new Set())
    startCompoundLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startEventLoop(bot)
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)
    if (bot.ctype !== "merchant") {
        if (bot.id == partyLeader) {
            startPartyLoop(bot, partyLeader, partyMembers)
        } else {
            bot.timeouts.set("partyloop", setTimeout(async () => { startPartyLoop(bot, partyLeader, partyMembers) }, 2000))
        }
    }
    startScareLoop(bot)
    startSellLoop(bot)
    if (bot.ctype !== "merchant") startSendStuffDenylistLoop(bot, information.merchant.name)
    startUpgradeLoop(bot)

    if (bot.ctype !== "merchant") {
        const friendlyRogues = FRIENDLY_ROGUES
        const moveLoop = async () => {
            try {
                if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

                // If we are dead, respawn
                if (bot.rip) {
                    await bot.respawn()
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                    return
                }

                // NOTE: TEMPORARY FOR FARMING MUMMIES
                // // Get a MH if we're on the default server and we don't have one
                // if (!bot.s.monsterhunt && bot.server.name == DEFAULT_IDENTIFIER && bot.server.region == DEFAULT_REGION) {
                //     await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
                //     await bot.getMonsterHuntQuest()
                //     bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                //     return
                // }

                // Turn in our monsterhunt if we can
                if (bot.s.monsterhunt && bot.s.monsterhunt.c == 0) {
                    await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
                    await bot.finishMonsterHuntQuest()
                    // NOTE: TEMPORARY FOR FARMING MUMMIES
                    // await bot.getMonsterHuntQuest()
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                    return
                }

                // Get some holiday spirit if it's Christmas
                if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                    await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                    return
                }

                // Get some buffs from rogues
                if (!bot.s.rspeed) {
                    const friendlyRogue = await AL.PlayerModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 120000 }, name: { $in: friendlyRogues } }).lean().exec()
                    if (friendlyRogue) {
                        await bot.smartMove(friendlyRogue, { getWithin: 20 })
                        if (!bot.s.rspeed) await sleep(2500)
                        if (!bot.s.rspeed) friendlyRogues.splice(friendlyRogues.indexOf(friendlyRogue.id), 1) // They're not giving rspeed, remove them from our list
                        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
                        return
                    }
                }

                // Get a luck elixir
                if (!bot.slots.elixir && !bot.hasItem("computer") && bot.gold > bot.G.items.elixirluck.g) {
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
            bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, LOOP_MS * 2))
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
                if (newTarget !== information.bot1.target) console.log(`changing ${information.bot2.name}'s target from ${information.bot2.target} to ${newTarget}`)
                information.bot2.target = newTarget
            } else if (bot.id == information.bot3.name) {
                if (newTarget !== information.bot3.target) bot.stopSmartMove()
                if (newTarget !== information.bot3.target) console.log(`changing ${information.bot1.name}'s target from ${information.bot3.target} to ${newTarget}`)
                information.bot3.target = newTarget
            } else if (bot.id == information.merchant.target) {
                if (newTarget !== information.merchant.target) bot.stopSmartMove()
                if (newTarget !== information.bot1.target) console.log(`changing ${information.merchant.name}'s target from ${information.merchant.target} to ${newTarget}`)
                information.merchant.target = newTarget
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { await targetLoop() }, 1000)
    }
    setTimeout(async () => { await targetLoop() }, 10000) // Offset by a few seconds so characters can load
}