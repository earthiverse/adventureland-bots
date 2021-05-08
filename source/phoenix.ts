import { ITEMS_TO_BUY, ITEMS_TO_EXCHANGE, ITEMS_TO_SELL, MAGE_ITEMS_TO_HOLD, MERCHANT_ITEMS_TO_HOLD, NPC_INTERACTION_DISTANCE } from "./constants.js"
import { EntityData, HitData } from "./definitions/adventureland-server.js"
import { ItemName, MonsterName, ServerIdentifier, ServerRegion, TradeSlotType } from "./definitions/adventureland.js"
import { Game } from "./Game.js"
import { Merchant } from "./Merchant.js"
import { PingCompensatedPlayer } from "./PingCompensatedPlayer.js"
import { Pathfinder } from "./Pathfinder.js"
import { Tools } from "./Tools.js"
import { Mage } from "./Mage.js"
import { EntityModel } from "./database/entities/entities.model.js"
import { PlayerModel } from "./database/players/players.model.js"

const region: ServerRegion = "ASIA"
const identifier: ServerIdentifier = "I"

let earthMag: Mage
let earthMag2: Mage
let earthMag3: Mage
let earthMer3: Merchant

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

            for (const friend of [earthMag, earthMag2, earthMag3, earthMer3]) {
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

            for (const merchant of [earthMer3]) {
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
            for (const friend of [earthMag, earthMag2, earthMag3, earthMer3]) {
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

async function startMage(bot: Mage, n: number) {
    const lastMagiportOffer: { [T in string]: number } = {}

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) return

            // If we are dead, respawn
            if (bot.character.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            // See if we are close to a phoenix
            for (const [, entity] of bot.entities) {
                if (entity.type !== "phoenix") continue
                if (Tools.distance(bot.character, entity) >= bot.character.range) {
                    await bot.smartMove(entity, { useBlink: true })
                } else if (entity.hp > entity.max_hp * 0.25) {
                    // Offer magiports to other mages
                    for (const mage of [earthMag, earthMag2, earthMag3]) {
                        if (!mage) continue
                        if (mage.character.id == bot.character.id) continue // Don't offer a magiport to ourselves
                        if (bot.players.has(mage.character.id)) continue // Already close

                        // Offer magiport if they're far away
                        if (bot.canUse("magiport") && (!lastMagiportOffer[mage.character.id] || lastMagiportOffer[mage.character.id] < Date.now() - 30000)) {
                            lastMagiportOffer[mage.character.id] = Date.now()
                            bot.magiport(mage.character.id)
                        }
                    }
                }
                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // See if we have spotted a phoenix in our database
            const target = await EntityModel.findOne({ serverRegion: region, serverIdentifier: identifier, type: "phoenix", lastSeen: { $gt: Date.now() - 30000 } }).lean().exec()
            if (target) {
                await bot.smartMove(target, { useBlink: true })
            } else {
                const locations = bot.locateMonsters("phoenix")
                if (n == 0) {
                    await bot.smartMove(locations[2]) // western main spawn
                } else if (n == 1) {
                    if (Tools.distance(bot.character, locations[4]) < 250) {
                        await bot.smartMove(locations[1]) // armadillo main spawn
                    } else {
                        await bot.smartMove(locations[4]) // bat cave spawn
                    }
                } else if (n == 2) {
                    if (Tools.distance(bot.character, locations[0]) < 250) {
                        await bot.smartMove(locations[3]) // minimush halloween spawn
                    } else {
                        await bot.smartMove(locations[0]) // spider main spawn
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function attackLoop() {
        try {
            if (bot.socket.disconnected) return

            if (bot.character.targets > 2 && bot.canUse("scare")) {
                await bot.scare()
            }

            let target: EntityData
            for (const [, entity] of bot.entities) {
                if (entity.type == "phoenix") {
                    if (Tools.distance(bot.character, entity) < bot.character.range) target = entity
                    break
                }
                if (Tools.distance(bot.character, entity) < bot.character.range &&
                    (["armadillo", "bat", "bee", "crab", "crabx", "croc", "fieldgen0", "frog", "goo", "minimush", "poisio", "scorpion", "spider", "squig", "squigtoad", "tortoise"] as MonsterName[]).includes(entity.type)) {
                    target = entity
                }
            }

            if (bot.character.c.town) {
                if (target && target.type == "phoenix") {
                    bot.stopWarpToTown()
                } else {
                    setTimeout(async () => { attackLoop() }, 50)
                    return
                }
            }

            if (target && bot.canUse("attack")) {
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

                if (await Tools.isGuaranteedKill(bot.character, target)) {
                    for (const bot of [earthMag, earthMag2, earthMag3, earthMer3]) {
                        if (!bot) continue
                        bot.entities.delete(target.id)
                    }
                }

                await bot.attack(target.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function sendItemLoop() {
        try {
            if (bot.socket.disconnected) return

            if (!earthMer3 || earthMer3.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(earthMer3.character.id)
            if (sendTo && Tools.distance(bot.character, sendTo) < NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.character.gold - 1000000
                if (extraGold > 0) await bot.sendGold(earthMer3.character.id, extraGold)
                for (let i = 0; i < bot.character.items.length; i++) {
                    const item = bot.character.items[i]
                    if (!item || MAGE_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(earthMer3.character.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function run() {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    try {
        const loop_earthMag = async () => {
            try {
                await Game.stopCharacter("earthMag")
                earthMag = await Game.startMage("earthMag", region, identifier)
                earthMag.socket.on("disconnect", async () => { await loop_earthMag() })
                startMage(earthMag, 0)
                generalBotStuff(earthMag)
            } catch (e) {
                await Game.stopCharacter("earthMag")
                setTimeout(async () => { await loop_earthMag() }, 1000)
            }
        }
        const loop_earthMag2 = async () => {
            try {
                await Game.stopCharacter("earthMag2")
                earthMag2 = await Game.startMage("earthMag2", region, identifier)
                earthMag2.socket.on("disconnect", async () => { await loop_earthMag2() })
                startMage(earthMag2, 1)
                generalBotStuff(earthMag2)
            } catch (e) {
                await Game.stopCharacter("earthMag2")
                setTimeout(async () => { await loop_earthMag2() }, 1000)
            }
        }
        const loop_earthMag3 = async () => {
            try {
                await Game.stopCharacter("earthMag3")
                earthMag3 = await Game.startMage("earthMag3", region, identifier)
                earthMag3.socket.on("disconnect", async () => { await loop_earthMag3() })
                startMage(earthMag3, 2)
                generalBotStuff(earthMag3)
            } catch (e) {
                await Game.stopCharacter("earthMag3")
                setTimeout(async () => { await loop_earthMag3() }, 1000)
            }
        }
        const loop_earthMer3 = async () => {
            try {
                await Game.stopCharacter("earthMer3")
                earthMer3 = await Game.startMerchant("earthMer3", region, identifier)
                earthMer3.socket.on("disconnect", async () => { await loop_earthMer3() })
                startMerchant(earthMer3)
                generalBotStuff(earthMer3)
            } catch (e) {
                await Game.stopCharacter("earthMer3")
                setTimeout(async () => { await loop_earthMer3() }, 1000)
            }
        }

        loop_earthMag()
        loop_earthMag2()
        loop_earthMag3()
        loop_earthMer3()
    } catch (e) {
        await Game.disconnect(false)
    }
}
run()