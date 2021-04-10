import { NPC_INTERACTION_DISTANCE, ITEMS_TO_BUY, ITEMS_TO_SELL, ITEMS_TO_EXCHANGE, PRIEST_ITEMS_TO_HOLD, RANGER_ITEMS_TO_HOLD } from "./constants.js"
import { EntityData, HitData } from "./definitions/adventureland-server.js"
import { IPosition, ItemName, ServerIdentifier, ServerRegion, TradeSlotType } from "./definitions/adventureland.js"
import { Game } from "./Game.js"
import { Merchant } from "./Merchant.js"
import { Pathfinder } from "./Pathfinder.js"
import { PingCompensatedPlayer } from "./PingCompensatedPlayer.js"
import { Priest } from "./Priest.js"
import { Ranger } from "./Ranger.js"
import { Tools } from "./Tools.js"

/**
 * NOTE: The only weapon the merchant can attack with is the golden gun, so this script only works for hazarding a golden gun.
 */

const FARMING_TARGET = "scorpion"
const FARMING_POSITION: IPosition = { map: "desertland", x: 390, y: -1422 }

let earthMer: Merchant
let earthPri: Priest
let earthPri2: Priest
let earthiverse: Ranger

async function generalBotStuff(bot: PingCompensatedPlayer) {
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

            for (const friend of [earthMer, earthiverse, earthPri, earthPri2]) {
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

            if (earthMer) {
                if (bot.party && bot.party.list && bot.party.list[0] !== earthMer.character.id) bot.leaveParty()
                if (!bot.party) bot.sendPartyRequest(earthMer.character.id)
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

async function startMerchant(bot: Merchant) {
    bot.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

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
                    if (entity.cooperative !== true && entity.target) continue // It's targeting someone
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    if (entity.type !== FARMING_TARGET) continue

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
                        for (const bot of [earthMer, earthiverse, earthPri, earthPri2]) {
                            if (!bot) continue
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    await bot.attack(targets[0].id)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            if (Tools.distance(bot.character, FARMING_POSITION) > bot.character.range) {
                await bot.smartMove(FARMING_POSITION)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startPriest(bot: Priest) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.rip) {
                setTimeout(async () => { attackLoop() }, 1000)
                return
            }

            if (bot.canUse("heal")) {
                // Heal party members if they are close
                let target: PingCompensatedPlayer
                for (const friend of [earthMer, earthiverse, earthPri, earthPri2]) {
                    if (!friend) continue // Not up
                    if (friend.character.hp > friend.character.max_hp * 0.8) continue // Lots of health, no need to heal
                    if (Tools.distance(bot.character, friend.character) > bot.character.range) continue // Too far away to heal

                    target = friend
                    break
                }
                if (target) {
                    await bot.heal(target.character.id)
                    setTimeout(async () => { attackLoop() }, bot.getCooldown("heal"))
                    return
                }
            }

            if (bot.character.c.town) {
                setTimeout(async () => { attackLoop() }, bot.character.c.town.ms)
                return
            }

            if (bot.canUse("attack")) {
                const targets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.target !== earthMer.character.id) continue // Only attack those targeting our merchant
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    if (entity.type !== FARMING_TARGET) continue

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
                        for (const bot of [earthMer, earthiverse, earthPri, earthPri2]) {
                            if (!bot) continue
                            bot.entities.delete(targets[0].id)
                        }
                    }
                    await bot.attack(targets[0].id)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            if (Tools.distance(bot.character, FARMING_POSITION) > bot.character.range / 2) {
                const NEW_FARMING_POSITION = {
                    map: FARMING_POSITION.map,
                    x: FARMING_POSITION.x - bot.character.range / 2 + (Math.random() * bot.character.range),
                    y: FARMING_POSITION.y - bot.character.range / 2 + (Math.random() * bot.character.range)
                }

                await bot.smartMove(NEW_FARMING_POSITION)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!earthMer || earthMer.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer.character.id, i, item.q)
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
                for (const friend of [earthMer, earthiverse, earthPri, earthPri2]) {
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

        setTimeout(async () => { partyHealLoop() }, Math.max(bot.getCooldown("partyheal"), 10))
    }
    partyHealLoop()
}

async function startRanger(bot: Ranger) {
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
                const threeshotTargets: EntityData[] = []
                const fiveshotTargets: EntityData[] = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "porcupine") continue
                    if (Tools.distance(bot.character, entity) > bot.character.range) continue // Only attack those in range
                    if (entity.cooperative !== true && entity.target && entity.target !== bot.character.id) continue // It's targeting someone else

                    // If the target will die to incoming projectiles, ignore it
                    if (Tools.willDieToProjectiles(entity, bot)) continue

                    // If the target will burn to death, ignore it
                    if (Tools.willBurnToDeath(entity)) continue

                    targets.push(entity)

                    // If we can kill enough monsters in one shot, let's try to do that
                    const minimumDamage = Tools.calculateDamageRange(bot.character, entity)[0]
                    if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
                    if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
                }

                if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
                    await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
                } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
                    await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
                } else if (targets.length) {
                    if (bot.canUse("huntersmark")) {
                        await bot.huntersMark(targets[0].id)
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
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            await bot.smartMove("porcupine")
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 1000)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!earthMer || earthMer.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function run(region: ServerRegion, identifier: ServerIdentifier, merchantName: string, priest1Name: string, priest2Name: string, rangerName: string) {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    const loop_earthMer = async () => {
        try {
            await Game.stopCharacter(merchantName)
            earthMer = await Game.startMerchant(merchantName, region, identifier)
            earthMer.socket.on("disconnect", async () => { await loop_earthMer() })
            startMerchant(earthMer)
            generalBotStuff(earthMer)
        } catch (e) {
            await Game.stopCharacter(merchantName)
            setTimeout(async () => { await loop_earthMer() }, 1000)
        }
    }
    const loop_earthPri = async () => {
        try {
            await Game.stopCharacter(priest1Name)
            earthPri = await Game.startPriest(priest1Name, region, identifier)
            earthPri.socket.on("disconnect", async () => { await loop_earthPri() })
            startPriest(earthPri)
            generalBotStuff(earthPri)
        } catch (e) {
            await Game.stopCharacter(priest1Name)
            setTimeout(async () => { await loop_earthPri() }, 1000)
        }
    }
    const loop_earthPri2 = async () => {
        try {
            await Game.stopCharacter(priest2Name)
            earthPri2 = await Game.startPriest(priest2Name, region, identifier)
            earthPri2.socket.on("disconnect", async () => { await loop_earthPri2() })
            startPriest(earthPri2)
            generalBotStuff(earthPri2)
        } catch (e) {
            await Game.stopCharacter(priest2Name)
            setTimeout(async () => { await loop_earthPri2() }, 1000)
        }
    }
    const loop_earthiverse = async () => {
        try {
            await Game.stopCharacter(rangerName)
            earthiverse = await Game.startRanger(rangerName, region, identifier)
            earthiverse.socket.on("disconnect", async () => { await loop_earthiverse() })
            startRanger(earthiverse)
            generalBotStuff(earthiverse)
        } catch (e) {
            await Game.stopCharacter(rangerName)
            setTimeout(async () => { await loop_earthiverse() }, 1000)
        }
    }

    loop_earthMer()
    loop_earthPri()
    loop_earthPri2()
    loop_earthiverse()
}
run("US", "I", "earthMer", "earthPri", "earthPri2", "earthiverse")