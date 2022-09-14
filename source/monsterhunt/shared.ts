import AL, { Character, CMData, Constants, Entity, IPosition, ItemName, LimitDCReportData, Mage, Merchant, MonsterName, NPCName, Paladin, Priest, Ranger, Rogue, ServerIdentifier, ServerInfoDataLive, ServerRegion, SlotType, SmartMoveOptions, Tools, Warrior } from "alclient"
import { calculateAttackLoopCooldown, checkOnlyEveryMS, getMonsterHuntTargets, getPriority1Entities, getPriority2Entities, goGetRspeedBuff, goToNearestWalkableToMonster2, ITEMS_TO_BUY, ITEMS_TO_HOLD, ITEMS_TO_LIST, LOOP_MS, REPLENISHABLES_TO_BUY, startAvoidStacking, startBuyFriendsReplenishablesLoop, startBuyLoop, startCompoundLoop, startCraftLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startScareLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "../base/general.js"
import { attackTheseTypesMage, magiportStrangerIfNotNearby } from "../base/mage.js"
import { attackTheseTypesMerchant, doBanking, doEmergencyBanking, goFishing, goMining, merchantSmartMove, startMluckLoop } from "../base/merchant.js"
import { attackTheseTypesPriest, startDarkBlessingLoop, startPartyHealLoop } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesWarrior, startChargeLoop, startHardshellLoop, startWarcryLoop } from "../base/warrior.js"
import { Information, Strategy } from "../definitions/bot.js"
import { attackTheseTypesRogue, startRSpeedLoop } from "../base/rogue.js"
import { attackTheseTypesPaladin } from "../base/paladin.js"
import { mainCrabs } from "../base/locations.js"

const DEFAULT_TARGET: MonsterName = "goo"

export const DEFAULT_REGION: ServerRegion = "US"
export const DEFAULT_IDENTIFIER: ServerIdentifier = "I"

