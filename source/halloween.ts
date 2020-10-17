import { ITEMS_TO_BUY, ITEMS_TO_SELL, MERCHANT_ITEMS_TO_HOLD, NPC_INTERACTION_DISTANCE, PRIEST_ITEMS_TO_HOLD, RANGER_ITEMS_TO_HOLD, WARRIOR_ITEMS_TO_HOLD } from "./constants.js"
import { CharacterModel } from "./database/characters/characters.model.js"
import { EntityModel } from "./database/entities/entities.model.js"
import { EntityData, HitData, PlayerData } from "./definitions/adventureland-server.js"
import { BankPackType, ItemInfo, ItemName, MonsterName, ServerIdentifier, ServerRegion, SlotType, TradeSlotType } from "./definitions/adventureland.js"
import { Strategy } from "./definitions/bot.js"
import { NodeData } from "./definitions/pathfinder.js"
import { Game, Merchant, PingCompensatedPlayer, Priest, Ranger, Warrior } from "./game.js"
import { Pathfinder } from "./pathfinder.js"
import { Tools } from "./tools.js"

let ranger: Ranger
let rangerTarget: MonsterName
let warrior: Warrior
let warriorTarget: MonsterName
let priest: Priest
let priestTarget: MonsterName
let merchant: Merchant
// let merchantTarget: MonsterName

async function getTarget(bot: PingCompensatedPlayer, strategy: Strategy): Promise<MonsterName> {
    // Priority #1: Special Monsters
    const entities = await EntityModel.find({ $or: [{ type: "mrpumpkin" }, { type: "mrgreen" }], serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 60000 } }).sort({ hp: 1 }).lean().exec()
    for (const entity of entities) {
        // Look in database of entities
        if (!strategy[entity.type]) continue // No strategy
        if (strategy[entity.type].requirePriest && priestTarget !== entity.type) continue // Need priest
        if (bot.G.monsters[entity.type].cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

        return entity.type
    }

    // Priority #3: Minimush, because they're close to mrpumpkin
    return "minimush"
}

async function generalBotStuff(bot: PingCompensatedPlayer) {
    bot.socket.on("magiport", async (data: { name: string }) => {
        if (["Bjarny", "earthMag"].includes(data.name)) {
            await bot.acceptMagiport(data.name)
            return
        }
    })

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }

            for (const ponty of bot.locateNPCs("secondhands")) {
                if (Tools.distance(bot.character, ponty) > NPC_INTERACTION_DISTANCE) continue
                const pontyItems = await bot.getPontyItems()
                for (const item of pontyItems) {
                    if (!item) continue

                    if (
                        item.p // Buy all shiny/glitched/etc. items
                        || ITEMS_TO_BUY.includes(item.name) // Buy anything in our buy list
                    ) {
                        await bot.buyFromPonty(item)
                        continue
                    }
                }
            }

            // Look for buyable things on merchants
            for (const [, player] of bot.players) {
                if (!player.stand) continue // Not selling anything
                if (Tools.distance(bot.character, player) > NPC_INTERACTION_DISTANCE) continue // Too far away

                for (const s in player.slots) {
                    const slot = s as TradeSlotType
                    const item = player.slots[slot]
                    if (!item) continue // Nothing in the slot
                    if (!item.rid) continue // Not a trade item

                    const q = item.q === undefined ? 1 : item.q

                    // Join new giveaways
                    if (item.giveaway && bot.character.ctype == "merchant" && item.list && item.list.includes(bot.character.id)) {
                        // TODO: Move this to a function
                        bot.socket.emit("join_giveaway", { slot: slot, id: player.id, rid: item.rid })
                    }

                    // Buy if we can resell to NPC for more money
                    const gInfo = bot.G.items[item.name]
                    if ((item.price < gInfo.g * 0.6) // Item is lower price than G.
                        || ITEMS_TO_BUY.includes(item.name) && item.price <= gInfo.g // Item is the same, or lower price than the NPC would sell for, and we want it.
                    ) {
                        await bot.buyFromMerchant(player.id, slot, item.rid, q)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 1000)
    }
    buyLoop()

    async function compoundLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.q.compound) {
                // We are upgrading, we have to wait
                setTimeout(async () => { compoundLoop() }, bot.character.q.compound.ms)
                return
            }
            if (bot.character.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                setTimeout(async () => { compoundLoop() }, 1000)
                return
            }

            const duplicates = bot.locateDuplicateItems()
            for (const iN in duplicates) {
                const itemName = iN as ItemName
                const numDuplicates = duplicates[iN].length

                // Check if there's enough to compound
                if (numDuplicates < 3) {
                    delete duplicates[itemName]
                    continue
                }

                // Check if there's three with the same level. If there is, set the array to those three
                let found = false
                for (let i = 0; i < numDuplicates - 2; i++) {
                    const item1 = bot.character.items[duplicates[itemName][i]]
                    const item2 = bot.character.items[duplicates[itemName][i + 1]]
                    const item3 = bot.character.items[duplicates[itemName][i + 2]]

                    if (item1.level == item2.level && item1.level == item3.level) {
                        duplicates[itemName] = duplicates[itemName].splice(i, 3)
                        found = true
                        break
                    }
                }
                if (!found) delete duplicates[itemName]
            }

            // At this point, 'duplicates' only contains arrays of 3 items.
            for (const iN in duplicates) {
                // Check if item is upgradable, or if we want to upgrade it
                const itemName = iN as ItemName
                const gInfo = bot.G.items[itemName]
                if (gInfo.compound == undefined) continue // Not compoundable
                const itemPoss = duplicates[itemName]
                const itemInfo = bot.character.items[itemPoss[0]]
                if (itemInfo.level >= 4) continue // We don't want to compound past level 4 automatically.
                if (ITEMS_TO_SELL[itemName]) continue // Don't compound items we want to sell

                // Figure out the scroll we need to upgrade
                const grade = await Tools.calculateItemGrade(itemInfo)
                const cscrollName = `cscroll${grade}` as ItemName
                let cscrollPos = bot.locateItem(cscrollName)
                if (cscrollPos == undefined && !bot.canBuy(cscrollName)) continue // We can't buy a scroll for whatever reason :(
                else if (cscrollPos == undefined) cscrollPos = await bot.buy(cscrollName)

                // Compound!
                await bot.compound(itemPoss[0], itemPoss[1], itemPoss[2], cscrollPos)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { compoundLoop() }, 250)
    }
    compoundLoop()

    async function elixirLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!bot.character.slots.elixir) {
                let luckElixir = bot.locateItem("elixirluck")
                if (luckElixir == undefined && bot.character.gold >= bot.G.items.elixirluck.g && !bot.isFull()) luckElixir = await bot.buy("elixirluck")
                if (luckElixir !== undefined) await bot.equip(luckElixir)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { elixirLoop() }, 1000)
    }
    elixirLoop()

    // async function exchangeLoop() {
    //     try {
    //         if (bot.socket.disconnected) return

    //         // TODO: Make bot.canExchange() function and replace the following line with thatF
    //         const hasComputer = bot.locateItem("computer") !== undefined

    //         if (hasComputer) {
    //             for (let i = 0; i < bot.character.items.length; i++) {
    //                 const item = bot.character.items[i]
    //                 if (!item) continue
    //                 if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Don't want / can't exchange

    //                 const gInfo = bot.G.items[item.name]
    //                 if (gInfo.e !== undefined && item.q < gInfo.e) continue // Don't have enough to exchange

    //                 await bot.exchange(i)
    //             }
    //         }
    //     } catch (e) {
    //         console.error(e)
    //     }

    //     setTimeout(async () => { exchangeLoop() }, 250)
    // }
    // exchangeLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const mpot1 = bot.locateItem("mpot1")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1) {
                    await bot.useMPPot(mpot1)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1) {
                    await bot.useHPPot(hpot1)
                } else {
                    await bot.regenHP()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            if (bot.socket.disconnected) return

            for (const [id, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                await bot.openChest(id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 500)
    }
    lootLoop()

    bot.socket.on("hit", async (data: HitData) => {
        if (!data.stacked) return
        if (!data.stacked.includes(bot.character.id)) return // We're not stacked, lol.

        console.info(`Scrambling ${bot.character.id} because we're stacked!`)

        const x = -25 + Math.round(50 * Math.random())
        const y = -25 + Math.round(50 * Math.random())
        try {
            await bot.move(bot.character.x + x, bot.character.y + y)
        } catch (e) { /** Supress errors */ }
    })

    async function partyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!bot.party) {
                bot.sendPartyRequest(merchant.character.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()

    async function sellLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.hasItem("computer")) {
                // Sell things
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item) continue // No item in this slot
                    if (item.p) continue // This item is special in some way
                    if (ITEMS_TO_SELL[item.name] == undefined) continue // We don't want to sell this item
                    if (ITEMS_TO_SELL[item.name] <= item.level) continue // Keep this item, it's a high enough level that we want to keep it

                    const q = bot.character.items[i].q !== undefined ? bot.character.items[i].q : 1

                    await bot.sell(i, q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellLoop() }, 1000)
    }
    sellLoop()

    async function upgradeLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.q.upgrade) {
                // We are upgrading, we have to wait
                setTimeout(async () => { upgradeLoop() }, bot.character.q.upgrade.ms)
                return
            }
            if (bot.character.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                setTimeout(async () => { upgradeLoop() }, 1000)
                return
            }

            // Find items that we have two (or more) of, and upgrade them if we can
            const duplicates = bot.locateDuplicateItems()
            for (const iN in duplicates) {
                // Check if item is upgradable, or if we want to upgrade it
                const itemName = iN as ItemName
                const gInfo = bot.G.items[itemName]
                if (gInfo.upgrade == undefined) continue // Not upgradable
                const itemPos = duplicates[itemName][0]
                const itemInfo = bot.character.items[itemPos]
                if (itemInfo.level >= 8) continue // We don't want to upgrade past level 8 automatically.
                if (ITEMS_TO_SELL[itemName]) continue // Don't upgrade items we want to sell

                // Figure out the scroll we need to upgrade
                const grade = await Tools.calculateItemGrade(itemInfo)
                const scrollName = `scroll${grade}` as ItemName
                let scrollPos = bot.locateItem(scrollName)
                try {
                    if (scrollPos == undefined && !bot.canBuy(scrollName)) continue // We can't buy a scroll for whatever reason :(
                    else if (scrollPos == undefined) scrollPos = await bot.buy(scrollName)

                    // Upgrade!
                    await bot.upgrade(itemPos, scrollPos)
                } catch (e) {
                    console.error(e)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { upgradeLoop() }, 250)
    }
    upgradeLoop()
}

