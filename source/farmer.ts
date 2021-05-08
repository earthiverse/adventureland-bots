import { ITEMS_TO_BUY, ITEMS_TO_EXCHANGE, ITEMS_TO_SELL, MAGE_ITEMS_TO_HOLD, MERCHANT_ITEMS_TO_HOLD, NPC_INTERACTION_DISTANCE, PRIEST_ITEMS_TO_HOLD, RANGER_ITEMS_TO_HOLD, WARRIOR_ITEMS_TO_HOLD } from "./constants.js"
import { EntityData, HitData } from "./definitions/adventureland-server.js"
import { ItemName, MonsterName, ServerIdentifier, ServerRegion, TradeSlotType } from "./definitions/adventureland.js"
import { Game } from "./Game.js"
import { Warrior } from "./Warrior.js"
import { Priest } from "./Priest.js"
import { Merchant } from "./Merchant.js"
import { PingCompensatedPlayer } from "./PingCompensatedPlayer.js"
import { Ranger } from "./Ranger.js"
import { Pathfinder } from "./Pathfinder.js"
import { Tools } from "./Tools.js"
import { Mage } from "./Mage.js"
import { Rogue } from "./Rogue.js"
import { PlayerModel } from "./database/database.js"

const region: ServerRegion = "ASIA"
const identifier: ServerIdentifier = "I"

let earthMag: Mage
let earthMag2: Mage
let earthMag3: Mage
let earthMer: Merchant
let earthMer2: Merchant
let earthMer3: Merchant
let earthMer4: Merchant
let earthMer5: Merchant
let earthPal: PingCompensatedPlayer
let earthPri: Priest
let earthPri2: Priest
let earthiverse: Ranger
let earthRan2: Ranger
let earthRan3: Ranger
let earthRog: Rogue
let earthRog2: Rogue
let earthWar: Warrior
let earthWar2: Warrior