export async function getTarget(bot: Character, strategy: Strategy, information: Information): Promise<MonsterName> {
    for (const entity of await getPriority1Entities(bot)) {
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requireCtype &&
            !((information.bot1.bot?.ctype == strategy[entity.type].requireCtype && information.bot1.target == entity.type)
            || (information.bot2.bot?.ctype == strategy[entity.type].requireCtype && information.bot2.target == entity.type)
            || (information.bot3.bot?.ctype == strategy[entity.type].requireCtype && information.bot3.target == entity.type)
            || (information.merchant.bot?.ctype == strategy[entity.type].requireCtype && information.merchant.target == entity.type))) continue
        const realEntity = bot.entities.get(entity.name) || bot.entities.get((entity as Entity).id)
        if (realEntity) {
            return realEntity.type
        } else {
            if (AL.Tools.distance(bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {
                // We're close, but we can't see the entity. It's probably dead
                AL.Database.nextUpdate.set(`${bot.server.name}${bot.server.region}${entity.name}`, Date.now() + Constants.MONGO_UPDATE_MS)
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
            || (information.bot3.bot?.ctype == strategy[entity.type].requireCtype && information.bot3.target == entity.type)
            || (information.merchant.bot?.ctype == strategy[entity.type].requireCtype && information.merchant.target == entity.type))) continue
        const realEntity = bot.entities.get(entity.name) || bot.entities.get((entity as Entity).id)
        if (realEntity) {
            if (realEntity.couldGiveCreditForKill(bot)) return realEntity.type

            // Update the database to let others know that this entity is taken
            AL.Database.nextUpdate.set(`${bot.server.name}${bot.server.region}${realEntity.id}`, Date.now() + Constants.MONGO_UPDATE_MS)
            await AL.EntityModel.updateOne({ name: realEntity.id, serverIdentifier: bot.serverData.name, serverRegion: bot.serverData.region, type: realEntity.type },
                { hp: realEntity.hp, lastSeen: Date.now(), level: realEntity.level, map: realEntity.map, target: realEntity.target, x: realEntity.x, y: realEntity.y },
                { upsert: true }).lean().exec()
        } else {
            if (AL.Tools.distance(bot, entity) < AL.Constants.MAX_VISIBLE_RANGE / 2) {
                // We're close, but we can't see the entity. It's probably dead
                AL.Database.nextUpdate.set(`${bot.server.name}${bot.server.region}${entity.name}`, Date.now() + Constants.MONGO_UPDATE_MS)
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
            || (information.bot3.bot?.ctype == strategy[type].requireCtype && information.bot3.target == type)
            || (information.merchant.bot?.ctype == strategy[type].requireCtype && information.merchant.target == type))) continue

        return type
    }

    return strategy.defaultTarget ?? DEFAULT_TARGET
}

export async function startMage(bot: Mage, information: Information, strategy: Strategy, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER): Promise<void> {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)

    bot.socket.on("cm", async (data: CMData) => {
        if (partyMembers.includes(data.name)) {
            // Friendly CM
            const parsedData = JSON.parse(data.message)

            if (parsedData == "magiport") {
                // Let mages do magiport requests for party members
                console.log(`${bot.id} is going to try to magiport ${data.name}!`)
                magiportStrangerIfNotNearby(bot, data.name)
            }

            return
        }

        console.log(`~~~ CM from ${data.name} DEBUG ~~~`)
        console.log(data)
        console.log("~~~ party members ~~~")
        console.log(partyMembers)
    })

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
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
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

            if (target && strategy[target]) {
                // Equipment
                if (strategy[target].equipment) {
                    for (const s in strategy[target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[target].equipment[slot]
                        if (!itemName) continue // No equipment for this strategy
                        const wType = bot.G.items[itemName].wtype

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)
}

export async function startMerchant(bot: Merchant, information: Information, strategy: Strategy, standPlace: IPosition, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER): Promise<void> {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)
    startBuyFriendsReplenishablesLoop(bot, information.friends)
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
        const dartGun = bot.locateItem("dartgun", bot.items, { returnHighestLevel: true })
        if (dartGun !== undefined) await bot.equip(dartGun, "mainhand")
        const wbook0 = bot.locateItem("wbook0", bot.items, { returnHighestLevel: true })
        const wbook1 = bot.locateItem("wbook1", bot.items, { returnHighestLevel: true })
        if (wbook1 !== undefined) await bot.equip(wbook1, "offhand")
        else if (wbook0 !== undefined) await bot.equip(wbook0, "offhand")
    } catch (e) {
        console.error(e)
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (
                bot.rip // We are dead
                || bot.c.town // We are teleporting to town
                || bot.c.fishing // We are fishing
                || bot.c.mining // We are mining
            ) {
                // We are dead
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
                return
            }

            if (information.merchant.target
                && strategy[information.merchant.target]
                && !bot.isOnCooldown("scare")) {
                // Equipment
                if (strategy[information.merchant.target].equipment) {
                    for (const s in strategy[information.merchant.target].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[information.merchant.target].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)

    async function moveLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Wait for mining and fishing to complete
            if (bot.c.mining || bot.c.fishing) {
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // If we are full, let's go to the bank
            if (checkOnlyEveryMS(`${bot.id}_bank`, 120000) || bot.isFull() || bot.hasPvPMarkedItem()) {
                await doBanking(bot)
                await doEmergencyBanking(bot)
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Get some holiday spirit if it's Christmas
            if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                await merchantSmartMove(bot, "newyear_tree", { attackWhileMoving: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                // TODO: Improve ALClient by making this a function
                bot.socket.volatile.emit("interaction", { type: "newyear_tree" })
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, Math.min(...bot.pings) * 2))
                return
            }

            // Get some buffs from rogues
            if (checkOnlyEveryMS(`${bot.id}_rspeed`, 10000)) await goGetRspeedBuff(bot)

            // mluck our friends
            if (bot.canUse("mluck", { ignoreCooldown: true })) {
                for (const friend of information.friends) {
                    if (!friend) continue
                    if (friend.id == bot.id) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(bot, friend) > bot.G.skills.mluck.range) {
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await merchantSmartMove(bot, friend, { attackWhileMoving: true, getWithin: bot.G.skills.mluck.range / 2, stopIfTrue: () => (friend.s.mluck?.strong && friend.s.mluck?.ms >= 120000) || Tools.distance(bot.smartMoving, friend) > bot.G.skills.mluck.range })
                        }

                        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                        return
                    }
                }
            }

            for (const friend of information.friends) {
                if (!friend) continue
                if (friend.id == bot.id) continue

                // Get stuff from our friends
                if (friend.isFull()) {
                    await merchantSmartMove(bot, friend, { attackWhileMoving: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, stopIfTrue: () => bot.isFull() || !friend.isFull() || Tools.distance(bot.smartMoving, friend) > 400 })
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                    return
                }

                // Buy stuff for our friends
                if (!(friend.hasItem("computer") || friend.hasItem("supercomputer"))
                && (bot.hasItem(["computer", "supercomputer"]))) {
                    // Go buy replenishables for them, since they don't have a computer
                    for (const [item, amount] of REPLENISHABLES_TO_BUY) {
                        if (friend.countItem(item) > amount * 0.25) continue // They have enough
                        if (!bot.canBuy(item)) continue // We can't buy them this for them
                        await merchantSmartMove(bot, friend, { attackWhileMoving: true, getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, stopIfTrue: () => !bot.canBuy(item) || friend.countItem(item) > amount * 0.25 || Tools.distance(bot.smartMoving, friend) > 400 })

                        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                        return
                    }
                }
            }

            // Move to our target if we have one
            if (strategy[information.merchant.target]) {
                await strategy[information.merchant.target].move()
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Go fishing if we can
            await goFishing(bot)
            if (bot.canUse("fishing", { ignoreEquipped: true })) {
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            // Go mining if we can
            await goMining(bot)
            if (bot.canUse("mining", { ignoreEquipped: true })) {
                bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                return
            }

            if ((bot.id == "earthMer" || bot.id == "earthMer2") && bot.canUse("mluck", { ignoreCooldown: true })) {
                // MLuck people if there is a server info target
                for (const mN in bot.S) {
                    const type = mN as MonsterName
                    if (!(bot.S[type] as ServerInfoDataLive).live) continue
                    if (!(bot.S[type] as ServerInfoDataLive).target) continue
                    if (bot.S[type]["x"] == undefined || bot.S[type]["y"] == undefined) continue // No location data

                    if (AL.Tools.distance(bot, (bot.S[type] as IPosition)) > 100) {
                        await merchantSmartMove(bot, (bot.S[type] as IPosition), { attackWhileMoving: true, getWithin: 100 })
                    }

                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
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
                        console.log(`[merchant] We are moving to ${stranger.name} to mluck them!`)
                        await merchantSmartMove(bot, stranger, { attackWhileMoving: true, getWithin: bot.G.skills.mluck.range / 2 })
                    }

                    setTimeout(moveLoop, 250)
                    return
                }
            }

            // Hang out near crabs
            if (!bot.isEquipped("dartgun") && bot.hasItem("dartgun")) await bot.equip(bot.locateItem("dartgun", bot.items, { returnHighestLevel: true }), "mainhand")
            if (!bot.isEquipped("wbook1") && bot.hasItem("wbook1")) await bot.equip(bot.locateItem("wbook1", bot.items, { returnHighestLevel: true }), "offhand")
            else if (!bot.isEquipped("wbook0") && bot.hasItem("wbook0")) await bot.equip(bot.locateItem("wbook0", bot.items, { returnHighestLevel: true }), "offhand")
            if (!bot.isEquipped("zapper") && bot.hasItem("zapper")) await bot.equip(bot.locateItem("zapper", bot.items, { returnHighestLevel: true }), "ring1")
            await bot.smartMove(mainCrabs)
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
    }
    moveLoop().catch(console.error)

    async function merchantLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.stand || bot.rip) {
                // Dead, or stand isn't open
                bot.timeouts.set("merchantLoop", setTimeout(merchantLoop, LOOP_MS))
                return
            }

            if (ITEMS_TO_LIST["tracker"] // We are selling trackers
                && !bot.isListedForSale("tracker") // We don't have a tracker listed
                && !bot.hasItem("tracker", bot.items, { locked: false }) // We don't have an unlocked tracker
                && bot.countItem("monstertoken") > 4) { // We can trade tokens for one
                // Buy a tracker with tokens
                await bot.buyWithTokens("tracker")
                const tracker = bot.locateItem("tracker", this.items, { locked: false })
                await bot.listForSale(tracker, ITEMS_TO_LIST["tracker"][0])
            }

            for (const tL in ITEMS_TO_LIST) {
                const item = tL as ItemName
                const listData = ITEMS_TO_LIST[item]

                for (const invItem of bot.locateItems(item, bot.items, { locked: false, special: false })) {
                    const itemInfo = bot.items[invItem]
                    const level = itemInfo.level ?? 0
                    const price = listData[level]
                    if (price) {
                        if (!itemInfo.q) await bot.listForSale(invItem, price)
                        else await bot.listForSale(invItem, price, undefined, itemInfo.q)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("merchantLoop", setTimeout(merchantLoop, LOOP_MS))
    }
    merchantLoop().catch(console.error)
}


export async function startPaladin(bot: Paladin, information: Information, strategy: Strategy, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER): Promise<void> {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)

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
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
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

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesPaladin(bot, idleTargets, information.friends)

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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)
}

export async function startPriest(bot: Priest, information: Information, strategy: Strategy, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER): Promise<void> {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)
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
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
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

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (i !== undefined) await bot.equip(i, slot)
                        }
                    }
                }

                // Strategy
                await strategy[target].attack()
            }

            // Idle strategy
            await attackTheseTypesPriest(bot, idleTargets, information.friends, { healStrangers: true })

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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)
}