async function startRanger(bot: Ranger) {
    console.info(`Starting ranger (${bot.character.id})`)

    const defaultAttackStrategy = async (mtype: MonsterName): Promise<number> => {
        if (bot.canUse("attack")) {
            const targets: EntityData[] = []
            const threeshotTargets: EntityData[] = []
            const fiveshotTargets: EntityData[] = []
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)

                // If we can kill enough monsters in one shot, let's try to do that
                // If the monster is targeting our friend, let's take advantage of that and attack it with multishot if we can
                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                else if ([ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) threeshotTargets.push(entity)
                if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
                else if ([ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) fiveshotTargets.push(entity)
            }

            if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
                // Remove from other characters if we're going to kill it
                for (const target of [fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4]]) {
                    if (await Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }

                await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
            } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
                // Remove from other characters if we're going to kill it
                for (const target of [threeshotTargets[0], threeshotTargets[1], threeshotTargets[2]]) {
                    if (await Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }

                await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
            } else if (targets.length) {
                if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                    // Remove from other characters if we're going to kill it
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(targets[0].id)
                    }
                }

                // If we can do more damage with piercingshot, use that
                const gInfo = bot.G.skills.piercingshot
                const piercingShotEntity = { ...targets[0] }
                piercingShotEntity.armor -= gInfo.apiercing
                if (bot.canUse("piercingshot")
                    && Tools.calculateDamageRange(bot.character, piercingShotEntity)[0] * gInfo.damage_multiplier > Tools.calculateDamageRange(bot.character, targets[0])[0]) {
                    await bot.piercingShot(targets[0].id)
                } else {
                    await bot.attack(targets[0].id)
                }
            }
        }

        if (bot.canUse("supershot")) {
            const targets: string[] = []
            for (const [id, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
                if (entity.immune) continue // Entity won't take damage from supershot

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(id)

                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0] * bot.G.skills.supershot.damage_multiplier
                if (minimumDamage > entity.hp) {
                    // Stop looking for another one to attack, since we can kill this one in one hit.
                    targets[0] = id
                    break
                }
            }

            if (targets.length) {
                await bot.superShot(targets[0])
            }
        }

        return Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))
    }
    const tankAttackStrategy = async (mtype: MonsterName, tank: string) => {
        if (!bot.players.has(priest.character.id)) return 250 // Priest isn't here

        // If we have a target scare it away
        for (const [, entity] of bot.entities) {
            if (entity.target == bot.character.id) {
                if (bot.canUse("scare")) await bot.scare()
                return bot.getCooldown("scare") // Don't attack until we have scare available again
            }
        }

        if (bot.canUse("attack")) {
            const targets: EntityData[] = []
            const threeshotTargets: EntityData[] = []
            const fiveshotTargets: EntityData[] = []
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.target !== tank) continue // It's not targeting our tank
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)

                // If we can kill enough monsters in one shot, let's try to do that
                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
            }

            if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
                // Remove from other characters if we're going to kill it
                for (const target of [fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4]]) {
                    if (await Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
                await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
            } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
                // Remove from other characters if we're going to kill it
                for (const target of [threeshotTargets[0], threeshotTargets[1], threeshotTargets[2]]) {
                    if (await Tools.isGuaranteedKill(bot.character, target)) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(target.id)
                        }
                    }
                }
                await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
            } else if (targets.length) {
                if (bot.canUse("huntersmark")) {
                    await bot.huntersMark(targets[0].id)
                }

                // Remove from other characters if we're going to kill it
                if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(targets[0].id)
                    }
                }

                // If we can do more damage with a piercingshot, use that
                const gInfo = bot.G.skills.piercingshot
                const piercingShotEntity = { ...targets[0] }
                piercingShotEntity.armor -= gInfo.apiercing
                if (bot.canUse("piercingshot")
                    && Tools.calculateDamageRange(bot.character, piercingShotEntity)[0] * gInfo.damage_multiplier > Tools.calculateDamageRange(bot.character, targets[0])[0]) {
                    await bot.piercingShot(targets[0].id)
                } else {
                    await bot.attack(targets[0].id)
                }
            }
        }

        if (bot.canUse("supershot")) {
            const targets: string[] = []
            for (const [id, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.target != tank) continue // It's not targeting our tank
                if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (entity.immune) continue // Entity won't take damage from supershot

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(id)

                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0] * bot.G.skills.supershot.damage_multiplier
                if (minimumDamage > entity.hp) {
                    // Stop looking for another one to attack, since we can kill this one in one hit.
                    targets[0] = id
                    break
                }
            }

            if (targets.length) {
                await bot.superShot(targets[0])
            }
        }

        return Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))
    }
    const holdPositionMoveStrategy = async (position: NodeData) => {
        try {
            if (Tools.distance(bot.character, position) > 0) await bot.smartMove(position)
        } catch (e) {
            console.error(e)
        }
        return 1000
    }
    const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
        let closestEntitiy: EntityData
        let closestDistance: number = Number.MAX_VALUE
        for (const [, entity] of bot.entities) {
            if (entity.type !== mtype) continue
            if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

            // If the target will die to incoming projectiles, ignore it
            if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

            // If the target will burn to death, ignore it
            if (Tools.willBurnToDeath(entity)) continue

            const distance = Tools.distance(bot.character, entity)
            if (distance < closestDistance) {
                closestDistance = distance
                closestEntitiy = entity
            }
        }

        try {
            if (!closestEntitiy && !bot.character.moving) await bot.smartMove(position)
            else if (closestEntitiy && Tools.distance(bot.character, closestEntitiy) > bot.character.range) await bot.smartMove(closestEntitiy, { getWithin: bot.character.range - closestEntitiy.speed })
        } catch (e) {
            // console.error(e)
            bot.stopSmartMove()
        }
        return 250
    }
    const specialMonsterMoveStrategy = async (mtype: MonsterName) => {
        try {
            // Look in nearby entities for monster
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) <= bot.character.range) return 250 // We're in range
                await bot.smartMove(entity, { getWithin: bot.character.range - 10 })
                return 250
            }

            // Look in 'S' for monster
            if (bot.S && bot.S[mtype] && bot.S[mtype].live) {
                if (Tools.distance(bot.character, bot.S[mtype]) <= bot.character.range) return 250 // We're in range
                await bot.smartMove(bot.S[mtype], { getWithin: bot.character.range - 10 })
                return 250
            }

            // Look in database for monster
            const specialTarget = await EntityModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, type: mtype }).lean().exec()
            if (specialTarget) {
                await bot.smartMove(specialTarget, { getWithin: bot.character.range - 10 })
            } else {
                // See if there's a spawn for them. If there is, go check there
                for (const spawn of bot.locateMonsters(mtype)) {
                    await bot.smartMove(spawn, { getWithin: 300 })

                    // Check if we've found it
                    let monsterIsNear = false
                    for (const [, entity] of bot.entities) {
                        if (entity.type !== mtype) continue
                        monsterIsNear = true
                        break
                    }
                    if (monsterIsNear) break
                }
            }
        } catch (e) {
            console.error(e)
        }
        return 100
    }
    const waypointMoveStrategy = async (positions: NodeData[]) => {
        try {
            for (const position of positions) {
                await bot.smartMove(position)
            }
        } catch (e) {
            console.error(e)
        }
        return 100
    }
    const strategy: Strategy = {
        arcticbee: {
            attack: async () => { return await defaultAttackStrategy("arcticbee") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1082, y: -873 }) },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        armadillo: {
            attack: async () => { return await defaultAttackStrategy("armadillo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 526, y: 1846 }) },
            equipment: { mainhand: "hbow", orb: "orbg" },
            attackWhileIdle: true
        },
        bat: {
            attack: async () => { return await defaultAttackStrategy("bat") },
            move: async () => { return await holdPositionMoveStrategy({ map: "cave", x: -194, y: -461 }) },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        bbpompom: {
            attack: async () => { return await defaultAttackStrategy("bbpompom") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winter_cave", x: 51, y: -164 }) },
            equipment: { mainhand: "crossbow", orb: "jacko" }
        },
        bee: {
            attack: async () => { return await defaultAttackStrategy("bee") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 494, y: 1101 }) },
            equipment: { mainhand: "hbow" },
            attackWhileIdle: true
        },
        boar: {
            attack: async () => { return await defaultAttackStrategy("boar") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 20, y: -1109 }) },
            equipment: { mainhand: "crossbow", orb: "jacko" },
            attackWhileIdle: true
        },
        booboo: {
            attack: async () => { return await defaultAttackStrategy("booboo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 265, y: -625 }) },
            equipment: { mainhand: "crossbow", orb: "jacko" },
        },
        cgoo: {
            attack: async () => { return await defaultAttackStrategy("cgoo") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "arena", x: 0, y: -500 }, "cgoo") },
            equipment: { mainhand: "crossbow", orb: "jacko" },
            attackWhileIdle: true
        },
        crab: {
            attack: async () => { return await defaultAttackStrategy("crab") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1202, y: -66 }) },
            equipment: { mainhand: "hbow" },
            attackWhileIdle: true
        },
        crabx: {
            attack: async () => { return await defaultAttackStrategy("crabx") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -984, y: 1762 }, "crabx") },
            equipment: { mainhand: "crossbow", orb: "jacko" },
            attackWhileIdle: true
        },
        croc: {
            attack: async () => { return await defaultAttackStrategy("croc") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 801, y: 1710 }) },
            equipment: { mainhand: "crossbow" },
            attackWhileIdle: true
        },
        fireroamer: {
            attack: async () => { return await tankAttackStrategy("fireroamer", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: 160, y: -675 }) },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        fvampire: {
            attack: async () => { return await defaultAttackStrategy("fvampire") },
            move: async () => { return await specialMonsterMoveStrategy("fvampire") },
            attackWhileIdle: true,
            requirePriest: true,
        },
        ghost: {
            attack: async () => { return await defaultAttackStrategy("ghost") },
            move: async () => { return holdPositionMoveStrategy({ map: "halloween", x: 256, y: -1224 }) }
        },
        goldenbat: {
            attack: async () => { return await defaultAttackStrategy("goldenbat") },
            move: async () => { return await specialMonsterMoveStrategy("goldenbat") },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        goo: {
            attack: async () => { return await defaultAttackStrategy("goo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -32, y: 787 }) },
            equipment: { mainhand: "hbow" },
            attackWhileIdle: true
        },
        greenjr: {
            attack: async () => { return await defaultAttackStrategy("greenjr") },
            move: async () => { return await specialMonsterMoveStrategy("greenjr") },
            attackWhileIdle: true
        },
        iceroamer: {
            attack: async () => { return await defaultAttackStrategy("iceroamer") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1512, y: 104 }) },
            equipment: { mainhand: "hbow", orb: "orbg" }
        },
        jr: {
            attack: async () => { return await defaultAttackStrategy("jr") },
            move: async () => { return await specialMonsterMoveStrategy("jr") },
            attackWhileIdle: true
        },
        minimush: {
            attack: async () => { return await defaultAttackStrategy("minimush") },
            move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: 8, y: 631 }) },
            equipment: { mainhand: "hbow", orb: "orbg" },
            attackWhileIdle: true
        },
        mole: {
            attack: async () => { return await tankAttackStrategy("mole", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "tunnel", x: -15, y: -329 }) },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        mummy: {
            attack: async () => { return await defaultAttackStrategy("mummy") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 250, y: -1129 }) },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        mrgreen: {
            attack: async () => { return await defaultAttackStrategy("mrgreen") },
            move: async () => { return await specialMonsterMoveStrategy("mrgreen") },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        mrpumpkin: {
            attack: async () => { return await defaultAttackStrategy("mrpumpkin") },
            move: async () => { return await specialMonsterMoveStrategy("mrpumpkin") },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        mvampire: {
            attack: async () => { return await defaultAttackStrategy("mvampire") },
            move: async () => { return await specialMonsterMoveStrategy("mvampire") },
            equipment: { mainhand: "firebow", orb: "jacko" },
            attackWhileIdle: true
        },
        oneeye: {
            attack: async () => { return await tankAttackStrategy("oneeye", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2w", x: -175, y: 0 }) },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        osnake: {
            attack: async () => { return await defaultAttackStrategy("osnake") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: -589, y: -335 }, "osnake") },
            equipment: { mainhand: "hbow", orb: "jacko" },
            attackWhileIdle: true
        },
        phoenix: {
            attack: async () => { return await defaultAttackStrategy("phoenix") },
            move: async () => { return await specialMonsterMoveStrategy("phoenix") },
            equipment: { mainhand: "firebow", orb: "jacko" },
            attackWhileIdle: true
        },
        plantoid: {
            attack: async () => { return await defaultAttackStrategy("plantoid") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -750, y: -125 }) },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        poisio: {
            attack: async () => { return await defaultAttackStrategy("poisio") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -121, y: 1360 }) },
            equipment: { mainhand: "crossbow", orb: "jacko" },
            attackWhileIdle: true
        },
        porcupine: {
            attack: async () => { return await defaultAttackStrategy("porcupine") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -829, y: 135 }) },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        pppompom: {
            attack: async () => { return await tankAttackStrategy("pppompom", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 100, y: -150 }) },
            equipment: { mainhand: "firebow", orb: "jacko" },
            requirePriest: true
        },
        prat: {
            attack: async () => { return await defaultAttackStrategy("prat") },
            move: async () => { return await holdPositionMoveStrategy({ map: "level1", x: -280, y: 541 }) },
            equipment: { mainhand: "firebow", orb: "jacko" },
            requirePriest: true
        },
        rat: {
            attack: async () => { return await defaultAttackStrategy("rat") },
            move: async () => { return holdPositionMoveStrategy({ map: "mansion", x: 100, y: -225 }) },
            equipment: { mainhand: "crossbow" },
            attackWhileIdle: true
        },
        scorpion: {
            attack: async () => { return await defaultAttackStrategy("scorpion") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1578, y: -168 }) },
            equipment: { mainhand: "firebow" },
            attackWhileIdle: true
        },
        skeletor: {
            attack: async () => { return await tankAttackStrategy("skeletor", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "arena", x: 380, y: -575 }) },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        snake: {
            attack: async () => { return await defaultAttackStrategy("snake") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -82, y: 1901 }) },
            equipment: { mainhand: "hbow", orb: "orbg" },
            attackWhileIdle: true
        },
        spider: {
            attack: async () => { return await defaultAttackStrategy("spider") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 948, y: -144 }) },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        squig: {
            attack: async () => { return await defaultAttackStrategy("squig") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1175, y: 422 }) },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        squigtoad: {
            attack: async () => { return await defaultAttackStrategy("squigtoad") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1175, y: 422 }) },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        stoneworm: {
            attack: async () => { return await defaultAttackStrategy("stoneworm") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 677, y: 129 }) },
            equipment: { mainhand: "crossbow", orb: "jacko" }
        },
        tinyp: {
            attack: async () => { return await tankAttackStrategy("tinyp", warrior.character.id) },
            move: async () => { return await specialMonsterMoveStrategy("tinyp") },
            equipment: { mainhand: "firebow", orb: "jacko" }
        },
        tortoise: {
            attack: async () => { return await defaultAttackStrategy("tortoise") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1124, y: 1118 }, "tortoise") },
            equipment: { mainhand: "crossbow", orb: "orbg" },
            attackWhileIdle: true
        },
        wolf: {
            attack: async () => { return await defaultAttackStrategy("wolf") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 400, y: -2525 }) },
            equipment: { mainhand: "firebow", orb: "jacko" },
        },
        wolfie: {
            attack: async () => { return await defaultAttackStrategy("wolfie") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: -169, y: -2026 }, "wolfie") },
            equipment: { mainhand: "crossbow", orb: "jacko" }
        }
    }

    async function targetLoop(): Promise<void> {
        try {
            if (bot.socket.disconnected) return

            const newTarget = await getTarget(bot, strategy)
            if (newTarget !== rangerTarget) bot.stopSmartMove() // Stop the smart move if we have a new target
            rangerTarget = newTarget
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()

    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            // Reasons to scare
            let numTargets = 0
            let numTargetingAndClose = 0
            let incomingDPS = 0
            let noStrategy = false
            let avoidIdle = false
            for (const [, entity] of bot.entities) {
                if (entity.target == bot.character.id) {
                    numTargets++
                    incomingDPS += Tools.calculateDamageRange(entity, bot.character)[1] * entity.frequency
                    if (Tools.distance(bot.character, entity) <= entity.range) numTargetingAndClose++
                    if (!strategy[entity.type]) noStrategy = true
                    else if (rangerTarget !== entity.type && !strategy[entity.type].attackWhileIdle) avoidIdle = true
                }
            }
            if (bot.character.hp < bot.character.max_hp * 0.25 // We are low on HP
                || (bot.character.s.burned && bot.character.s.burned.intensity > bot.character.max_hp / 10) // We are burned
                || numTargetingAndClose > 3 // We have a lot of targets
                || (numTargets > 0 && bot.character.c.town) // We are teleporting
                || noStrategy // We don't have a strategy for the given monster
                || avoidIdle // A monster is attacking us that we aren't targeting, and don't attack while idle
                || (numTargets > 1 && incomingDPS > bot.character.hp) // We have multiple targets, and a lot of incomingDPS.
            ) {
                if (!bot.character.slots.orb || bot.character.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.canUse("scare")) await bot.scare()
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            // TODO: Change visibleMonsterTypes to a Map which contains the closest one
            const visibleMonsterTypes: Set<MonsterName> = new Set()
            const inRangeMonsterTypes: Set<MonsterName> = new Set()
            for (const entity of bot.entities.values()) {
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                visibleMonsterTypes.add(entity.type)
                if (Tools.distance(bot.character, entity) < bot.character.range) inRangeMonsterTypes.add(entity.type)
            }

            if (rangerTarget) {
                if (strategy[rangerTarget].equipment) {
                    for (const s in strategy[rangerTarget].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[rangerTarget].equipment[slot]
                        const wType = bot.G.items[itemName].wtype

                        if (bot.G.classes[bot.character.ctype].doublehand[wType]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.character.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.character.slots["mainhand"]) {
                            const mainhandItem = bot.character.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.character.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.character.slots[slot]
                            || (bot.character.slots[slot] && bot.character.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i) await bot.equip(i, slot)
                        }
                    }
                }
            }

            if (rangerTarget && visibleMonsterTypes.has(rangerTarget)) {
                cooldown = await strategy[rangerTarget].attack()
            } else {
                if (bot.canUse("attack")) {
                    const targets: string[] = []
                    const threeshotTargets: string[] = []
                    const fiveshotTargets: string[] = []
                    for (const [id, entity] of bot.entities) {
                        if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                        if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                        if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                        // If the target will die to incoming projectiles, ignore it
                        if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                        // If the target will burn to death, ignore it
                        if (Tools.willBurnToDeath(entity)) continue

                        targets.push(id)

                        // If we can kill enough monsters in one shot, let's try to do that
                        const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                        if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(id)
                        if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(id)
                    }

                    if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
                        await bot.fiveShot(fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4])
                    } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
                        await bot.threeShot(threeshotTargets[0], threeshotTargets[1], threeshotTargets[2])
                    } else if (targets.length) {
                        // TODO: If we can do more damage with a `piercingshot`, do it.
                        await bot.attack(targets[0])
                    }
                }

                if (bot.canUse("supershot")) {
                    const targets: string[] = []
                    for (const [id, entity] of bot.entities) {
                        if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                        if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                        if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
                        if (entity.immune) continue // Entity won't take damage from supershot

                        // If the target will die to incoming projectiles, ignore it
                        if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                        // If the target will burn to death, ignore it
                        if (Tools.willBurnToDeath(entity)) continue

                        targets.push(id)

                        const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0] * bot.G.skills.supershot.damage_multiplier
                        if (minimumDamage > entity.hp) {
                            // Stop looking for another one to attack, since we can kill this one in one hit.
                            targets[0] = id
                            break
                        }
                    }

                    if (targets.length) {
                        await bot.superShot(targets[0])
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, cooldown)
    }
    attackLoop()

    async function moveLoop() {
        let cooldown = 10

        try {
            if (bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.character.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            if (rangerTarget) {
                cooldown = await strategy[rangerTarget].move()
            }

            if (bot.socket.disconnected) return

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, cooldown)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            let merchantHasSpace = false
            for (const item of merchant.character.items) {
                if (!item) {
                    merchantHasSpace = true
                    break
                }
            }
            if (!merchantHasSpace) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(merchant.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(merchant.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function startPriest(bot: Priest) {
    const defaultAttackStrategy = async (mtype: MonsterName): Promise<number> => {
        if (bot.canUse("attack")) {
            // Heal party members if they are close
            let target: PlayerData
            for (const [id, player] of bot.players) {
                if (![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(id)) continue // Don't heal other players
                if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
                if (Tools.distance(bot.character, player) > bot.character.range) continue // Too far away to heal

                target = player
                break
            }
            if (target) {
                await bot.heal(target.id)
            }

            if (!target) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== mtype) continue
                    if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(entity)

                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (minimumDamage > entity.hp) {
                        // Stop looking for another one to attack, since we can kill this one in one hit.
                        targets[0] = entity
                        break
                    }
                }

                if (targets.length) {
                    // Remove from other characters if we're going to kill it
                    if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                        for (const bot of [ranger, priest, warrior, merchant]) {
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    await bot.attack(targets[0].id)
                }
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    const tankAttackStrategy = async (mtype: MonsterName, tank: string) => {
        // If we have a target scare it away
        for (const [, entity] of bot.entities) {
            if (entity.target == bot.character.id) {
                if (bot.canUse("scare")) await bot.scare()
                return bot.getCooldown("scare") // Don't attack until we have scare available again
            }
        }

        if (bot.canUse("attack")) {
            let target: EntityData
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.target !== tank) continue // It's not targeting our tank
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

                target = entity
                break
            }

            if (target) {
                if (bot.canUse("curse")) {
                    bot.curse(target.id)
                }

                // Remove from other characters if we're going to kill it
                if (await Tools.isGuaranteedKill(bot.character, target)) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(target.id)
                    }
                }

                await bot.attack(target.id)
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    const holdPositionMoveStrategy = async (position: NodeData) => {
        try {
            if (Tools.distance(bot.character, position) > 0) await bot.smartMove(position)
        } catch (e) {
            console.error(e)
        }
        return 1000
    }
    const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
        let closestEntitiy: EntityData
        let closestDistance: number = Number.MAX_VALUE
        for (const [, entity] of bot.entities) {
            if (entity.type !== mtype) continue
            if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

            // If the target will die to incoming projectiles, ignore it
            if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

            // If the target will burn to death, ignore it
            if (Tools.willBurnToDeath(entity)) continue

            const distance = Tools.distance(bot.character, entity)
            if (distance < closestDistance) {
                closestDistance = distance
                closestEntitiy = entity
            }
        }

        try {
            if (!closestEntitiy && !bot.character.moving) await bot.smartMove(position)
            else if (closestEntitiy && Tools.distance(bot.character, closestEntitiy) > bot.character.range) await bot.smartMove(closestEntitiy, { getWithin: bot.character.range - closestEntitiy.speed })
        } catch (e) {
            // console.error(e)
            bot.stopSmartMove()
        }
        return 250
    }
    const specialMonsterMoveStrategy = async (mtype: MonsterName) => {
        try {
            // Look in nearby entities for monster
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) <= bot.character.range) return 250 // We're in range
                await bot.smartMove(entity, { getWithin: bot.character.range - 10 })
                return 250
            }

            // Look in 'S' for monster
            if (bot.S && bot.S[mtype] && bot.S[mtype].live) {
                if (Tools.distance(bot.character, bot.S[mtype]) <= bot.character.range) return 250 // We're in range
                await bot.smartMove(bot.S[mtype], { getWithin: bot.character.range - 10 })
                return 250
            }

            // Look in database for monster
            const specialTarget = await EntityModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, type: mtype }).lean().exec()
            if (specialTarget) {
                await bot.smartMove(specialTarget, { getWithin: bot.character.range - 10 })
            } else {
                // See if there's a spawn for them. If there is, go check there
                for (const spawn of bot.locateMonsters(mtype)) {
                    await bot.smartMove(spawn, { getWithin: 300 })

                    // Check if we've found it
                    let monsterIsNear = false
                    for (const [, entity] of bot.entities) {
                        if (entity.type !== mtype) continue
                        monsterIsNear = true
                        break
                    }
                    if (monsterIsNear) break
                }
            }
        } catch (e) {
            console.error(e)
        }
        return 100
    }
    const strategy: Strategy = {
        arcticbee: {
            attack: async () => { return await defaultAttackStrategy("arcticbee") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1102, y: -873 }) },
            attackWhileIdle: true
        },
        armadillo: {
            attack: async () => { return await defaultAttackStrategy("armadillo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 546, y: 1846 }) },
            attackWhileIdle: true
        },
        bat: {
            attack: async () => { return await defaultAttackStrategy("bat") },
            move: async () => { return await holdPositionMoveStrategy({ map: "cave", x: 324, y: -1107 }) },
            equipment: { orb: "orbg" },
            attackWhileIdle: true
        },
        bbpompom: {
            attack: async () => { return await defaultAttackStrategy("bbpompom") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winter_cave", x: 71, y: -164 }) },
            equipment: { orb: "jacko" }
        },
        bee: {
            attack: async () => { return await defaultAttackStrategy("bee") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 152, y: 1487 }) },
            attackWhileIdle: true
        },
        boar: {
            attack: async () => { return await defaultAttackStrategy("boar") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 40, y: -1109 }) },
            equipment: { orb: "jacko" },
            attackWhileIdle: true
        },
        booboo: {
            attack: async () => { return await defaultAttackStrategy("booboo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 285, y: -625 }) },
            equipment: { orb: "jacko" },
        },
        cgoo: {
            attack: async () => { return await defaultAttackStrategy("cgoo") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "arena", x: 650, y: -500 }, "cgoo") },
            equipment: { orb: "jacko" },
            attackWhileIdle: true
        },
        crab: {
            attack: async () => { return await defaultAttackStrategy("crab") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1182, y: -66 }) },
            attackWhileIdle: true
        },
        crabx: {
            attack: async () => { return await defaultAttackStrategy("crabx") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -964, y: 1762 }, "crabx") },
            equipment: { orb: "jacko" },
            attackWhileIdle: true
        },
        croc: {
            attack: async () => { return await defaultAttackStrategy("croc") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 821, y: 1710 }) },
            attackWhileIdle: true
        },
        fireroamer: {
            attack: async () => { return await tankAttackStrategy("fireroamer", "earthWar") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: 180, y: -675 }) },
            equipment: { orb: "jacko" }
        },
        frog: {
            attack: async () => { return await defaultAttackStrategy("frog") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1124, y: 1118 }, "frog") },
            attackWhileIdle: true
        },
        fvampire: {
            attack: async () => { return await defaultAttackStrategy("fvampire") },
            move: async () => { return await specialMonsterMoveStrategy("fvampire") },
            attackWhileIdle: true
        },
        ghost: {
            attack: async () => { return await defaultAttackStrategy("ghost") },
            move: async () => { return holdPositionMoveStrategy({ map: "halloween", x: 276, y: -1224 }) }
        },
        goldenbat: {
            attack: async () => { return await defaultAttackStrategy("goldenbat") },
            move: async () => { return await specialMonsterMoveStrategy("goldenbat") },
            equipment: { orb: "orbg" },
            attackWhileIdle: true
        },
        goo: {
            attack: async () => { return await defaultAttackStrategy("goo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -12, y: 787 }) },
            attackWhileIdle: true
        },
        greenjr: {
            attack: async () => { return await defaultAttackStrategy("greenjr") },
            move: async () => { return await specialMonsterMoveStrategy("greenjr") },
            attackWhileIdle: true
        },
        iceroamer: {
            attack: async () => { return await defaultAttackStrategy("iceroamer") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1492, y: 104 }) },
            equipment: { orb: "orbg" }
        },
        jr: {
            attack: async () => { return await defaultAttackStrategy("jr") },
            move: async () => { return await specialMonsterMoveStrategy("jr") },
            attackWhileIdle: true
        },
        minimush: {
            attack: async () => { return await defaultAttackStrategy("minimush") },
            move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: 28, y: 631 }) },
            equipment: { orb: "orbg" },
            attackWhileIdle: true
        },
        mole: {
            attack: async () => { return await tankAttackStrategy("mole", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "tunnel", x: -35, y: -329 }) },
            equipment: { orb: "jacko" }
        },
        mummy: {
            attack: async () => { return await defaultAttackStrategy("mummy") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 270, y: -1129 }) },
            equipment: { orb: "jacko" }
        },
        mrgreen: {
            attack: async () => { return await defaultAttackStrategy("mrgreen") },
            move: async () => { return await specialMonsterMoveStrategy("mrgreen") },
            equipment: { orb: "jacko" }
        },
        mrpumpkin: {
            attack: async () => { return await defaultAttackStrategy("mrpumpkin") },
            move: async () => { return await specialMonsterMoveStrategy("mrpumpkin") },
            equipment: { orb: "jacko" }
        },
        mvampire: {
            attack: async () => { return await defaultAttackStrategy("mvampire") },
            move: async () => { return await specialMonsterMoveStrategy("mvampire") },
            attackWhileIdle: true
        },
        oneeye: {
            attack: async () => { return await tankAttackStrategy("oneeye", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2w", x: -155, y: 0 }) },
            equipment: { orb: "jacko" }
        },
        osnake: {
            attack: async () => { return await defaultAttackStrategy("osnake") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: -488, y: -708 }, "osnake") },
            equipment: { orb: "jacko" },
            attackWhileIdle: true
        },
        phoenix: {
            attack: async () => { return await defaultAttackStrategy("phoenix") },
            move: async () => { return await specialMonsterMoveStrategy("phoenix") },
            attackWhileIdle: true
        },
        plantoid: {
            attack: async () => { return await defaultAttackStrategy("plantoid") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -730, y: -125 }) },
            equipment: { orb: "jacko" }
        },
        poisio: {
            attack: async () => { return await defaultAttackStrategy("poisio") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -101, y: 1360 }) },
            equipment: { orb: "jacko" },
            attackWhileIdle: true
        },
        porcupine: {
            attack: async () => { return await defaultAttackStrategy("porcupine") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -809, y: 135 }) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "orbg" },
            attackWhileIdle: true
        },
        pppompom: {
            attack: async () => { return await tankAttackStrategy("pppompom", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 120, y: -150 }) },
            equipment: { orb: "jacko" }
        },
        prat: {
            attack: async () => { return await defaultAttackStrategy("prat") },
            move: async () => { return await holdPositionMoveStrategy({ map: "level1", x: -296, y: 557 }) },
            equipment: { orb: "jacko" },
        },
        rat: {
            attack: async () => { return await defaultAttackStrategy("rat") },
            move: async () => { return holdPositionMoveStrategy({ map: "mansion", x: -224, y: -313 }) },
            attackWhileIdle: true
        },
        scorpion: {
            attack: async () => { return await defaultAttackStrategy("scorpion") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1598, y: -168 }) },
            attackWhileIdle: true
        },
        skeletor: {
            attack: async () => { return await tankAttackStrategy("skeletor", warrior.character.id) },
            move: async () => { return await holdPositionMoveStrategy({ map: "arena", x: 400, y: -575 }) },
            equipment: { orb: "jacko" }
        },
        snake: {
            attack: async () => { return await defaultAttackStrategy("snake") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -62, y: 1901 }) },
            equipment: { orb: "orbg" },
            attackWhileIdle: true
        },
        spider: {
            attack: async () => { return await defaultAttackStrategy("spider") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 968, y: -144 }) },
            equipment: { orb: "orbg" },
            attackWhileIdle: true
        },
        squig: {
            attack: async () => { return await defaultAttackStrategy("squig") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1155, y: 422 }) },
            attackWhileIdle: true
        },
        squigtoad: {
            attack: async () => { return await defaultAttackStrategy("squigtoad") },
            move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1155, y: 422 }) },
            attackWhileIdle: true
        },
        stoneworm: {
            attack: async () => { return await defaultAttackStrategy("stoneworm") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 697, y: 129 }) }
        },
        tinyp: {
            attack: async () => { return await tankAttackStrategy("tinyp", warrior.character.id) },
            move: async () => { return await specialMonsterMoveStrategy("tinyp") },
            equipment: { orb: "jacko" }
        },
        tortoise: {
            attack: async () => { return await defaultAttackStrategy("tortoise") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1104, y: 1118 }, "tortoise") },
            attackWhileIdle: true
        },
        wolf: {
            attack: async () => { return await defaultAttackStrategy("wolf") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 420, y: -2525 }) },
            equipment: { orb: "jacko" },
        },
        wolfie: {
            attack: async () => { return await defaultAttackStrategy("wolfie") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: -149, y: -2026 }, "wolfie") },
            equipment: { orb: "jacko" }
        }
    }

    async function targetLoop(): Promise<void> {
        try {
            if (bot.socket.disconnected) return

            const newTarget = await getTarget(bot, strategy)
            if (newTarget !== priestTarget) bot.stopSmartMove() // Stop the smart move if we have a new target
            priestTarget = newTarget
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()

    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }


            // Reasons to scare
            let numTargets = 0
            let numTargetingAndClose = 0
            let incomingDPS = 0
            let noStrategy = false
            let avoidIdle = false
            for (const [, entity] of bot.entities) {
                if (entity.target == bot.character.id) {
                    numTargets++
                    incomingDPS += Tools.calculateDamageRange(entity, bot.character)[1] * entity.frequency
                    if (Tools.distance(bot.character, entity) <= entity.range) numTargetingAndClose++
                    if (!strategy[entity.type]) noStrategy = true
                    else if (priestTarget !== entity.type && !strategy[entity.type].attackWhileIdle) avoidIdle = true
                }
            }
            if (bot.character.hp < bot.character.max_hp * 0.25 // We are low on HP
                || (bot.character.s.burned && bot.character.s.burned.intensity > bot.character.max_hp / 10) // We are burned
                || numTargetingAndClose > 3 // We have a lot of targets
                || (numTargets > 0 && bot.character.c.town) // We are teleporting
                || noStrategy // We don't have a strategy for the given monster
                || avoidIdle // A monster is attacking us that we aren't targeting, and don't attack while idle
                || (numTargets > 1 && incomingDPS > bot.character.hp) // We have multiple targets, and a lot of incomingDPS.
            ) {
                if (!bot.character.slots.orb || bot.character.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.canUse("scare")) await bot.scare()
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            }

            if (priestTarget) {
                if (strategy[priestTarget].equipment) {
                    for (const s in strategy[priestTarget].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[priestTarget].equipment[slot]
                        const wtype = bot.G.items[itemName].wtype
                        if (bot.G.classes[bot.character.ctype].doublehand[wtype]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.character.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.character.slots["mainhand"]) {
                            const mainhandItem = bot.character.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.character.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.character.slots[slot]
                            || (bot.character.slots[slot] && bot.character.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i) await bot.equip(i, slot)
                        }
                    }
                }
            }

            // Heal ourselves if we are low HP
            if (bot.canUse("heal") && bot.character.hp < bot.character.max_hp * 0.8) {
                await bot.heal(bot.character.id)
                setTimeout(async () => { attackLoop() }, bot.getCooldown("heal"))
                return
            }

            // Heal party members if they are close
            let targets: string[] = []
            for (const [id, player] of bot.players) {
                if (![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(id)) continue // Don't heal other players
                if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
                if (Tools.distance(bot.character, player) > bot.character.range) continue // Too far away to heal

                targets.push(id)
                break
            }
            if (targets.length && bot.canUse("heal")) {
                await bot.heal(targets[0])
                setTimeout(async () => { attackLoop() }, bot.getCooldown("heal"))
                return
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            // TODO: Change visibleMonsterTypes to a Map which contains the closest one
            const visibleMonsterTypes: Set<MonsterName> = new Set()
            const inRangeMonsterTypes: Set<MonsterName> = new Set()
            for (const entity of bot.entities.values()) {
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                visibleMonsterTypes.add(entity.type)
                if (Tools.distance(bot.character, entity) < bot.character.range) inRangeMonsterTypes.add(entity.type)
            }

            if (priestTarget && visibleMonsterTypes.has(priestTarget)) {
                cooldown = await strategy[priestTarget].attack()
            } else if (bot.canUse("attack")) {
                targets = []
                for (const [id, entity] of bot.entities) {
                    if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                    if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(id)

                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (minimumDamage > entity.hp) {
                        // Stop looking for another one to attack, since we can kill this one in one hit.
                        targets[0] = id
                        break
                    }
                }

                if (bot.canUse("scare") && targets.length) {
                    await bot.attack(targets[0])
                    cooldown = bot.getCooldown("attack")
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, cooldown)
    }
    attackLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            let merchantHasSpace = false
            for (const item of merchant.character.items) {
                if (!item) {
                    merchantHasSpace = true
                    break
                }
            }
            if (!merchantHasSpace) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(merchant.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(merchant.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function moveLoop() {
        let cooldown = 10

        try {
            if (bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.character.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            // Priority #2: Special monsters
            if (priestTarget) {
                cooldown = await strategy[priestTarget].move()
            }

            if (bot.socket.disconnected) return

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, cooldown)
    }
    moveLoop()

    async function partyHealLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { partyHealLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("partyheal")) {
                for (const bot of [priest, ranger, warrior, merchant]) {
                    if (!bot.party || !bot.party.list.includes(priest.character.id)) continue // Our priest isn't in the party!?
                    if (bot.character.hp < bot.character.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await priest.partyHeal()
                        break
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyHealLoop() }, 250)
    }
    partyHealLoop()
}

async function startWarrior(bot: Warrior) {
    const defaultAttackStrategy = async (mtype: MonsterName): Promise<number> => {
        if (bot.canUse("attack")) {
            const targets: EntityData[] = []

            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                const distance = Tools.distance(bot.character, entity)
                if (distance > bot.character.range) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)

                const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                if (minimumDamage > entity.hp) {
                    // Stop looking for another one to attack, since we can kill this one in one hit.
                    targets[0] = entity
                    break
                }
            }

            if (targets.length) {
                // Remove from other characters if we're going to kill it
                if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(targets[0].id)
                    }
                }

                await bot.attack(targets[0].id)
            }
            if (targets.length == 0) {
                let numInAgitateRange = 0
                const inTauntRange: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    const d = Tools.distance(bot.character, entity)
                    if (entity.target == bot.character.id) continue // It's coming towards us already
                    if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                    if (d > bot.G.skills.agitate.range && d > bot.G.skills.taunt.range) continue
                    if (d <= bot.G.skills.agitate.range) {
                        if (entity.type !== mtype) numInAgitateRange = Number.MIN_SAFE_INTEGER // We don't want to agitate if there are other monsters nearby
                        else numInAgitateRange++
                    }
                    if (d <= bot.G.skills.taunt.range && entity.type == mtype) inTauntRange.push(entity)
                }
                if (inTauntRange.length == 0 && numInAgitateRange > 0 && bot.canUse("agitate")) {
                    await bot.agitate()
                } else if (inTauntRange.length > 0 && bot.canUse("taunt")) {
                    await bot.taunt(inTauntRange[0].id)
                }
            }
        }

        // Stomp things
        if (bot.canUse("stomp")) {
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.G.skills.stomp.range) continue // Only stomp those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                await bot.stomp()
                break
            }
        }

        // Cleave things
        if (bot.canUse("cleave")) {
            const targets: EntityData[] = []
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.G.skills.cleave.range) continue // Only attack those in range

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                targets.push(entity)
            }

            if (targets.length) {
                await bot.cleave()
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    /**
     * If you're using this strategy, make sure you have a `jacko` equipped.
     * @param mtype 
     */
    const oneTargetAttackStrategy = async (mtype: MonsterName) => {
        // If we have more than one target, scare
        if (bot.character.targets > 1) {
            if (bot.canUse("scare")) await bot.scare()
            return bot.getCooldown("scare") // Don't attack until we have scare available again
        }

        if (bot.canUse("attack")) {
            let target: EntityData

            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                if (entity.target == bot.character.id) {
                    target = entity
                    break // This entity is already targeting us, we should attack it.
                }

                if (!target) {
                    target = entity
                } else if (entity.hp < target.hp) {
                    // Prioritize killing lower hp monsters first
                    target = entity
                }
            }

            if (!target && bot.canUse("taunt")) {
                // See if one is in taunt distance
                for (const [, entity] of bot.entities) {
                    if (entity.type !== mtype) continue
                    if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.G.skills.taunt.range) continue // Only taunt those in range

                    if (entity.target == bot.character.id) {
                        target = entity
                        break // This entity is already targeting us, we should attack it.
                    }

                    if (!target) {
                        target = entity
                    } else if (entity.hp < target.hp) {
                        // Prioritize killing lower hp monsters first
                        target = entity
                    } else if (entity.hp <= target.hp && Tools.distance(bot.character, entity) < Tools.distance(bot.character, target)) {
                        // Same HP, but closer
                        target = entity
                    }
                }
                if (target && target.target !== bot.character.id) {
                    if (Tools.distance(bot.character, target) < bot.G.skills.stomp.range && bot.canUse("stomp")) {
                        await bot.stomp()
                    }
                    await bot.taunt(target.id)
                }
            } else if (target) {
                if (bot.G.monsters[target.type].damage_type == "physical" && bot.canUse("hardshell")) {
                    await bot.hardshell()
                }

                if (bot.canUse("stomp")) {
                    await bot.stomp()
                }

                // Remove from other characters if we're going to kill it
                if (await Tools.isGuaranteedKill(bot.character, target)) {
                    for (const bot of [ranger, priest, warrior, merchant]) {
                        bot.entities.delete(target.id)
                    }
                }

                await bot.attack(target.id)
            }
        }

        return Math.max(10, bot.getCooldown("attack"))
    }
    const stompThenAttackStrategy = async (mtype: MonsterName) => {
        let target: EntityData
        for (const [, entity] of bot.entities) {
            if (entity.type !== mtype) continue
            if (entity.range > bot.character.range) continue
            if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

            target = entity
        }

        if (target && !target.s.stunned && bot.canUse("stomp")) {
            // If they're not stunned, stun then attack
            await bot.stomp()
        } else if (target && target.s.stunned && bot.canUse("attack")) {
            await bot.attack(target.id)
        }

        return Math.max(10, bot.getCooldown("attack"))

    }
    const holdPositionMoveStrategy = async (position: NodeData) => {
        try {
            if (Tools.distance(bot.character, position) > 0) await bot.smartMove(position)
        } catch (e) {
            console.error(e)
        }
        return 1000
    }
    const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
        let closestEntitiy: EntityData
        let closestDistance: number = Number.MAX_VALUE
        for (const [, entity] of bot.entities) {
            if (entity.type !== mtype) continue
            if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else

            // If the target will die to incoming projectiles, ignore it
            if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

            // If the target will burn to death, ignore it
            if (Tools.willBurnToDeath(entity)) continue

            const distance = Tools.distance(bot.character, entity)
            if (distance < closestDistance) {
                closestDistance = distance
                closestEntitiy = entity
            }
        }

        try {
            if (!closestEntitiy && !bot.character.moving) await bot.smartMove(position)
            else if (closestEntitiy && Tools.distance(bot.character, closestEntitiy) > bot.character.range) await bot.smartMove(closestEntitiy, { getWithin: bot.character.range - closestEntitiy.speed })
        } catch (e) {
            // console.error(e)
            bot.stopSmartMove()
        }
        return 250
    }
    const specialMonsterMoveStrategy = async (mtype: MonsterName) => {
        try {
            // Look in nearby entities for monster
            for (const [, entity] of bot.entities) {
                if (entity.type !== mtype) continue
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                if (Tools.distance(bot.character, entity) <= bot.character.range) return 250 // We're in range
                await bot.smartMove(entity, { getWithin: bot.character.range - 10 })
                return 250
            }

            // Look in 'S' for monster
            if (bot.S && bot.S[mtype] && bot.S[mtype].live) {
                if (Tools.distance(bot.character, bot.S[mtype]) <= bot.character.range) return 250 // We're in range
                await bot.smartMove(bot.S[mtype], { getWithin: bot.character.range - 10 })
                return 250
            }

            // Look in database for monster
            const specialTarget = await EntityModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, type: mtype }).lean().exec()
            if (specialTarget) {
                await bot.smartMove(specialTarget, { getWithin: bot.character.range - 10 })
            } else {
                // See if there's a spawn for them. If there is, go check there
                for (const spawn of bot.locateMonsters(mtype)) {
                    await bot.smartMove(spawn, { getWithin: 300 })

                    // Check if we've found it
                    let monsterIsNear = false
                    for (const [, entity] of bot.entities) {
                        if (entity.type !== mtype) continue
                        monsterIsNear = true
                        break
                    }
                    if (monsterIsNear) break
                }
            }
        } catch (e) {
            console.error(e)
        }
        return 100
    }
    const strategy: Strategy = {
        arcticbee: {
            attack: async () => { return await defaultAttackStrategy("arcticbee") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: 1062, y: -873 }, "arcticbee") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        bat: {
            attack: async () => { return await defaultAttackStrategy("bat") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "cave", x: 1243, y: -27 }, "bat") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        bbpompom: {
            attack: async () => { return await defaultAttackStrategy("bbpompom") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winter_cave", x: 31, y: -164 }) },
            equipment: { mainhand: "basher", orb: "jacko" }
        },
        bee: {
            attack: async () => { return await defaultAttackStrategy("bee") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 737, y: 720 }, "bee") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        boar: {
            attack: async () => { return await defaultAttackStrategy("boar") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 0, y: -1109 }) },
            equipment: { mainhand: "basher", orb: "jacko" },
            attackWhileIdle: true
        },
        booboo: {
            attack: async () => { return await oneTargetAttackStrategy("booboo") },
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 245, y: -625 }) },
            equipment: { mainhand: "basher", orb: "jacko" },
        },
        crab: {
            attack: async () => { return await defaultAttackStrategy("crab") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1222, y: -66 }, "crab") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        crabx: {
            attack: async () => { return await defaultAttackStrategy("crabx") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1004, y: 1762 }, "crabx") },
            equipment: { mainhand: "basher", orb: "jacko" },
            attackWhileIdle: true
        },
        croc: {
            attack: async () => { return await defaultAttackStrategy("croc") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 781, y: 1710 }, "croc") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        fireroamer: {
            attack: async () => { return await oneTargetAttackStrategy("fireroamer") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: 140, y: -675 }) },
            equipment: { mainhand: "basher", orb: "jacko" }
        },
        fvampire: {
            attack: async () => { return await defaultAttackStrategy("fvampire") },
            move: async () => { return await specialMonsterMoveStrategy("fvampire") },
            equipment: { mainhand: "basher", orb: "jacko" },
            attackWhileIdle: true,
            requirePriest: true
        },
        ghost: {
            attack: async () => { return await defaultAttackStrategy("ghost") },
            move: async () => { return holdPositionMoveStrategy({ map: "halloween", x: 236, y: -1224 }) },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true,
            requirePriest: true
        },
        goldenbat: {
            attack: async () => { return await defaultAttackStrategy("goldenbat") },
            move: async () => { return await specialMonsterMoveStrategy("goldenbat") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        goo: {
            attack: async () => { return await defaultAttackStrategy("goo") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -52, y: 787 }, "goo") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        greenjr: {
            attack: async () => { return await defaultAttackStrategy("greenjr") },
            move: async () => { return await specialMonsterMoveStrategy("greenjr") },
            attackWhileIdle: true
        },
        iceroamer: {
            attack: async () => { return await defaultAttackStrategy("iceroamer") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1532, y: 104 }) },
            equipment: { mainhand: "basher", orb: "orbg" }
        },
        jr: {
            attack: async () => { return await defaultAttackStrategy("jr") },
            move: async () => { return await specialMonsterMoveStrategy("jr") },
            attackWhileIdle: true
        },
        minimush: {
            attack: async () => { return await defaultAttackStrategy("minimush") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: -18, y: 631 }, "minimush") },
            equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "jacko" },
            attackWhileIdle: true
        },
        mole: {
            attack: async () => { return await defaultAttackStrategy("mole") },
            move: async () => { return await holdPositionMoveStrategy({ map: "tunnel", x: 5, y: -329 }) },
            equipment: { mainhand: "basher", orb: "jacko" },
            requirePriest: true
        },
        mummy: {
            attack: async () => { return await defaultAttackStrategy("mummy") },
            // TODO: Make abuseRageMoveStrategy where we go to the rage range until we have targets, then move back.
            move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 230, y: -1129 }) },
            equipment: { mainhand: "basher", orb: "jacko" }
        },
        mrgreen: {
            attack: async () => { return await defaultAttackStrategy("mrgreen") },
            move: async () => { return await specialMonsterMoveStrategy("mrgreen") },
            equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "jacko" }
        },
        mrpumpkin: {
            attack: async () => { return await defaultAttackStrategy("mrpumpkin") },
            move: async () => { return await specialMonsterMoveStrategy("mrpumpkin") },
            equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "jacko" }
        },
        mvampire: {
            attack: async () => { return await defaultAttackStrategy("mvampire") },
            move: async () => { return await specialMonsterMoveStrategy("mvampire") },
            equipment: { mainhand: "basher", orb: "jacko" },
            attackWhileIdle: true
        },
        oneeye: {
            attack: async () => { return await oneTargetAttackStrategy("oneeye") },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2w", x: -195, y: 0 }) },
            equipment: { mainhand: "basher", orb: "jacko" }
        },
        osnake: {
            attack: async () => { return await defaultAttackStrategy("osnake") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: 347, y: -747 }, "osnake") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        phoenix: {
            attack: async () => { return await defaultAttackStrategy("phoenix") },
            move: async () => { return await specialMonsterMoveStrategy("phoenix") },
            equipment: { mainhand: "basher", orb: "jacko" },
            attackWhileIdle: true
        },
        plantoid: {
            attack: async () => { return await oneTargetAttackStrategy("plantoid") },
            move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -770, y: -125 }) },
            equipment: { mainhand: "basher", orb: "jacko" }
        },
        poisio: {
            attack: async () => { return await defaultAttackStrategy("poisio") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -141, y: 1360 }, "poisio") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        pppompom: {
            attack: async () => { return oneTargetAttackStrategy("pppompom") },
            move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 80, y: -150 }) },
            equipment: { mainhand: "basher", orb: "jacko" },
            requirePriest: true
        },
        rat: {
            attack: async () => { return await defaultAttackStrategy("rat") },
            move: async () => { return nearbyMonstersMoveStrategy({ map: "mansion", x: 0, y: -21 }, "rat") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        scorpion: {
            attack: async () => { return await defaultAttackStrategy("scorpion") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 1558, y: -168 }, "scorpion") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        skeletor: {
            attack: async () => { return await oneTargetAttackStrategy("skeletor") },
            move: async () => { return await holdPositionMoveStrategy({ map: "arena", x: 360, y: -575 }) },
            equipment: { mainhand: "basher", orb: "jacko" },
            requirePriest: true
        },
        snake: {
            attack: async () => { return await defaultAttackStrategy("snake") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -102, y: 1901 }, "snake") },
            equipment: { mainhand: "bataxe", orb: "orbg" },
            attackWhileIdle: true
        },
        spider: {
            attack: async () => { return await defaultAttackStrategy("spider") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 928, y: -144 }, "spider") },
            equipment: { mainhand: "bataxe", orb: "orbg" },
            attackWhileIdle: true
        },
        squig: {
            attack: async () => { return await defaultAttackStrategy("squig") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1195, y: 422 }, "squig") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        squigtoad: {
            attack: async () => { return await defaultAttackStrategy("squigtoad") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1195, y: 422 }, "squigtoad") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        tinyp: {
            attack: async () => { return await stompThenAttackStrategy("tinyp") },
            move: async () => { return await specialMonsterMoveStrategy("tinyp") },
            equipment: { mainhand: "basher", orb: "jacko" }
        },
        tortoise: {
            attack: async () => { return await defaultAttackStrategy("tortoise") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1144, y: 1118 }, "tortoise") },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            attackWhileIdle: true
        },
        wolf: {
            attack: async () => { return await oneTargetAttackStrategy("wolf") },
            move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 380, y: -2525 }) },
            equipment: { mainhand: "basher", orb: "jacko" },
        },
        wolfie: {
            attack: async () => { return await defaultAttackStrategy("wolfie") },
            move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: -189, y: -2026 }, "wolfie") },
            equipment: { mainhand: "basher", orb: "jacko" }
        }
    }

    async function targetLoop(): Promise<void> {
        try {
            if (bot.socket.disconnected) return

            const newTarget = await getTarget(bot, strategy)
            if (newTarget !== warriorTarget) bot.stopSmartMove() // Stop the smart move if we have a new target
            warriorTarget = newTarget
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { await targetLoop() }, 1000)
    }
    targetLoop()

    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            // Reasons to scare
            let numTargets = 0
            let numTargetingAndClose = 0
            let incomingDPS = 0
            let noStrategy = false
            let avoidIdle = false
            for (const [, entity] of bot.entities) {
                if (entity.target == bot.character.id) {
                    numTargets++
                    incomingDPS += Tools.calculateDamageRange(entity, bot.character)[1] * entity.frequency
                    if (Tools.distance(bot.character, entity) <= entity.range) numTargetingAndClose++
                    if (!strategy[entity.type]) noStrategy = true
                    else if (warriorTarget !== entity.type && !strategy[entity.type].attackWhileIdle) avoidIdle = true
                }
            }
            if (bot.character.hp < bot.character.max_hp * 0.25 // We are low on HP
                || (bot.character.s.burned && bot.character.s.burned.intensity > bot.character.max_hp / 10) // We are burned
                || numTargetingAndClose > 3 // We have a lot of targets
                || (numTargets > 0 && bot.character.c.town) // We are teleporting
                || noStrategy // We don't have a strategy for the given monster
                || avoidIdle // A monster is attacking us that we aren't targeting, and don't attack while idle
                || (numTargets > 1 && incomingDPS > bot.character.hp) // We have multiple targets, and a lot of incomingDPS.
            ) {
                if (!bot.character.slots.orb || bot.character.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.canUse("scare")) await bot.scare()
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            if (warriorTarget) {
                if (strategy[warriorTarget].equipment) {
                    for (const s in strategy[warriorTarget].equipment) {
                        const slot = s as SlotType
                        const itemName = strategy[warriorTarget].equipment[slot]
                        const wtype = bot.G.items[itemName].wtype
                        if (bot.G.classes[bot.character.ctype].doublehand[wtype]) {
                            // Check if we have something in our offhand, we need to unequip it.
                            if (bot.character.slots.offhand) await bot.unequip("offhand")
                        }

                        if (slot == "offhand" && bot.character.slots["mainhand"]) {
                            const mainhandItem = bot.character.slots["mainhand"].name
                            const mainhandWType = bot.G.items[mainhandItem].wtype
                            if (bot.G.classes[bot.character.ctype].doublehand[mainhandWType]) {
                                // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
                                await bot.unequip("mainhand")
                            }
                        }

                        if (!bot.character.slots[slot]
                            || (bot.character.slots[slot] && bot.character.slots[slot].name !== itemName)) {
                            const i = bot.locateItem(itemName)
                            if (i) await bot.equip(i, slot)
                        }
                    }
                }
            }

            // TODO: Change visibleMonsterTypes to a Map which contains the closest one
            const visibleMonsterTypes: Set<MonsterName> = new Set()
            const inRangeMonsterTypes: Set<MonsterName> = new Set()
            for (const entity of bot.entities.values()) {
                if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                visibleMonsterTypes.add(entity.type)
                if (Tools.distance(bot.character, entity) < bot.character.range) inRangeMonsterTypes.add(entity.type)
            }

            if (warriorTarget && visibleMonsterTypes.has(warriorTarget)) {
                cooldown = await strategy[warriorTarget].attack()
            } else {
                if (bot.canUse("attack")) {
                    const targets: string[] = []
                    for (const [id, entity] of bot.entities) {
                        if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
                        if (entity.cooperative !== true && entity.target && ![ranger.character.id, warrior.character.id, priest.character.id, merchant.character.id].includes(entity.target)) continue // It's targeting someone else
                        if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                        // If the target will die to incoming projectiles, ignore it
                        if (Tools.willDieToProjectiles(entity, bot.projectiles)) continue

                        // If the target will burn to death, ignore it
                        if (Tools.willBurnToDeath(entity)) continue

                        targets.push(id)

                        const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                        if (minimumDamage > entity.hp) {
                            // Stop looking for another one to attack, since we can kill this one in one hit.
                            targets[0] = id
                            break
                        }
                    }

                    if (targets.length) {
                        await bot.attack(targets[0])
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, cooldown)
    }
    attackLoop()

    async function chargeLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.canUse("charge")) await bot.charge()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { chargeLoop() }, bot.getCooldown("charge"))
    }
    chargeLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            let merchantHasSpace = false
            for (const item of merchant.character.items) {
                if (!item) {
                    merchantHasSpace = true
                    break
                }
            }
            if (!merchantHasSpace) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(merchant.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || WARRIOR_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(merchant.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function moveLoop() {
        let cooldown = 10

        try {
            if (bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.character.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            // Priority #2: Special monsters
            if (warriorTarget) {
                cooldown = await strategy[warriorTarget].move()
            }

            if (bot.socket.disconnected) return

        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, cooldown)
    }
    moveLoop()

    async function warcryLoop() {
        try {
            if (bot.socket.disconnected) return
            if (bot.canUse("warcry")) await bot.warcry()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { warcryLoop() }, Math.max(10, bot.getCooldown("warcry")))
    }
    warcryLoop()
}

async function startMerchant(bot: Merchant) {
    bot.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.targets > 0) {
                if (bot.canUse("scare")) {
                    await bot.scare()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, 250)
    }
    attackLoop()

    async function mluckLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.canUse("mluck")) {
                if (!bot.character.s.mluck || bot.character.s.mluck.f !== bot.character.id) await bot.mluck(bot.character.id) // mluck ourselves

                for (const [, player] of bot.players) {
                    if (Tools.distance(bot.character, player) > bot.G.skills.mluck.range) continue // Too far away to mluck
                    if (player.npc) continue // It's an NPC, we can't mluck NPCs.

                    if (!player.s.mluck) {
                        await bot.mluck(player.id) // Give the mluck 
                    } else if (!player.s.mluck.strong && player.s.mluck.f !== bot.character.id) {
                        await bot.mluck(player.id) // Steal the mluck
                    } else if ((!player.s.mluck.strong && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))
                        || (player.s.mluck.strong && player.s.mluck.f == bot.character.id && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))) {
                        await bot.mluck(player.id) // Extend the mluck
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { mluckLoop() }, 250)
    }
    mluckLoop()

    let lastBankVisit = 0
    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.character.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            // If we are full, let's go to the bank
            let freeSlots = 0
            for (const item of bot.character.items) {
                if (!item) freeSlots++
            }
            if (freeSlots == 0 || lastBankVisit == 0) {
                await bot.closeMerchantStand()
                await bot.smartMove("goldnpc")

                lastBankVisit = Date.now()

                // Deposit excess gold
                const excessGold = bot.character.gold - 10000000
                if (excessGold > 0) {
                    await bot.depositGold(excessGold)
                } else if (excessGold < 0) {
                    await bot.withdrawGold(-excessGold)
                }

                // Deposit items
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item) continue
                    if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name)) {
                        // Deposit it in the bank
                        try {
                            await bot.depositItem(i)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                }

                // Store information about everything in our bank to use it later to find upgradable stuff
                const bankInfo: ItemInfo[] = []
                for (let i = 0; i <= 7; i++) {
                    const bankPack = `items${i}` as Exclude<BankPackType, "gold">
                    for (const item of bot.bank[bankPack]) {
                        bankInfo.push(item)
                    }
                }
                let freeSpaces = 0
                for (const item of bot.character.items) {
                    if (!item) freeSpaces++
                }
                const duplicates = bot.locateDuplicateItems(bankInfo)

                // Withdraw compoundable & upgradable things
                for (const iN in duplicates) {
                    const itemName = iN as ItemName
                    const d = duplicates[itemName]
                    const gInfo = bot.G.items[itemName]
                    if (gInfo.upgrade) {
                        // Withdraw upgradable items
                        if (freeSpaces < 3) break // Not enough space in inventory

                        const pack1 = `items${Math.floor((d[0]) / 42)}` as Exclude<BankPackType, "gold">
                        const slot1 = d[0] % 42
                        let withdrew = false
                        for (let i = 1; i < d.length - 1 && freeSpaces > 2; i++) {
                            const pack2 = `items${Math.floor((d[i]) / 42)}` as Exclude<BankPackType, "gold">
                            const slot2 = d[i] % 42
                            const item2 = bot.bank[pack2][slot2]

                            if (item2.level >= 8) continue // We don't want to upgrade high level items automatically

                            try {
                                await bot.withdrawItem(pack2, slot2)
                                withdrew = true
                                freeSpaces--
                            } catch (e) {
                                console.error(e)
                            }
                        }
                        if (withdrew) {
                            try {
                                await bot.withdrawItem(pack1, slot1)
                                freeSpaces--
                            } catch (e) {
                                console.error(e)
                            }
                        }
                    } else if (gInfo.compound) {
                        // Withdraw compoundable items
                        if (freeSpaces < 4) break // Not enough space in inventory
                        if (d.length < 3) continue // Not enough to compound

                        for (let i = 0; i < d.length - 2 && freeSpaces > 4; i++) {
                            const pack1 = `items${Math.floor((d[i]) / 42)}` as Exclude<BankPackType, "gold">
                            const slot1 = d[i] % 42
                            const item1 = bot.bank[pack1][slot1]
                            const pack2 = `items${Math.floor((d[i + 1]) / 42)}` as Exclude<BankPackType, "gold">
                            const slot2 = d[i + 1] % 42
                            const item2 = bot.bank[pack2][slot2]
                            const pack3 = `items${Math.floor((d[i + 2]) / 42)}` as Exclude<BankPackType, "gold">
                            const slot3 = d[i + 2] % 42
                            const item3 = bot.bank[pack3][slot3]

                            if (item1.level >= 4) continue // We don't want to comopound high level items automaticaclly
                            if (item1.level !== item2.level) continue
                            if (item1.level !== item3.level) continue

                            // Withdraw the three items
                            try {
                                await bot.withdrawItem(pack1, slot1)
                                freeSpaces--
                                await bot.withdrawItem(pack2, slot2)
                                freeSpaces--
                                await bot.withdrawItem(pack3, slot3)
                                freeSpaces--
                            } catch (e) {
                                console.error(e)
                            }

                            // Remove the three items from the array
                            d.splice(i, 3)
                            i = i - 1
                            break
                        }
                    }
                }

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // Move to our friends if they have lots of items (they'll send them over)
            for (const friend of [priest, ranger, warrior]) {
                // Check if our friend is full
                let full = true
                for (const item of friend.character.items) {
                    if (!item) {
                        full = false
                        break
                    }
                }

                // Also check if they need mluck
                if (full || (bot.canUse("mluck") && (!friend.character.s.mluck || friend.character.s.mluck.ms < 120000 || friend.character.s.mluck.f !== bot.character.id))) {
                    await bot.closeMerchantStand()
                    console.log(`[merchant] We are moving to ${friend.character.id}!`)
                    await bot.smartMove(friend.character, { getWithin: bot.G.skills.mluck.range / 2 })

                    setTimeout(async () => { moveLoop() }, 250)
                    return
                }
            }

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as MonsterName
                if (!bot.S[type].live) continue
                if (!bot.S[type].target) continue
                if (bot.S[type].hp > bot.S[type].max_hp * 0.5) continue // High HP

                await bot.closeMerchantStand()
                await bot.smartMove(bot.S[type], { getWithin: 100 })

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // Find other characters that need mluck and go find them
            if (bot.canUse("mluck")) {
                const charactersToMluck = await CharacterModel.find({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 60000 }, $or: [{ "s.mluck": undefined }, { "s.mluck.strong": undefined, "s.mluck.f": { "$ne": "earthMer" } }] }).lean().exec()
                for (const character of charactersToMluck) {
                    // Move to them, and we'll automatically mluck them
                    await bot.closeMerchantStand()
                    console.log(`[merchant] We are moving to ${character.name} to mluck them!`)
                    await bot.smartMove(character, { getWithin: bot.G.skills.mluck.range / 2 })

                    setTimeout(async () => { moveLoop() }, 250)
                    return
                }
            }

            // Hang out in town
            await bot.smartMove("secondhands", { getWithin: 100 })
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function run() {
    await Promise.all([Game.login("hyprkookeez@gmail.com", "thisisnotmyrealpasswordlol"), Pathfinder.prepare()])

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    let lastServerTime = 0
    const serverLoop = async () => {
        try {
            // Don't change servers too fast
            if (lastServerTime > Date.now() - 60000) {
                setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerTime - Date.now() - 60000))
                return
            }

            // Look for the lowest hp special monster
            let bestMonster = await EntityModel.findOne({ $or: [{ type: "mrpumpkin" }, { type: "mrgreen" }], lastSeen: { $gt: Date.now() - 15000 } }).sort({ hp: 1 }).lean().exec()
            if (!bestMonster) {
                bestMonster = {
                    type: null,
                    _id: null,
                    map: null,
                    x: null,
                    y: null,
                    serverRegion: "ASIA",
                    serverIdentifier: "I"
                }
            }

            let region: ServerRegion
            if (ranger) region = ranger.server.region
            let identifier: ServerIdentifier
            if (ranger) identifier = ranger.server.name

            if (bestMonster && bestMonster.serverRegion !== region || bestMonster.serverIdentifier !== identifier) {
                if (region) console.log(`Disconnecting from ${region} ${identifier}`)
                await sleep(2500)
                await Game.disconnect(false)
                await sleep(5000)

                console.log(`Connecting to ${bestMonster.serverRegion}${bestMonster.serverIdentifier}!`)

                region = bestMonster.serverRegion
                identifier = bestMonster.serverIdentifier

                lastServerTime = Date.now()

                try {
                    ranger = await Game.startRanger("earthiverse", region, identifier)
                    warrior = await Game.startWarrior("earthWar", region, identifier)
                    priest = await Game.startPriest("earthPri", region, identifier)
                    merchant = await Game.startMerchant("earthMer", region, identifier)

                    // Start the bots!
                    startRanger(ranger)
                    startWarrior(warrior)
                    startPriest(priest)
                    startMerchant(merchant)
                    for (const bot of [ranger, warrior, priest, merchant]) generalBotStuff(bot)
                } catch (e) {
                    await Game.disconnect()
                    console.error(e)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { serverLoop() }, 1000)
    }
    serverLoop()
}
run()