async function generalBotStuff(bot: PingCompensatedPlayer) {
    bot.socket.on("magiport", async (data: { name: string }) => {
        if (["earthMag", "earthMag2", "earthMag3"].includes(data.name)) {
            if (bot.character.c.town) await bot.stopWarpToTown()
            await bot.acceptMagiport(data.name)
            return
        }
    })

    async function buyLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.canBuy("hpot1")) {
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
                    if (item.b) continue // They are buying, not selling

                    const q = item.q === undefined ? 1 : item.q

                    // Join new giveaways
                    if (item.giveaway && bot.character.ctype == "merchant" && (!item.list || !item.list.includes(bot.character.id))) {
                        // TODO: Move this to a function
                        bot.socket.emit("join_giveaway", { slot: slot, id: player.id, rid: item.rid })
                        continue
                    }

                    // Buy if we can resell to NPC for more money
                    const cost = await Tools.calculateCost(item)
                    if ((item.price < cost * 0.6) // Item is lower price than G, which means we could sell it to an NPC straight away and make a profit...
                        || ITEMS_TO_BUY.includes(item.name) && item.price <= cost // Item is the same, or lower price than the NPC would sell for, and we want it.
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
                if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't compound items we want to sell unless they're special

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
            if (bot.character.ctype == "merchant") return // Don't buy or equip an elixir if we're a merchant.

            if (!bot.character.slots.elixir) {
                let luckElixir = bot.locateItem("elixirluck")
                if (luckElixir == undefined && bot.canBuy("elixirluck")) luckElixir = await bot.buy("elixirluck")
                if (luckElixir !== undefined) await bot.equip(luckElixir)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { elixirLoop() }, 1000)
    }
    elixirLoop()

    async function exchangeLoop() {
        try {
            if (bot.socket.disconnected) return

            // TODO: Make bot.canExchange() function and replace the following line with that
            const hasComputer = bot.locateItem("computer") !== undefined

            if (hasComputer) {
                for (let i = 0; i < bot.character.items.length; i++) {
                    if (bot.character.esize <= 1) break // We are full

                    const item = bot.character.items[i]
                    if (!item) continue
                    if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Don't want / can't exchange

                    const gInfo = bot.G.items[item.name]
                    if (gInfo.e !== undefined && item.q < gInfo.e) continue // Don't have enough to exchange

                    await bot.exchange(i)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { exchangeLoop() }, 250)
    }
    exchangeLoop()

    async function givePotionsLoop() {
        try {
            if (bot.socket.disconnected) return
            if (!bot.hasItem("computer")) return // Don't give potions if we don't have a computer

            for (const friend of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                if (!friend) continue
                if (Tools.distance(bot.character, friend.character) > NPC_INTERACTION_DISTANCE) continue

                const ourHpot1 = bot.countItem("hpot1")
                if (ourHpot1 < 1000 && bot.canBuy("hpot1")) await bot.buy("hpot1", 1000 - ourHpot1)
                const ourMpot1 = bot.countItem("mpot1")
                if (ourMpot1 < 1000 && bot.canBuy("mpot1")) await bot.buy("mpot1", 1000 - ourMpot1)

                const numHpot1ToGive = 1000 - friend.countItem("hpot1")
                if (numHpot1ToGive > 0) {
                    await bot.sendItem(friend.character.id, bot.locateItem("hpot1", bot.character.items, { quantityGreaterThan: numHpot1ToGive - 1 }))
                }
                const numMpot1ToGive = 1000 - friend.countItem("mpot1")
                if (numMpot1ToGive > 0) {
                    await bot.sendItem(friend.character.id, bot.locateItem("mpot1", bot.character.items, { quantityGreaterThan: numMpot1ToGive - 1 }))
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { givePotionsLoop() }, 1000)
    }
    givePotionsLoop()

    async function healLoop() {
        try {
            if (bot.socket.disconnected) return

            const missingHP = bot.character.max_hp - bot.character.hp
            const missingMP = bot.character.max_mp - bot.character.mp
            const hpRatio = bot.character.hp / bot.character.max_hp
            const mpRatio = bot.character.mp / bot.character.max_mp
            const hpot1 = bot.locateItem("hpot1")
            const hpot0 = bot.locateItem("hpot0")
            const mpot1 = bot.locateItem("mpot1")
            const mpot0 = bot.locateItem("mpot0")
            if (hpRatio < mpRatio) {
                if (missingHP >= 400 && hpot1 !== undefined) {
                    await bot.useHPPot(hpot1)
                } else if (missingHP >= 200 && hpot0 !== undefined) {
                    await bot.useHPPot(hpot0)
                } else {
                    await bot.regenHP()
                }
            } else if (mpRatio < hpRatio) {
                if (missingMP >= 500 && mpot1 !== undefined) {
                    await bot.useMPPot(mpot1)
                } else if (missingMP >= 300 && mpot0 !== undefined) {
                    await bot.useMPPot(mpot0)
                } else {
                    await bot.regenMP()
                }
            } else if (hpRatio < 1) {
                if (missingHP >= 400 && hpot1 !== undefined) {
                    await bot.useHPPot(hpot1)
                } else if (missingHP >= 200 && hpot0 !== undefined) {
                    await bot.useHPPot(hpot0)
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

            for (const [, chest] of bot.chests) {
                if (Tools.distance(bot.character, chest) > 800) continue
                await bot.openChest(chest.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 250)
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

            for (const merchant of [earthMer, earthMer2, earthMer3, earthMer4, earthMer5]) {
                if (!merchant) continue
                if (bot.party && bot.party.list && bot.party.list[0] !== merchant.character.id) bot.leaveParty()
                if (!bot.party) bot.sendPartyRequest(merchant.character.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 1000)
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
                if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't upgrade items we want to sell unless it's special

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

async function botMovement(bot: PingCompensatedPlayer, target: MonsterName) {
    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.character.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            let closestEntitiy: EntityData
            let closestDistance: number = Number.MAX_VALUE
            for (const [, entity] of bot.entities) {
                if (entity.type !== target) continue
                if (entity.cooperative !== true && entity.target && bot.character.id !== entity.target) continue // It's targeting someone else

                // If the target will die to incoming projectiles, ignore it
                if (Tools.willDieToProjectiles(entity, bot)) continue

                // If the target will burn to death, ignore it
                if (Tools.willBurnToDeath(entity)) continue

                const distance = Tools.distance(bot.character, entity)
                if (distance < closestDistance) {
                    closestDistance = distance
                    closestEntitiy = entity
                }
            }

            try {
                if (!closestEntitiy && !bot.character.moving) await bot.smartMove(target)
                else if (closestEntitiy && Tools.distance(bot.character, closestEntitiy) > bot.character.range) await bot.smartMove(closestEntitiy, { getWithin: bot.character.range - closestEntitiy.speed })
            } catch (e) {
                // console.error(e)
                bot.stopSmartMove()
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}


async function startRanger(bot: Ranger) {
    console.info(`Starting ranger (${bot.character.id})`)

    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            if (bot.canUse("attack")) {
                const targets: EntityData[] = []
                const threeshotTargets: EntityData[] = []
                const fiveshotTargets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(entity)

                    // If we can kill enough monsters in one shot, let's try to do that
                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (!entity.immune && entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                    if (!entity.immune && entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
                }

                // Energize if we can
                if (!bot.character.s.energized) {
                    for (const mage of [earthMag, earthMag2, earthMag3]) {
                        if (!mage) continue // Not online
                        if (!mage.canUse("energize")) continue // Can't energize
                        if (mage.character.id == bot.character.id) continue // Can't energize ourself (TODO: is this true?)
                        if (Tools.distance(bot.character, mage.character) > bot.G.skills.energize.range) continue // Too far away

                        mage.energize(bot.character.id)
                        break
                    }
                }

                if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
                    for (const target of fiveshotTargets) {
                        if (await Tools.isGuaranteedKill(bot.character, target)) {
                            for (const bot of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                                if (!bot) continue
                                bot.entities.delete(target.id)
                            }
                        }
                    }
                    await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
                } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
                    for (const target of threeshotTargets) {
                        if (await Tools.isGuaranteedKill(bot.character, target)) {
                            for (const bot of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                                if (!bot) continue
                                bot.entities.delete(target.id)
                            }
                        }
                    }
                    await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
                } else if (targets.length) {
                    if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                        for (const bot of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                            if (!bot) continue
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    // TODO: If we can do more damage with a `piercingshot`, do it.
                    await bot.attack(targets[0].id)
                }
            }

            if (bot.canUse("supershot")) {
                const targets: string[] = []
                for (const [id, entity] of bot.entities) {
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
                    if (entity.immune) continue // Entity won't take damage from supershot

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

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
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot"))))
    }
    attackLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!earthMer2 || earthMer2.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer2.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer2.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer2.character.id, i, item.q)
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
    async function attackLoop() {
        let cooldown = 10
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            // Heal ourselves if we are low HP
            if (bot.canUse("heal") && bot.character.hp < bot.character.max_hp * 0.8) {
                await bot.heal(bot.character.id)
                setTimeout(async () => { attackLoop() }, bot.getCooldown("heal"))
                return
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("attack")) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

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
                    if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                        for (const bot of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                            if (!bot) continue
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    await bot.attack(targets[0].id)
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

            if (!earthMer2 || earthMer2.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer2.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer2.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer2.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

    async function partyHealLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.c.town) {
                setTimeout(async () => { partyHealLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("partyheal")) {
                for (const friend of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                    if (!friend || !friend.party || !friend.party.list.includes(bot.character.id)) continue // We aren't in the party!?
                    if (friend.character.hp < friend.character.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await bot.partyHeal()
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

    async function darkBlessingLoop() {
        try {
            if (bot.socket.disconnected) return
            if (bot.canUse("darkblessing")) await bot.darkBlessing()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { darkBlessingLoop() }, Math.max(10, bot.getCooldown("darkblessing")))
    }
    darkBlessingLoop()
}

async function startWarrior(bot: Warrior) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("attack")) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

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
                    if (await Tools.isGuaranteedKill(bot.character, targets[0])) {
                        for (const bot of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                            if (!bot) continue
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    await bot.attack(targets[0].id)
                }
            }

            if (bot.canUse("cleave")) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else
                    if (Tools.distance(bot.character, entity) > bot.G.skills.cleave.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(entity)
                }

                if (targets.length) {
                    await bot.cleave()
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("cleave"))))
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

            if (!earthMer2 || earthMer2.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer2.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer2.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || WARRIOR_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer2.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

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

    let lastBankVisit = Number.MIN_VALUE
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
            if (freeSlots == 0 || lastBankVisit < Date.now() - 300000) {
                await bot.closeMerchantStand()
                await bot.smartMove("items1")

                lastBankVisit = Date.now()

                // Deposit excess gold
                const excessGold = bot.character.gold - 100000000
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

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // Move to our friends if they have lots of items (they'll send them over)
            for (const friend of [earthMag, earthMag2, earthMag3, earthMer, earthMer2, earthMer3, earthMer4, earthMer5, earthPal, earthPri, earthPri2, earthiverse, earthRan2, earthRan3, earthRog, earthRog2, earthWar, earthWar2]) {
                if (!friend) continue

                // Check if they're full, or they need mluck
                if (friend.isFull() || (bot.canUse("mluck") && (!friend.character.s.mluck || friend.character.s.mluck.ms < 120000 || friend.character.s.mluck.f !== bot.character.id))) {
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

                await bot.closeMerchantStand()
                await bot.smartMove(bot.S[type], { getWithin: 100 })

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // Find other characters that need mluck and go find them
            if (bot.canUse("mluck")) {
                const charactersToMluck = await PlayerModel.find({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 60000 }, $or: [{ "s.mluck": undefined }, { "s.mluck.strong": undefined, "s.mluck.f": { "$ne": bot.character.id } }] }).lean().exec()
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
            await bot.smartMove("main")
            await bot.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function tradeLoop() {
        try {
            if (bot.socket.disconnected) return

            const mhTokens = bot.locateItem("monstertoken")
            if (mhTokens !== undefined && bot.character.stand) {
                if (bot.character.slots.trade1) await bot.unequip("trade1")

                const numTokens = bot.character.items[mhTokens].q

                await bot.listForSale(mhTokens, "trade1", 250000, numTokens)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { tradeLoop() }, 250)
    }
    tradeLoop()
}

async function run() {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    try {
        // const loop_earthiverse = async () => {
        //     try {
        //         await Game.stopCharacter("earthiverse")
        //         earthiverse = await Game.startRanger("earthiverse", region, identifier)
        //         earthiverse.socket.on("disconnect", async () => { await loop_earthiverse() })
        //         startRanger(earthiverse)
        //         generalBotStuff(earthiverse)
        //         botMovement(earthiverse, "crab")
        //     } catch (e) {
        //         await Game.stopCharacter("earthiverse")
        //         setTimeout(async () => { await loop_earthiverse() }, 1000)
        //     }
        // }
        const loop_earthRan2 = async () => {
            try {
                await Game.stopCharacter("earthRan2")
                earthRan2 = await Game.startRanger("earthRan2", region, identifier)
                earthRan2.socket.on("disconnect", async () => { await loop_earthRan2() })
                startRanger(earthRan2)
                generalBotStuff(earthRan2)
                botMovement(earthRan2, "snake")
            } catch (e) {
                await Game.stopCharacter("earthRan2")
                setTimeout(async () => { await loop_earthRan2() }, 1000)
            }
        }
        // const loop_earthMag = async () => {
        //     try {
        //         await Game.stopCharacter("earthMag")
        //         earthMag = await Game.startMage("earthMag", region, identifier)
        //         earthMag.socket.on("disconnect", async () => { await loop_earthMag() })
        //         startMage(earthMag)
        //         generalBotStuff(earthMag)
        //         botMovement(earthMag, "crab")
        //     } catch (e) {
        //         await Game.stopCharacter("earthMag")
        //         setTimeout(async () => { await loop_earthMag() }, 1000)
        //     }
        // }
        // const loop_earthMag2 = async () => {
        //     try {
        //         await Game.stopCharacter("earthMag2")
        //         earthMag2 = await Game.startMage("earthMag2", region, identifier)
        //         earthMag2.socket.on("disconnect", async () => { await loop_earthMag2() })
        //         startMage(earthMag2)
        //         generalBotStuff(earthMag2)
        //         botMovement(earthMag2, "goo")
        //     } catch (e) {
        //         await Game.stopCharacter("earthMag2")
        //         setTimeout(async () => { await loop_earthMag2() }, 1000)
        //     }
        // }
        // const loop_earthWar = async () => {
        //     try {
        //         await Game.stopCharacter("earthWar")
        //         earthWar = await Game.startWarrior("earthWar", region, identifier)
        //         earthWar.socket.on("disconnect", async () => { await loop_earthWar() })
        //         startWarrior(earthWar)
        //         generalBotStuff(earthWar)
        //         botMovement(earthWar, "croc")
        //     } catch (e) {
        //         await Game.stopCharacter("earthWar")
        //         setTimeout(async () => { await loop_earthWar() }, 1000)
        //     }
        // }
        const loop_earthWar2 = async () => {
            try {
                await Game.stopCharacter("earthWar2")
                earthWar2 = await Game.startWarrior("earthWar2", region, identifier)
                earthWar2.socket.on("disconnect", async () => { await loop_earthWar2() })
                startWarrior(earthWar2)
                generalBotStuff(earthWar2)
                botMovement(earthWar2, "poisio")
            } catch (e) {
                await Game.stopCharacter("earthWar2")
                setTimeout(async () => { await loop_earthWar2() }, 1000)
            }
        }
        // const loop_earthPri = async () => {
        //     try {
        //         await Game.stopCharacter("earthPri")
        //         earthPri = await Game.startPriest("earthPri", region, identifier)
        //         earthPri.socket.on("disconnect", async () => { await loop_earthPri() })
        //         startPriest(earthPri)
        //         generalBotStuff(earthPri)
        //         botMovement(earthPri, "bee")
        //     } catch (e) {
        //         await Game.stopCharacter("earthPri")
        //         setTimeout(async () => { await loop_earthPri() }, 1000)
        //     }
        // }
        const loop_earthPri2 = async () => {
            try {
                await Game.stopCharacter("earthPri2")
                earthPri2 = await Game.startPriest("earthPri2", region, identifier)
                earthPri2.socket.on("disconnect", async () => { await loop_earthPri2() })
                startPriest(earthPri2)
                generalBotStuff(earthPri2)
                botMovement(earthPri2, "snake")
            } catch (e) {
                await Game.stopCharacter("earthPri2")
                setTimeout(async () => { await loop_earthPri2() }, 1000)
            }
        }
        // const loop_earthMer = async () => {
        //     try {
        //         await Game.stopCharacter("earthMer")
        //         earthMer = await Game.startMerchant("earthMer", region, identifier)
        //         earthMer.socket.on("disconnect", async () => { await loop_earthMer() })
        //         startMerchant(earthMer)
        //         generalBotStuff(earthMer)
        //     } catch (e) {
        //         await Game.stopCharacter("earthMer")
        //         setTimeout(async () => { await loop_earthMer() }, 1000)
        //     }
        // }
        const loop_earthMer2 = async () => {
            try {
                await Game.stopCharacter("earthMer2")
                earthMer2 = await Game.startMerchant("earthMer2", region, identifier)
                earthMer2.socket.on("disconnect", async () => { await loop_earthMer2() })
                startMerchant(earthMer2)
                generalBotStuff(earthMer2)
            } catch (e) {
                await Game.stopCharacter("earthMer2")
                setTimeout(async () => { await loop_earthMer2() }, 1000)
            }
        }

        // loop_earthiverse()
        loop_earthRan2()
        // loop_earthMag()
        // loop_earthMag2()
        // loop_earthWar()
        loop_earthWar2()
        // loop_earthPri()
        loop_earthPri2()
        // loop_earthMer()
        loop_earthMer2()
    } catch (e) {
        await Game.disconnect(false)
    }
}
run()