export async function startRanger(bot: Ranger, information: Information, strategy: Strategy, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER): Promise<void> {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)

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
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
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

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)
}

export async function startRogue(bot: Rogue, information: Information, strategy: Strategy, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER): Promise<void> {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)

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
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
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

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)
}

export async function startWarrior(bot: Warrior, information: Information, strategy: Strategy, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER) {
    await startShared(bot, strategy, information, partyLeader, partyMembers, defaultRegion, defaultIdentifier)

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
                bot.timeouts.set("attackLoop", setTimeout(attackLoop, LOOP_MS))
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
                        if (itemName == undefined) continue // We aren't equipping anything in this slot
                        const wType = bot.G.items[itemName].wtype

                        if (bot.slots[slot]?.name == itemName) {
                            // We already have it equipped, see if there's a higher level item to equip
                            const alternative = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
                            if (alternative !== undefined && bot.items[alternative].level > bot.slots[slot].level) {
                                // We have a higher level item in our inventory, equip that instead
                                await bot.equip(alternative, slot)
                            }
                            continue
                        }

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
                            const i = bot.locateItem(itemName, bot.items, { returnHighestLevel: true })
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
        bot.timeouts.set("attackLoop", setTimeout(attackLoop, calculateAttackLoopCooldown(bot)))
    }
    attackLoop().catch(console.error)
}

export async function startShared(bot: Character, strategy: Strategy, information: Information, partyLeader: string, partyMembers: string[], defaultRegion = DEFAULT_REGION, defaultIdentifier = DEFAULT_IDENTIFIER) {
    const magiporters = new Set(["Bjarny", "Clarity", ...partyMembers])
    bot.socket.on("magiport", async (data: { name: string }) => {
        if (magiporters.has(data.name)) {
            await bot.acceptMagiport(data.name)
            await bot.stopSmartMove()
            await bot.stopWarpToTown()
            await bot.sendGold(data.name, 10_000)
            return
        }
    })

    bot.socket.on("cm", async (data: CMData) => {
        console.log(`~~~ CM from ${data.name} DEBUG ~~~`)
        console.log(data)
    })

    bot.socket.on("limitdcreport", async (data: LimitDCReportData) => {
        console.log("~~ disconnected for doing too many things ~~")
        console.log(data)
    })

    startAvoidStacking(bot)

    if (bot.ctype == "merchant") {
        // Keep scrolls stocked up to help avoid the inventory from filling up
        const replenishables = [...REPLENISHABLES_TO_BUY]
        replenishables.push(["cscroll0", 200], ["cscroll1", 20], ["cscroll2", 2], ["scroll0", 200], ["scroll1", 20], ["scroll2", 2])
        startBuyLoop(bot, ITEMS_TO_BUY, replenishables)
    } else {
        startBuyLoop(bot)
    }
    startCompoundLoop(bot)
    startCraftLoop(bot)
    if (bot.ctype !== "merchant") startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot, information.friends)
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
        const moveLoop = async () => {
            try {
                if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

                // If we are dead, respawn
                if (bot.rip) {
                    await bot.respawn()
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                    return
                }

                // Get a MH if we're on the default server and we don't have one
                if (!bot.s.monsterhunt && bot.server.name == defaultIdentifier && bot.server.region == defaultRegion) {
                    await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, useBlink: true })
                    await bot.getMonsterHuntQuest()
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, LOOP_MS * 2))
                    return
                }

                // Turn in our monsterhunt if we can
                if (bot.s.monsterhunt && bot.s.monsterhunt.c == 0) {
                    const [region, id] = bot.s.monsterhunt.sn.split(" ") as [ServerRegion, ServerIdentifier]
                    if (region == bot.serverData.region && id == bot.serverData.name) {
                        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, useBlink: true })
                        await bot.finishMonsterHuntQuest()
                        await bot.getMonsterHuntQuest()
                        bot.timeouts.set("moveLoop", setTimeout(moveLoop, LOOP_MS * 2))
                        return
                    }
                }

                // Get some holiday spirit if it's Christmas
                if (bot.S && bot.S.holidayseason && !bot.s.holidayspirit) {
                    await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
                    // TODO: Improve ALClient by making this a function
                    bot.socket.volatile.emit("interaction", { type: "newyear_tree" })
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, Math.min(...bot.pings) * 2))
                    return
                }

                // Get some buffs from rogues
                if (checkOnlyEveryMS(`${bot.id}_rspeed`, 10000)) await goGetRspeedBuff(bot)

                // NOTE: I don't know if it's implemented incorrectly, but @Wizard implied that it no longer (never in the first place?)
                //       gives blessing to other players, only your own.
                // // Get some newcomersblessing
                // if (!bot.s.newcomersblessing) {
                //     const newPlayer = await AL.PlayerModel.findOne({ $expr: { $eq: ["$name", "$s.newcomersblessing.f"] }, lastSeen: { $gt: Date.now() - 120_000 }, serverIdentifier: bot.server.name, serverRegion: bot.server.region }).lean().exec()
                //     if (newPlayer) {
                //         await bot.smartMove(newPlayer, { getWithin: 20 })
                //         bot.timeouts.set("moveLoop", setTimeout(moveLoop, LOOP_MS * 2))
                //         return
                //     }
                // }

                // Get a luck elixir
                if (!bot.slots.elixir
                     && !(bot.hasItem(["computer", "supercomputer"]))
                     && bot.canBuy("elixirluck", { ignoreLocation: true })
                     && !bot.isFull()) {
                    await bot.smartMove("elixirluck")
                }

                // Join daily event
                if (bot.S.goobrawl) {
                    if (bot.map !== "goobrawl") await bot.join("goobrawl")
                    goToNearestWalkableToMonster2(bot, ["rgoo", "bgoo", "goo"])
                    bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
                    return
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
            bot.timeouts.set("moveLoop", setTimeout(moveLoop, 250))
        }
        moveLoop().catch(console.error)
    }

    async function targetLoop(): Promise<void> {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const newTarget = await getTarget(bot, strategy, information)
            if (bot.id == information.bot1.name) {
                if (newTarget !== information.bot1.target) bot.stopSmartMove().catch(() => { /** Suppress */ })
                if (newTarget !== information.bot1.target) console.log(`changing ${information.bot1.name}'s target from ${information.bot1.target} to ${newTarget}`)
                information.bot1.target = newTarget
            } else if (bot.id == information.bot2.name) {
                if (newTarget !== information.bot2.target) bot.stopSmartMove().catch(() => { /** Suppress */ })
                if (newTarget !== information.bot2.target) console.log(`changing ${information.bot2.name}'s target from ${information.bot2.target} to ${newTarget}`)
                information.bot2.target = newTarget
            } else if (bot.id == information.bot3.name) {
                if (newTarget !== information.bot3.target) bot.stopSmartMove().catch(() => { /** Suppress */ })
                if (newTarget !== information.bot3.target) console.log(`changing ${information.bot3.name}'s target from ${information.bot3.target} to ${newTarget}`)
                information.bot3.target = newTarget
            } else if (bot.id == information.merchant.name) {
                if (newTarget !== information.merchant.target) bot.stopSmartMove().catch(() => { /** Suppress */ })
                if (newTarget !== information.merchant.target) console.log(`changing ${information.merchant.name}'s target from ${information.merchant.target} to ${newTarget}`)
                information.merchant.target = newTarget
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(await targetLoop, 1000)
    }
    if (bot.server.region == DEFAULT_REGION && bot.server.name == DEFAULT_IDENTIFIER) {
        setTimeout(await targetLoop, 2500) // Offset by a few seconds so characters can load
    } else {
        await targetLoop() // We're on a different server, which means there's special monsters, get to them ASAP.
    }
}