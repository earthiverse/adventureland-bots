// import { MonsterData, ServerRegion, ServerIdentifier, Ranger, MonsterName, Warrior, Priest, Merchant, Tools, TradeSlotType, ItemName, HitData, Pathfinder, SlotType, PlayerData, Game, PingCompensatedCharacter, Constants, Entity, ServerInfoDataLive } from "alclient"
// import { NodeData } from "alclient/build/definitions/pathfinder"
// import { Strategy } from "./definitions/bot"

// const DEFAULT_REGION: ServerRegion = "US"
// const DEFAULT_IDENTIFIER: ServerIdentifier = "II"
// let region: ServerRegion = DEFAULT_REGION
// let identifier: ServerIdentifier = DEFAULT_IDENTIFIER

// let ranger: Ranger
// let rangerTarget: MonsterName
// let warrior: Warrior
// let warriorTarget: MonsterName
// let priest: Priest
// let priestTarget: MonsterName
// let merchant: Merchant

// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// async function getTarget(bot: PingCompensatedCharacter, strategy: Strategy): Promise<MonsterName> {
//     // Priority #1: Special co-op monsters that take a team effort
//     const coop: MonsterName[] = [
//         "dragold", "grinch", "mrgreen", "mrpumpkin", "franky",
//     ]
//     const coopEntities: IEntity[] = await EntityModel.aggregate([
//         {
//             $match: {
//                 type: { $in: coop },
//                 target: { $ne: undefined }, // We only want to do these if others are doing them, too.
//                 serverRegion: bot.server.region,
//                 serverIdentifier: bot.server.name,
//                 lastSeen: { $gt: Date.now() - 120000 }
//             }
//         },
//         { $addFields: { __order: { $indexOfArray: [coop, "$type"] } } },
//         { $sort: { "__order": 1 } }]).exec()
//     for (const entity of coopEntities) {
//         // Look in database of entities
//         if (!strategy[entity.type]) continue // No strategy
//         if (strategy[entity.type].requirePriest && bot.ctype !== "priest" && priestTarget !== entity.type) continue // Need priest
//         if (bot.G.monsters[entity.type].cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//         return entity.type
//     }

//     // Priority #2: Special monsters that we can defeat by ourselves
//     const solo: MonsterName[] = [
//         "goldenbat",
//         // Very Rare Monsters
//         "tinyp", /*"cutebee",*/
//         // Event Monsters
//         "pinkgoo", "wabbit",
//         // Rare Monsters
//         "greenjr", "jr", "skeletor", "mvampire", "fvampire", "snowman"
//     ]
//     const soloEntities: IEntity[] = await EntityModel.aggregate([
//         {
//             $match: {
//                 type: { $in: solo },
//                 serverRegion: bot.server.region,
//                 serverIdentifier: bot.server.name,
//                 lastSeen: { $gt: Date.now() - 120000 }
//             }
//         },
//         { $addFields: { __order: { $indexOfArray: [solo, "$type"] } } },
//         { $sort: { "__order": 1 } }]).exec()
//     for (const entity of soloEntities) {
//         // Look in database of entities
//         if (!strategy[entity.type]) continue // No strategy
//         if (strategy[entity.type].requirePriest && bot.ctype !== "priest" && priestTarget !== entity.type) continue // Need priest
//         if (bot.G.monsters[entity.type].cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//         return entity.type
//     }

//     // Priority #4: Bsorpions to farm primlings
//     return "bscorpion"
// }

// async function generalBotStuff(bot: PingCompensatedCharacter) {
//     bot.socket.on("magiport", async (data: { name: string }) => {
//         if (["earthMag", "earthMag2", "earthMag3"].includes(data.name)) {
//             if (bot.c.town) await bot.stopWarpToTown()
//             await bot.acceptMagiport(data.name)
//             return
//         }
//     })

//     // const pontyLocations = bot.locateNPC("secondhands")
//     async function buyLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.canBuy("hpot1")) {
//                 // Buy HP Pots
//                 const numHpot1 = bot.countItem("hpot1")
//                 if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

//                 // Buy MP Pots
//                 const numMpot1 = bot.countItem("mpot1")
//                 if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
//             }

//             if (bot.canBuy("xptome")) {
//                 const numXPTome = bot.countItem("xptome")
//                 if (numXPTome == 0) await bot.buy("xptome", 1)
//             }

//             // // Buy things from Ponty
//             // for (const ponty of pontyLocations) {
//             //     if (Tools.distance(bot, ponty) > Constants.NPC_INTERACTION_DISTANCE) continue
//             //     const pontyItems = await bot.getPontyItems()
//             //     for (const item of pontyItems) {
//             //         if (!item) continue

//             //         if (
//             //             item.p // Buy all shiny/glitched/etc. items
//             //             || ITEMS_TO_BUY.includes(item.name) // Buy anything in our buy list
//             //         ) {
//             //             await bot.buyFromPonty(item)
//             //             continue
//             //         }
//             //     }
//             // }

//             // Look for buyable things on merchants
//             for (const [, player] of bot.players) {
//                 if (!player.stand) continue // Not selling anything
//                 if (Tools.distance(bot, player) > Constants.NPC_INTERACTION_DISTANCE) continue // Too far away

//                 for (const s in player.slots) {
//                     const slot = s as TradeSlotType
//                     const item = player.slots[slot]
//                     if (!item) continue // Nothing in the slot
//                     if (!item.rid) continue // Not a trade item
//                     if (item.b) continue // They are buying, not selling

//                     const q = item.q == undefined ? 1 : item.q

//                     // Join new giveaways
//                     if (item.giveaway && bot.ctype == "merchant" && (!item.list || !item.list.includes(bot.id))) {
//                         // TODO: Move this to a function
//                         bot.socket.emit("join_giveaway", { slot: slot, id: player.id, rid: item.rid })
//                         continue
//                     }

//                     // Buy if we can resell to NPC for more money
//                     const cost = await Tools.calculateCost(item)
//                     if ((item.price < cost * 0.6) // Item is lower price than G, which means we could sell it to an NPC straight away and make a profit...
//                         || ITEMS_TO_BUY.includes(item.name) && item.price <= cost // Item is the same, or lower price than the NPC would sell for, and we want it.
//                     ) {
//                         await bot.buyFromMerchant(player.id, slot, item.rid, q)
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }
//         setTimeout(async () => { buyLoop() }, 1000)
//     }
//     buyLoop()

//     async function compoundLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.q.compound) {
//                 // We are upgrading, we have to wait
//                 setTimeout(async () => { compoundLoop() }, bot.q.compound.ms)
//                 return
//             }
//             if (bot.map.startsWith("bank")) {
//                 // We are in the bank, we have to wait
//                 setTimeout(async () => { compoundLoop() }, 1000)
//                 return
//             }

//             const duplicates = bot.locateDuplicateItems()
//             for (const iN in duplicates) {
//                 const itemName = iN as ItemName
//                 const numDuplicates = duplicates[iN].length

//                 // Check if there's enough to compound
//                 if (numDuplicates < 3) {
//                     delete duplicates[itemName]
//                     continue
//                 }

//                 // Check if there's three with the same level. If there is, set the array to those three
//                 let found = false
//                 for (let i = 0; i < numDuplicates - 2; i++) {
//                     const item1 = bot.items[duplicates[itemName][i]]
//                     const item2 = bot.items[duplicates[itemName][i + 1]]
//                     const item3 = bot.items[duplicates[itemName][i + 2]]

//                     if (item1.level == item2.level && item1.level == item3.level) {
//                         duplicates[itemName] = duplicates[itemName].splice(i, 3)
//                         found = true
//                         break
//                     }
//                 }
//                 if (!found) delete duplicates[itemName]
//             }

//             // At this point, 'duplicates' only contains arrays of 3 items.
//             for (const iN in duplicates) {
//                 // Check if item is upgradable, or if we want to upgrade it
//                 const itemName = iN as ItemName
//                 const gInfo = bot.G.items[itemName]
//                 if (gInfo.compound == undefined) continue // Not compoundable
//                 const level0Grade = gInfo.grades.lastIndexOf(0) + 1
//                 const itemPoss = duplicates[itemName]
//                 const itemInfo = bot.items[itemPoss[0]]
//                 if (itemInfo.level >= 4 - level0Grade) continue // We don't want to compound higher level items automatically.
//                 if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't compound items we want to sell unless they're special

//                 // Figure out the scroll we need to upgrade
//                 const grade = await bot.calculateItemGrade(itemInfo)
//                 const cscrollName = `cscroll${grade}` as ItemName
//                 let cscrollPos = bot.locateItem(cscrollName)
//                 if (cscrollPos == undefined && !bot.canBuy(cscrollName)) continue // We can't buy a scroll for whatever reason :(
//                 else if (cscrollPos == undefined) cscrollPos = await bot.buy(cscrollName)

//                 // Compound!
//                 if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as Merchant).massProduction()
//                 await bot.compound(itemPoss[0], itemPoss[1], itemPoss[2], cscrollPos)
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { compoundLoop() }, 250)
//     }
//     compoundLoop()

//     async function elixirLoop() {
//         try {
//             if (bot.socket.disconnected) return
//             if (bot.ctype == "merchant") return // Don't buy or equip an elixir if we're a merchant.

//             if (!bot.slots.elixir) {
//                 let luckElixir = bot.locateItem("elixirluck")
//                 if (luckElixir == undefined && bot.canBuy("elixirluck")) luckElixir = await bot.buy("elixirluck")
//                 if (luckElixir !== undefined) await bot.equip(luckElixir)
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { elixirLoop() }, 1000)
//     }
//     elixirLoop()

//     async function eventLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             // Winter event stuff
//             if (bot.S && bot.S.holidayseason
//                 && (!bot.s || !bot.s.holidayspirit)) {
//                 // Get the holiday buff
//                 for (const location of bot.locateNPC("newyear_tree")) {
//                     if (Tools.distance(bot, location) > Constants.NPC_INTERACTION_DISTANCE) continue
//                     bot.socket.emit("interaction", { type: "newyear_tree" })
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }
//         setTimeout(async () => { eventLoop() }, 1000)
//     }
//     eventLoop()

//     async function exchangeLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             // TODO: Make bot.canExchange() function and replace the following line with that
//             // TODO: Add a check to see if we are currently exchanging to that function
//             const hasComputer = bot.locateItem("computer") !== undefined

//             if (hasComputer
//                 && bot.gold > 50000000 /* We have a lot of gold to upgrade things */
//                 && bot.esize > 15 /* Our inventory has space */) {
//                 for (let i = 0; i < bot.items.length; i++) {
//                     const item = bot.items[i]
//                     if (!item) continue
//                     if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Don't want / can't exchange

//                     const gInfo = bot.G.items[item.name]
//                     if (gInfo.e !== undefined && item.q < gInfo.e) continue // Don't have enough to exchange

//                     await bot.exchange(i)
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { exchangeLoop() }, 250)
//     }
//     exchangeLoop()

//     async function healLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (!bot.rip) {
//                 const missingHP = bot.max_hp - bot.hp
//                 const missingMP = bot.max_mp - bot.mp
//                 const hpRatio = bot.hp / bot.max_hp
//                 const mpRatio = bot.mp / bot.max_mp
//                 const hpot1 = bot.locateItem("hpot1")
//                 const hpot0 = bot.locateItem("hpot0")
//                 const mpot1 = bot.locateItem("mpot1")
//                 const mpot0 = bot.locateItem("mpot0")
//                 if (hpRatio < mpRatio) {
//                     if (bot.c.town) {
//                         await bot.regenHP()
//                     } else if (missingHP >= 400 && hpot1 !== undefined) {
//                         await bot.useHPPot(hpot1)
//                     } else if (missingHP >= 200 && hpot0 !== undefined) {
//                         await bot.useHPPot(hpot0)
//                     } else {
//                         await bot.regenHP()
//                     }
//                 } else if (mpRatio < hpRatio) {
//                     if (bot.c.town) {
//                         await bot.regenHP()
//                     } else if (missingMP >= 500 && mpot1 !== undefined) {
//                         await bot.useMPPot(mpot1)
//                     } else if (missingMP >= 300 && mpot0 !== undefined) {
//                         await bot.useMPPot(mpot0)
//                     } else {
//                         await bot.regenMP()
//                     }
//                 } else if (hpRatio < 1) {
//                     if (bot.c.town) {
//                         await bot.regenHP()
//                     } else if (missingHP >= 400 && hpot1 !== undefined) {
//                         await bot.useHPPot(hpot1)
//                     } else if (missingHP >= 200 && hpot0 !== undefined) {
//                         await bot.useHPPot(hpot0)
//                     } else {
//                         await bot.regenHP()
//                     }
//                 }
//             }

//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
//     }
//     healLoop()

//     async function lootLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             for (const [, chest] of bot.chests) {
//                 if (Tools.distance(bot, chest) > 800) continue
//                 await bot.openChest(chest.id)
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { lootLoop() }, 250)
//     }
//     lootLoop()

//     bot.socket.on("hit", async (data: HitData) => {
//         if (!data.stacked) return
//         if (!data.stacked.includes(bot.id)) return // We're not stacked, lol.

//         console.info(`Scrambling ${bot.id} because we're stacked!`)

//         const x = -25 + Math.round(50 * Math.random())
//         const y = -25 + Math.round(50 * Math.random())
//         try {
//             await bot.move(bot.x + x, bot.y + y)
//         } catch (e) { /** Supress errors */ }
//     })

//     async function partyLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (!bot.party || !bot.partyData.list) {
//                 bot.sendPartyRequest(merchant.id)
//             } else if (bot.partyData.list[0] !== merchant.id) {
//                 bot.leaveParty()
//                 bot.sendPartyRequest(merchant.id)
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { partyLoop() }, 10000)
//     }
//     partyLoop()

//     async function sellLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.hasItem("computer")) {
//                 // Sell things
//                 for (let i = 0; i < bot.items.length; i++) {
//                     const item = bot.items[i]
//                     if (!item) continue // No item in this slot
//                     if (item.p) continue // This item is special in some way
//                     if (ITEMS_TO_SELL[item.name] == undefined) continue // We don't want to sell this item
//                     if (ITEMS_TO_SELL[item.name] <= item.level) continue // Keep this item, it's a high enough level that we want to keep it

//                     const q = bot.items[i].q !== undefined ? bot.items[i].q : 1

//                     await bot.sell(i, q)
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { sellLoop() }, 1000)
//     }
//     sellLoop()

//     async function upgradeLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.q.upgrade) {
//                 // We are upgrading, we have to wait
//                 setTimeout(async () => { upgradeLoop() }, bot.q.upgrade.ms)
//                 return
//             }
//             if (bot.map.startsWith("bank")) {
//                 // We are in the bank, we have to wait
//                 setTimeout(async () => { upgradeLoop() }, 1000)
//                 return
//             }

//             // Find items that we have two (or more) of, and upgrade them if we can
//             const duplicates = bot.locateDuplicateItems()
//             for (const iN in duplicates) {
//                 // Check if item is upgradable, or if we want to upgrade it
//                 const itemName = iN as ItemName
//                 const gInfo = bot.G.items[itemName]
//                 if (gInfo.upgrade == undefined) continue // Not upgradable
//                 const level0Grade = gInfo.grades.lastIndexOf(0) + 1
//                 const itemPos = duplicates[itemName][0]
//                 const itemInfo = bot.items[itemPos]
//                 if (itemInfo.level >= 9 - level0Grade) continue // We don't want to upgrade harder to get items too much.
//                 if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't upgrade items we want to sell unless it's special

//                 // Figure out the scroll we need to upgrade
//                 const grade = await bot.calculateItemGrade(itemInfo)
//                 const scrollName = `scroll${grade}` as ItemName
//                 let scrollPos = bot.locateItem(scrollName)
//                 try {
//                     if (scrollPos == undefined && !bot.canBuy(scrollName)) continue // We can't buy a scroll for whatever reason :(
//                     else if (scrollPos == undefined) scrollPos = await bot.buy(scrollName)

//                     // Upgrade!
//                     if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as Merchant).massProduction()
//                     await bot.upgrade(itemPos, scrollPos)
//                 } catch (e) {
//                     console.error(e)
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { upgradeLoop() }, 250)
//     }
//     upgradeLoop()
// }

// async function startRanger(bot: Ranger) {
//     console.info(`Starting ranger (${bot.id})`)

//     const defaultAttackStrategy = async (mtypes: MonsterName[]): Promise<number> => {
//         if (bot.canUse("attack")) {
//             const targets: Entity[] = []
//             const threeshotTargets: Entity[] = []
//             const fiveshotTargets: Entity[] = []
//             for (const [, entity] of bot.entities) {
//                 if (!mtypes.includes(entity.type)) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 targets.push(entity)

//                 // If we can kill enough monsters in one shot, let's try to do that
//                 // If the monster is targeting our friend, let's take advantage of that and attack it with multishot if we can
//                 if (entity.immune) continue // We can't target it with a skill shot, so don't try
//                 const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                 if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier || entity.target) threeshotTargets.push(entity)
//                 if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier || entity.target) fiveshotTargets.push(entity)
//             }

//             if (fiveshotTargets.length >= (5 - bot.courage + bot.targets) && targets.length >= 5 && bot.canUse("5shot")) {
//                 for (const target of targets) {
//                     if (fiveshotTargets.length >= 5) break
//                     let isInFiveShot = false
//                     for (const fiveShotTarget of fiveshotTargets) {
//                         if (fiveShotTarget.id == target.id) {
//                             isInFiveShot = true
//                             break
//                         }
//                     }
//                     if (!isInFiveShot) {
//                         // We found an additional target
//                         fiveshotTargets.push(target)
//                     }
//                 }
//                 // Remove from other characters if we're going to kill it
//                 for (const target of [fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4]]) {
//                     if (bot.canKillInOneShot(target)) {
//                         for (const bot of [ranger, priest, warrior, merchant]) {
//                             bot.entities.delete(target.id)
//                         }
//                     }
//                 }

//                 await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
//             } else if (threeshotTargets.length >= (3 - bot.courage + bot.targets) && targets.length >= 3 && bot.canUse("3shot")) {
//                 for (const target of targets) {
//                     if (threeshotTargets.length >= 3) break
//                     let isInThreeShot = false
//                     for (const fiveShotTarget of threeshotTargets) {
//                         if (fiveShotTarget.id == target.id) {
//                             isInThreeShot = true
//                             break
//                         }
//                     }
//                     if (!isInThreeShot) {
//                         // We found an additional target
//                         threeshotTargets.push(target)
//                     }
//                 }
//                 // Remove from other characters if we're going to kill it
//                 for (const target of [threeshotTargets[0], threeshotTargets[1], threeshotTargets[2]]) {
//                     if (bot.canKillInOneShot(target)) {
//                         for (const bot of [ranger, priest, warrior, merchant]) {
//                             bot.entities.delete(target.id)
//                         }
//                     }
//                 }

//                 await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
//             } else if (targets.length) {
//                 if (bot.canKillInOneShot(targets[0])) {
//                     // Remove from other characters if we're going to kill it
//                     for (const bot of [ranger, priest, warrior, merchant]) {
//                         bot.entities.delete(targets[0].id)
//                     }
//                 } else if (bot.canUse("huntersmark")) {
//                     // Mark it if we won't kill it in one shot
//                     await bot.huntersMark(targets[0].id)
//                 }

//                 // If we can do more damage with piercingshot, use that
//                 const gInfo = bot.G.skills.piercingshot
//                 const piercingShotEntity = { ...targets[0] }
//                 piercingShotEntity.armor -= gInfo.apiercing
//                 if (bot.canUse("piercingshot")
//                     && !targets[0].immune
//                     && Tools.calculateDamageRange(bot, piercingShotEntity)[0] * gInfo.damage_multiplier > Tools.calculateDamageRange(bot, targets[0])[0]) {
//                     await bot.piercingShot(targets[0].id)
//                 } else {
//                     await bot.basicAttack(targets[0].id)
//                 }
//             }
//         }

//         if (bot.canUse("supershot")) {
//             const targets: string[] = []
//             for (const [id, entity] of bot.entities) {
//                 if (!mtypes.includes(entity.type)) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) > bot.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
//                 if (entity.immune) continue // Entity won't take damage from supershot

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 targets.push(id)

//                 const minimumDamage = Tools.calculateDamageRange(bot, entity)[0] * bot.G.skills.supershot.damage_multiplier
//                 if (minimumDamage > entity.hp) {
//                     // Stop looking for another one to attack, since we can kill this one in one hit.
//                     targets[0] = id
//                     break
//                 }
//             }

//             if (targets.length) {
//                 await bot.superShot(targets[0])
//             }
//         }

//         return Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))
//     }
//     const tankAttackStrategy = async (mtype: MonsterName, tank: string) => {
//         // If we have a target scare it away
//         for (const [, entity] of bot.entities) {
//             if (entity.target == bot.id) {
//                 if (strategy[entity.type].attackWhileIdle) continue // We can attack these while idle, it's okay.
//                 if (bot.canUse("scare")) await bot.scare()
//                 return bot.getCooldown("scare") // Don't attack until we have scare available again
//             }
//         }

//         if (bot.canUse("attack")) {
//             const targets: Entity[] = []
//             const threeshotTargets: Entity[] = []
//             const fiveshotTargets: Entity[] = []
//             for (const [, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.cooperative !== true && entity.target !== tank) continue // It's not targeting our tank
//                 if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 targets.push(entity)

//                 // If we can kill enough monsters in one shot, let's try to do that
//                 if (entity.immune) continue // We can't 3shot or 5shot immune monsters
//                 const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                 if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(entity)
//                 if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(entity)
//             }

//             if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
//                 // Remove from other characters if we're going to kill it
//                 for (const target of [fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4]]) {
//                     if (await bot.canKillInOneShot(target)) {
//                         for (const bot of [ranger, priest, warrior, merchant]) {
//                             bot.entities.delete(target.id)
//                         }
//                     }
//                 }
//                 await bot.fiveShot(fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id)
//             } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
//                 // Remove from other characters if we're going to kill it
//                 for (const target of [threeshotTargets[0], threeshotTargets[1], threeshotTargets[2]]) {
//                     if (await bot.canKillInOneShot(target)) {
//                         for (const bot of [ranger, priest, warrior, merchant]) {
//                             bot.entities.delete(target.id)
//                         }
//                     }
//                 }
//                 await bot.threeShot(threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id)
//             } else if (targets.length) {
//                 if (bot.canUse("huntersmark")) {
//                     await bot.huntersMark(targets[0].id)
//                 }

//                 // Remove from other characters if we're going to kill it
//                 if (await bot.canKillInOneShot(targets[0])) {
//                     for (const bot of [ranger, priest, warrior, merchant]) {
//                         bot.entities.delete(targets[0].id)
//                     }
//                 }

//                 // If we can do more damage with a piercingshot, use that
//                 const gInfo = bot.G.skills.piercingshot
//                 const piercingShotEntity = { ...targets[0] }
//                 piercingShotEntity.armor -= gInfo.apiercing
//                 if (bot.canUse("piercingshot")
//                     && !targets[0].immune
//                     && Tools.calculateDamageRange(bot, piercingShotEntity)[0] * gInfo.damage_multiplier > Tools.calculateDamageRange(bot, targets[0])[0]) {
//                     await bot.piercingShot(targets[0].id)
//                 } else {
//                     await bot.basicAttack(targets[0].id)
//                 }
//             }
//         }

//         if (bot.canUse("supershot")) {
//             const targets: string[] = []
//             for (const [id, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.target != tank) continue // It's not targeting our tank
//                 if (Tools.distance(bot, entity) > bot.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (entity.immune) continue // Entity won't take damage from supershot

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 targets.push(id)

//                 const minimumDamage = Tools.calculateDamageRange(bot, entity)[0] * bot.G.skills.supershot.damage_multiplier
//                 if (minimumDamage > entity.hp) {
//                     // Stop looking for another one to attack, since we can kill this one in one hit.
//                     targets[0] = id
//                     break
//                 }
//             }

//             if (targets.length) {
//                 await bot.superShot(targets[0])
//             }
//         }

//         return Math.max(10, Math.min(bot.getCooldown("attack"), bot.getCooldown("supershot")))
//     }
//     const holdPositionMoveStrategy = async (position: NodeData) => {
//         try {
//             if (Tools.distance(bot, position) > 0) await bot.smartMove(position)
//         } catch (e) {
//             console.error(e)
//         }
//         return 1000
//     }
//     const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
//         let closestEntitiy: MonsterData
//         let closestDistance: number = Number.MAX_VALUE
//         for (const [, entity] of bot.entities) {
//             if (entity.type !== mtype) continue
//             if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//             // If the target will die to incoming projectiles, ignore it
//             if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//             // If the target will burn to death, ignore it
//             if (entity.willBurnToDeath()) continue

//             const distance = Tools.distance(bot, entity)
//             if (distance < closestDistance) {
//                 closestDistance = distance
//                 closestEntitiy = entity
//             }
//         }

//         try {
//             if (!closestEntitiy && !bot.moving) await bot.smartMove(position)
//             // We will get a lot of errors without catching, because we'll be dropping a lot of movements 
//             // eslint-disable-next-line @typescript-eslint/no-empty-function
//             else if (closestEntitiy && Pathfinder.canWalkPath(bot, closestEntitiy)) bot.smartMove(closestEntitiy, { getWithin: bot.range - closestEntitiy.speed }).catch(() => { })
//             else if (closestEntitiy && Tools.distance(bot, closestEntitiy) > bot.range) await bot.smartMove(closestEntitiy, { getWithin: bot.range - closestEntitiy.speed })
//         } catch (e) {
//             // console.error(e)
//             bot.stopSmartMove()
//         }
//         return 250
//     }
//     const specialMonsterMoveStrategy = async (mtype: MonsterName) => {
//         try {
//             // Look in nearby entities for monster
//             for (const [, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) <= bot.range) return 250 // We're in range
//                 await bot.smartMove(entity, { getWithin: bot.range - 10 })
//                 return 250
//             }

//             // Look in 'S' for monster
//             if (bot.S && bot.S[mtype] && bot.S[mtype].live) {
//                 if (Tools.distance(bot, (bot.S[mtype] as ServerInfoDataLive)) <= bot.range) return 250 // We're in range
//                 await bot.smartMove((bot.S[mtype] as ServerInfoDataLive), { getWithin: bot.range - 10 })
//                 return 250
//             }

//             // Look in database for monster
//             const specialTarget = await EntityModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, type: mtype }).lean().exec()
//             if (specialTarget) {
//                 await bot.smartMove(specialTarget, { getWithin: bot.range - 10 })
//             } else {
//                 // See if there's a spawn for them. If there is, go check there
//                 for (const spawn of bot.locateMonster(mtype)) {
//                     await bot.smartMove(spawn, { getWithin: 300 })

//                     // Check if we've found it
//                     let monsterIsNear = false
//                     for (const [, entity] of bot.entities) {
//                         if (entity.type !== mtype) continue
//                         monsterIsNear = true
//                         break
//                     }
//                     if (monsterIsNear) break
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }
//         return 100
//     }
//     const strategy: Strategy = {
//         arcticbee: {
//             attack: async () => { return await defaultAttackStrategy(["arcticbee"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1082, y: -873 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         armadillo: {
//             attack: async () => { return await defaultAttackStrategy(["armadillo"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 526, y: 1846 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bat: {
//             attack: async () => { return await defaultAttackStrategy(["bat"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "cave", x: -194, y: -461 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bbpompom: {
//             attack: async () => { return await defaultAttackStrategy(["bbpompom"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winter_cave", x: 51, y: -164 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" }
//         },
//         bee: {
//             attack: async () => { return await defaultAttackStrategy(["bee"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 494, y: 1101 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bigbird: {
//             attack: async () => { return await defaultAttackStrategy(["bigbird"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1343, y: 248 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: false,
//             requirePriest: true
//         },
//         boar: {
//             attack: async () => { return await defaultAttackStrategy(["boar"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 20, y: -1109 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true,
//             requirePriest: true
//         },
//         booboo: {
//             attack: async () => { return await defaultAttackStrategy(["booboo"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 265, y: -645 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             requirePriest: true
//         },
//         bscorpion: {
//             attack: async () => { return await tankAttackStrategy("bscorpion", "earthPri") },
//             move: async () => {
//                 const bscorpionSpawn = bot.locateMonsters("bscorpion")[0]
//                 const RADIUS = 125
//                 const ANGLE = Math.PI / 2.5
//                 if (Pathfinder.canWalk(bot, bscorpionSpawn)) {
//                     const bscorpion = bot.getNearestMonster("bscorpion")?.monster
//                     if (bscorpion) {
//                         // There's a bscorpion nearby
//                         const angleFromSpawnToBscorpionGoing = Math.atan2(bscorpion.going_y - bscorpionSpawn.y, bscorpion.going_x - bscorpionSpawn.x)
//                         const endGoalAngle = angleFromSpawnToBscorpionGoing + ANGLE
//                         const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(endGoalAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(endGoalAngle) }
//                         bot.move(endGoal.x, endGoal.y).catch(() => { /* Ignore Errors */ })
//                     } else {
//                         // There isn't a bscorpion nearby
//                         const angleFromSpawnToBot = Math.atan2(bot.y - bscorpionSpawn.y, bot.x - bscorpionSpawn.x)
//                         const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToBot), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToBot) }
//                         bot.move(endGoal.x, endGoal.y).catch(() => { /* Ignore Errors */ })
//                     }
//                 } else {
//                     // Move to the bscorpion spawn
//                     await bot.smartMove(bscorpionSpawn, { getWithin: RADIUS })
//                 }
//                 return 250
//             },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         cgoo: {
//             attack: async () => { return await defaultAttackStrategy(["cgoo"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "arena", x: 0, y: -500 }, "cgoo") },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         crab: {
//             attack: async () => { return await defaultAttackStrategy(["crab"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1202, y: -66 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         crabx: {
//             attack: async () => { return await defaultAttackStrategy(["crabx"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -984, y: 1762 }, "crabx") },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         croc: {
//             attack: async () => { return await defaultAttackStrategy(["croc"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 801, y: 1710 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         cutebee: {
//             attack: async () => { return await defaultAttackStrategy(["cutebee"]) },
//             move: async () => { return await specialMonsterMoveStrategy("cutebee") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         dragold: {
//             attack: async () => { return await defaultAttackStrategy(["dragold"]) },
//             move: async () => { return await specialMonsterMoveStrategy("dragold") },
//             equipment: { mainhand: "firebow", orb: "test_orb" }
//         },
//         fireroamer: {
//             attack: async () => { return await tankAttackStrategy("fireroamer", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: 160, y: -675 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         franky: {
//             attack: async () => { return await defaultAttackStrategy(["nerfedmummy", "franky"]) },
//             move: async () => {
//                 const nearest = bot.getNearestMonster("franky")
//                 if (nearest?.monster && nearest.distance > 25) {
//                     // Move close to Franky because other characters might help blast away mummies
//                     await bot.smartMove(nearest.monster, { getWithin: 25 })
//                     return 250
//                 } else {
//                     return await specialMonsterMoveStrategy("franky")
//                 }
//             },
//             equipment: { mainhand: "crossbow", orb: "test_orb" }
//         },
//         fvampire: {
//             attack: async () => { return await defaultAttackStrategy(["fvampire"]) },
//             move: async () => { return await specialMonsterMoveStrategy("fvampire") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true,
//             requirePriest: true
//         },
//         ghost: {
//             attack: async () => { return await defaultAttackStrategy(["ghost"]) },
//             move: async () => { return holdPositionMoveStrategy({ map: "halloween", x: 256, y: -1224 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" }
//         },
//         goldenbat: {
//             attack: async () => { return await defaultAttackStrategy(["goldenbat"]) },
//             move: async () => { return await specialMonsterMoveStrategy("goldenbat") },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         goo: {
//             attack: async () => { return await defaultAttackStrategy(["goo"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -32, y: 787 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         greenjr: {
//             attack: async () => { return await defaultAttackStrategy(["greenjr"]) },
//             move: async () => { return await specialMonsterMoveStrategy("greenjr") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         hen: {
//             attack: async () => { return await defaultAttackStrategy(["hen"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -61.5, y: -282 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         iceroamer: {
//             attack: async () => { return await defaultAttackStrategy(["iceroamer"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1512, y: 104 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" }
//         },
//         jr: {
//             attack: async () => { return await defaultAttackStrategy(["jr"]) },
//             move: async () => { return await specialMonsterMoveStrategy("jr") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         minimush: {
//             attack: async () => { return await defaultAttackStrategy(["minimush"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: 8, y: 631 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         mole: {
//             attack: async () => { return await tankAttackStrategy("mole", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "tunnel", x: -15, y: -329 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         mummy: {
//             attack: async () => { return await defaultAttackStrategy(["mummy"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 250, y: -1129 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         mrgreen: {
//             attack: async () => { return await defaultAttackStrategy(["mrgreen"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mrgreen") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         mrpumpkin: {
//             attack: async () => { return await defaultAttackStrategy(["mrpumpkin"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mrpumpkin") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         mvampire: {
//             attack: async () => { return await defaultAttackStrategy(["mvampire"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mvampire") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         nerfedmummy: {
//             attack: async () => { return await defaultAttackStrategy(["nerfedmummy"]) },
//             move: async () => { return await specialMonsterMoveStrategy("franky") },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         oneeye: {
//             attack: async () => { return await tankAttackStrategy("oneeye", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level2w", x: -175, y: 0 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         osnake: {
//             attack: async () => { return await defaultAttackStrategy(["osnake"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: -589, y: -335 }, "osnake") },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         phoenix: {
//             attack: async () => { return await defaultAttackStrategy(["phoenix"]) },
//             move: async () => { return await specialMonsterMoveStrategy("phoenix") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         plantoid: {
//             attack: async () => { return await defaultAttackStrategy(["plantoid"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -750, y: -125 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         poisio: {
//             attack: async () => { return await defaultAttackStrategy(["poisio"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -121, y: 1360 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         porcupine: {
//             attack: async () => { return await defaultAttackStrategy(["porcupine"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -829, y: 135 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         pppompom: {
//             attack: async () => { return await tankAttackStrategy("pppompom", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 120, y: -170 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         prat: {
//             attack: async () => { return await defaultAttackStrategy(["prat"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level1", x: -280, y: 541 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         rat: {
//             attack: async () => { return await defaultAttackStrategy(["rat"]) },
//             move: async () => { return holdPositionMoveStrategy({ map: "mansion", x: 100, y: -225 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         rooster: {
//             attack: async () => { return await defaultAttackStrategy(["rooster"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -61.5, y: -282 }) },
//             attackWhileIdle: true,
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//         },
//         scorpion: {
//             attack: async () => { return await defaultAttackStrategy(["scorpion"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1578, y: -168 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         skeletor: {
//             attack: async () => { return await tankAttackStrategy("skeletor", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "arena", x: 380, y: -575 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         snake: {
//             attack: async () => { return await defaultAttackStrategy(["snake"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -82, y: 1901 }) },
//             equipment: { mainhand: "hbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         snowman: {
//             attack: async () => { return await defaultAttackStrategy(["snowman"]) },
//             move: async () => { return await specialMonsterMoveStrategy("snowman") },
//             equipment: { mainhand: "hbow", orb: "orbofdex" },
//             attackWhileIdle: true
//         },
//         spider: {
//             attack: async () => { return await defaultAttackStrategy(["spider"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 948, y: -144 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         squig: {
//             attack: async () => { return await defaultAttackStrategy(["squig"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1175, y: 422 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         squigtoad: {
//             attack: async () => { return await defaultAttackStrategy(["squigtoad"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1175, y: 422 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         stoneworm: {
//             attack: async () => { return await defaultAttackStrategy(["stoneworm"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 677, y: 129 }) },
//             equipment: { mainhand: "crossbow", orb: "test_orb" }
//         },
//         tinyp: {
//             attack: async () => { return await tankAttackStrategy("tinyp", warrior.id) },
//             move: async () => { return await specialMonsterMoveStrategy("tinyp") },
//             equipment: { mainhand: "firebow", orb: "orbofdex" }
//         },
//         tortoise: {
//             attack: async () => { return await defaultAttackStrategy(["tortoise"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1124, y: 1118 }, "tortoise") },
//             equipment: { mainhand: "crossbow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         wabbit: {
//             attack: async () => { return await defaultAttackStrategy(["wabbit"]) },
//             move: async () => { return await specialMonsterMoveStrategy("wabbit") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         wolf: {
//             attack: async () => { return await defaultAttackStrategy(["wolf"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 400, y: -2525 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         wolfie: {
//             attack: async () => { return await defaultAttackStrategy(["wolfie"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: -169, y: -2026 }, "wolfie") },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         },
//         xscorpion: {
//             attack: async () => { return await tankAttackStrategy("xscorpion", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: -325, y: 775 }) },
//             equipment: { mainhand: "firebow", orb: "test_orb" },
//             requirePriest: true
//         }
//     }

//     async function targetLoop(): Promise<void> {
//         try {
//             if (bot.socket.disconnected) return

//             const newTarget = await getTarget(bot, strategy)
//             if (newTarget !== rangerTarget) bot.stopSmartMove() // Stop the smart move if we have a new target
//             rangerTarget = newTarget
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { await targetLoop() }, 1000)
//     }
//     targetLoop()

//     async function attackLoop() {
//         let cooldown = 10
//         try {
//             if (bot.socket.disconnected) return

//             if (!bot.character || bot.rip) {
//                 setTimeout(async () => { attackLoop() }, 1000)
//                 return
//             }

//             if (bot.isPVP()) {
//                 for (const enemy of bot.players.values()) {
//                     if (Tools.distance(bot, enemy) > bot.range) continue // We're too far to attack them
//                     if (bot.owner == enemy.owner) continue // We're friends
//                     if (bot.party && bot.partyData.list && bot.partyData.list.includes(enemy.id)) continue // We're friends
//                     if (enemy.rip) continue // Enemy is dead

//                     if (bot.canUse("huntersmark")) await bot.huntersMark(enemy.id)
//                     if (bot.canUse("attack")) await bot.basicAttack(enemy.id)
//                     if (bot.canUse("supershot")) await bot.superShot(enemy.id)

//                     setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
//                     return
//                 }

//                 if (bot.canUse("supershot")) {
//                     for (const enemy of bot.players.values()) {
//                         if (Tools.distance(bot, enemy) > bot.range * bot.G.skills.supershot.range_multiplier) continue // We're too far to attack them
//                         if (bot.party && bot.partyData.list && bot.partyData.list.includes(enemy.id)) continue // We're friends
//                         if (enemy.rip) continue // Enemy is dead

//                         await bot.superShot(enemy.id)
//                         break
//                     }
//                 }
//             }

//             // Reasons to scare
//             let numTargets = 0
//             let numTargetingAndClose = 0
//             let incomingDPS = 0
//             let noStrategy = false
//             let avoidIdle = false
//             for (const [, entity] of bot.entities) {
//                 if (entity.target == bot.id) {
//                     numTargets++
//                     incomingDPS += Tools.calculateDamageRange(entity, bot.character)[1] * entity.frequency
//                     if (Tools.distance(bot, entity) <= entity.range) numTargetingAndClose++
//                     if (!strategy[entity.type]) noStrategy = true
//                     else if (rangerTarget !== entity.type && !strategy[entity.type].attackWhileIdle) avoidIdle = true
//                 }
//             }
//             if (bot.hp < bot.max_hp * 0.25 // We are low on HP
//                 || (bot.s.burned && bot.s.burned.intensity > bot.max_hp / 10) // We are burned
//                 || bot.fear > 0 // We are scared
//                 || (numTargets > 0 && bot.c.town) // We are teleporting
//                 || noStrategy // We don't have a strategy for the given monster
//                 || avoidIdle // A monster is attacking us that we aren't targeting, and don't attack while idle
//                 || (numTargets > 1 && incomingDPS > bot.hp) // We have multiple targets, and a lot of incomingDPS.
//             ) {
//                 if (!bot.slots.orb || bot.slots.orb.name !== "jacko") {
//                     const i = bot.locateItem("jacko")
//                     if (i) await bot.equip(i)
//                 }
//                 if (bot.canUse("scare")) await bot.scare()
//             }

//             if (bot.c.town) {
//                 setTimeout(async () => { attackLoop() }, 10)
//                 return
//             }

//             if (bot.getCooldown("scare") > 0) {
//                 setTimeout(async () => { attackLoop() }, Math.min(bot.getCooldown("scare"), Math.max(bot.getCooldown("attack"), 10)))
//                 return
//             }

//             if (rangerTarget) {
//                 if (strategy[rangerTarget].equipment) {
//                     for (const s in strategy[rangerTarget].equipment) {
//                         const slot = s as SlotType
//                         const itemName = strategy[rangerTarget].equipment[slot]
//                         const wType = bot.G.items[itemName].wtype

//                         if (bot.G.classes[bot.ctype].doublehand[wType]) {
//                             // Check if we have something in our offhand, we need to unequip it.
//                             if (bot.slots.offhand) await bot.unequip("offhand")
//                         }

//                         if (slot == "offhand" && bot.slots["mainhand"]) {
//                             const mainhandItem = bot.slots["mainhand"].name
//                             const mainhandWType = bot.G.items[mainhandItem].wtype
//                             if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
//                                 // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
//                                 await bot.unequip("mainhand")
//                             }
//                         }

//                         if (!bot.slots[slot]
//                             || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
//                             const i = bot.locateItem(itemName)
//                             if (i !== undefined) await bot.equip(i, slot)
//                         }
//                     }
//                 }
//             }

//             if (rangerTarget && strategy[rangerTarget]) {
//                 cooldown = await strategy[rangerTarget].attack()
//             }

//             if (bot.canUse("attack")) {
//                 const targets: string[] = []
//                 const threeshotTargets: string[] = []
//                 const fiveshotTargets: string[] = []
//                 for (const [id, entity] of bot.entities) {
//                     if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range

//                     // If the target will die to incoming projectiles, ignore it
//                     if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                     // If the target will burn to death, ignore it
//                     if (entity.willBurnToDeath()) continue

//                     targets.push(id)

//                     // If we can kill enough monsters in one shot, let's try to do that
//                     const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                     if (!entity.immune && entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeshotTargets.push(id)
//                     if (!entity.immune && entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveshotTargets.push(id)
//                 }

//                 if (fiveshotTargets.length >= 5 && bot.canUse("5shot")) {
//                     await bot.fiveShot(fiveshotTargets[0], fiveshotTargets[1], fiveshotTargets[2], fiveshotTargets[3], fiveshotTargets[4])
//                 } else if (threeshotTargets.length >= 3 && bot.canUse("3shot")) {
//                     await bot.threeShot(threeshotTargets[0], threeshotTargets[1], threeshotTargets[2])
//                 } else if (targets.length) {
//                     // TODO: If we can do more damage with a `piercingshot`, do it.
//                     await bot.basicAttack(targets[0])
//                 }
//             }

//             if (bot.canUse("supershot")) {
//                 const targets: string[] = []
//                 for (const [id, entity] of bot.entities) {
//                     if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.range * bot.G.skills.supershot.range_multiplier) continue // Only attack those in range
//                     if (entity.immune) continue // Entity won't take damage from supershot

//                     // If the target will die to incoming projectiles, ignore it
//                     if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                     // If the target will burn to death, ignore it
//                     if (entity.willBurnToDeath()) continue

//                     targets.push(id)

//                     const minimumDamage = Tools.calculateDamageRange(bot, entity)[0] * bot.G.skills.supershot.damage_multiplier
//                     if (minimumDamage > entity.hp) {
//                         // Stop looking for another one to attack, since we can kill this one in one hit.
//                         targets[0] = id
//                         break
//                     }
//                 }

//                 if (targets.length) {
//                     await bot.superShot(targets[0])
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { attackLoop() }, cooldown)
//     }
//     attackLoop()

//     async function moveLoop() {
//         let cooldown = 10

//         try {
//             if (bot.socket.disconnected) return

//             // If we are dead, respawn
//             if (bot.rip) {
//                 await bot.respawn()
//                 setTimeout(async () => { moveLoop() }, 1000)
//                 return
//             }

//             // Priority #1: If it's christmas, and we don't have (or are about to run out of) holiday spirit, go get some at the tree
//             if (bot.S && bot.S.holidayseason
//                 && (!bot.s || !bot.s.holidayspirit)) {
//                 await bot.smartMove("newyear_tree", { getWithin: 400 })
//                 setTimeout(async () => { moveLoop() }, 500)
//                 return
//             }

//             // Priority #2: If there are new characters, and we don't have (or are about to run out of newcomersblessing), go to that character and get some
//             if (!bot.s || !bot.s.newcomersblessing || bot.s.newcomersblessing) {
//                 const newcomer = await CharacterModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 120000 }, $expr: { $eq: ["$s.newcomersblessing.f", "$name"] } }).lean().exec()
//                 if (newcomer) {
//                     await bot.smartMove(newcomer, { getWithin: 20 })
//                     await bot.smartMove("newyear_tree", { getWithin: 400 })
//                     setTimeout(async () => { moveLoop() }, 500)
//                     return
//                 }
//             }

//             // Priority #3: Special monsters
//             if (rangerTarget) {
//                 cooldown = await strategy[rangerTarget].move()
//             }

//             if (bot.socket.disconnected) return

//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { moveLoop() }, cooldown)
//     }
//     moveLoop()

//     async function sendItemLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (!merchant) {
//                 setTimeout(async () => { sendItemLoop() }, 1000)
//                 return
//             }

//             const sendTo = bot.players.get(merchant.id)
//             if (sendTo && Tools.distance(bot, sendTo) < Constants.NPC_INTERACTION_DISTANCE) {
//                 const extraGold = bot.gold - PLAYER_GOLD_TO_HOLD
//                 if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
//                 for (let i = 0; i < bot.items.length; i++) {
//                     const item = bot.items[i]
//                     if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items
//                     if (item.l == "l") continue // Don't send locked items

//                     if (merchant.isFull()) {
//                         // Can we stack it in the merchant's inventory?
//                         if (item.q == undefined) continue // Item is not stackable
//                         for (const itemPos of merchant.locateItems(item.name)) {
//                             const merchantItem = merchant.items[itemPos]
//                             // Send as many as we can
//                             await bot.sendItem(merchant.id, i, Math.min(item.q, bot.G.items[item.name].s - merchantItem.q))
//                         }
//                     } else {
//                         // The merchant has space, send it over.
//                         await bot.sendItem(merchant.id, i, item.q)
//                     }
//                 }
//             }

//             if (bot.isFull()) {
//                 // See if we can stack any of our items on other players
//                 for (const sendTo of [priest, warrior]) {
//                     if (Tools.distance(bot, sendTo.character) > Constants.NPC_INTERACTION_DISTANCE) continue // Too far away to send items
//                     for (let i = 0; i < bot.items.length; i++) {
//                         const item = bot.items[i]
//                         if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items
//                         if (item.l == "l") continue // Don't send locked items

//                         if (item.q == undefined) continue // Item is not stackable
//                         for (const itemPos of sendTo.locateItems(item.name)) {
//                             const sendToItem = sendTo.character.items[itemPos]
//                             // Send as many as we can
//                             await bot.sendItem(sendTo.character.id, i, Math.min(item.q, bot.G.items[item.name].s - sendToItem.q))
//                         }
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { sendItemLoop() }, 1000)
//     }
//     sendItemLoop()
// }

// async function startPriest(bot: Priest) {
//     const defaultAttackStrategy = async (mtypes: MonsterName[]): Promise<number> => {
//         if (bot.canUse("attack")) {
//             // Heal party members if they are close
//             let target: PlayerData | MonsterData
//             for (const [id, player] of bot.players) {
//                 if (![ranger.id, warrior.id, priest.id, merchant.id].includes(id)) continue // Don't heal other players
//                 if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
//                 if (Tools.distance(bot, player) > bot.range) continue // Too far away to heal

//                 target = player
//                 break
//             }
//             if (target) {
//                 await bot.heal(target.id)
//             }

//             if (!target) {
//                 const targets: Entity[] = []
//                 for (const [, entity] of bot.entities) {
//                     if (!mtypes.includes(entity.type)) continue
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range

//                     // If the target will die to incoming projectiles, ignore it
//                     if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                     // If the target will burn to death, ignore it
//                     if (entity.willBurnToDeath()) continue

//                     targets.push(entity)

//                     const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                     if (minimumDamage > entity.hp) {
//                         // Stop looking for another one to attack, since we can kill this one in one hit.
//                         targets[0] = entity
//                         break
//                     }
//                 }

//                 if (targets.length > 0) {
//                     // Farm essenceoflife from ghosts
//                     if (targets[0].type == "ghost" && !targets[0]?.s?.healed) {
//                         await bot.heal(targets[0].id)
//                         return bot.getCooldown("heal")
//                     }

//                     // Remove from other characters if we're going to kill it
//                     const isGuaranteedKill = await Tools.isGuaranteedKill(bot, targets[0])
//                     if (isGuaranteedKill) {
//                         for (const bot of [ranger, priest, warrior, merchant]) {
//                             bot.entities.delete(targets[0].id)
//                         }
//                     } else if (bot.canUse("curse")
//                         && !(targets[0] as MonsterData).immune) {
//                         // Curse if we can't kill it right away
//                         bot.curse(targets[0].id)
//                     }

//                     await bot.basicAttack(targets[0].id)
//                 }
//             }
//         }

//         return Math.max(10, bot.getCooldown("attack"))
//     }
//     const tankAttackStrategy = async (mtype: MonsterName, tank: string) => {
//         // If we have a target scare it away
//         for (const [, entity] of bot.entities) {
//             if (entity.target == bot.id) {
//                 if (strategy[entity.type].attackWhileIdle) continue // We can attack these while idle, it's okay.
//                 if (bot.canUse("scare")) await bot.scare()
//                 return bot.getCooldown("scare") // Don't attack until we have scare available again
//             }
//         }

//         if (bot.canUse("attack")) {
//             let target: MonsterData
//             for (const [, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.target !== tank) continue // It's not targeting our tank
//                 if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//                 target = entity
//                 break
//             }

//             if (target) {
//                 if (bot.canUse("curse")
//                     && !(target as MonsterData).immune) {
//                     bot.curse(target.id)
//                 }

//                 // Remove from other characters if we're going to kill it
//                 if (await bot.canKillInOneShot(target)) {
//                     for (const bot of [ranger, priest, warrior, merchant]) {
//                         bot.entities.delete(target.id)
//                     }
//                 }

//                 await bot.basicAttack(target.id)
//             }
//         }

//         return Math.max(10, bot.getCooldown("attack"))
//     }
//     const holdPositionMoveStrategy = async (position: NodeData) => {
//         try {
//             if (Tools.distance(bot, position) > 0) await bot.smartMove(position)
//         } catch (e) {
//             console.error(e)
//         }
//         return 1000
//     }
//     const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
//         let closestEntitiy: MonsterData
//         let closestDistance: number = Number.MAX_VALUE
//         for (const [, entity] of bot.entities) {
//             if (entity.type !== mtype) continue
//             if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//             // If the target will die to incoming projectiles, ignore it
//             if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//             // If the target will burn to death, ignore it
//             if (entity.willBurnToDeath()) continue

//             const distance = Tools.distance(bot, entity)
//             if (distance < closestDistance) {
//                 closestDistance = distance
//                 closestEntitiy = entity
//             }
//         }

//         try {
//             if (!closestEntitiy && !bot.moving) await bot.smartMove(position)
//             // We will get a lot of errors without catching, because we'll be dropping a lot of movements 
//             // eslint-disable-next-line @typescript-eslint/no-empty-function
//             else if (closestEntitiy && Pathfinder.canWalk(bot, closestEntitiy)) bot.smartMove(closestEntitiy, { getWithin: bot.range - closestEntitiy.speed }).catch(() => { })
//             else if (closestEntitiy && Tools.distance(bot, closestEntitiy) > bot.range) await bot.smartMove(closestEntitiy, { getWithin: bot.range - closestEntitiy.speed })
//         } catch (e) {
//             // console.error(e)
//             bot.stopSmartMove()
//         }
//         return 250
//     }
//     const specialMonsterMoveStrategy = async (mtype: MonsterName) => {
//         try {
//             // Look in nearby entities for monster
//             for (const [, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) <= bot.range) return 250 // We're in range
//                 await bot.smartMove(entity, { getWithin: bot.range - 10 })
//                 return 250
//             }

//             // Look in 'S' for monster
//             if (bot.S && bot.S[mtype] && bot.S[mtype].live) {
//                 if (Tools.distance(bot, bot.S[mtype]) <= bot.range) return 250 // We're in range
//                 await bot.smartMove(bot.S[mtype], { getWithin: bot.range - 10 })
//                 return 250
//             }

//             // Look in database for monster
//             const specialTarget = await EntityModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, type: mtype }).lean().exec()
//             if (specialTarget) {
//                 await bot.smartMove(specialTarget, { getWithin: bot.range - 10 })
//             } else {
//                 // See if there's a spawn for them. If there is, go check there
//                 for (const spawn of bot.locateMonsters(mtype)) {
//                     await bot.smartMove(spawn, { getWithin: 300 })

//                     // Check if we've found it
//                     let monsterIsNear = false
//                     for (const [, entity] of bot.entities) {
//                         if (entity.type !== mtype) continue
//                         monsterIsNear = true
//                         break
//                     }
//                     if (monsterIsNear) break
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }
//         return 100
//     }
//     const strategy: Strategy = {
//         arcticbee: {
//             attack: async () => { return await defaultAttackStrategy(["arcticbee"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1102, y: -873 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         armadillo: {
//             attack: async () => { return await defaultAttackStrategy(["armadillo"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 546, y: 1846 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bat: {
//             attack: async () => { return await defaultAttackStrategy(["bat"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "cave", x: 324, y: -1107 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bbpompom: {
//             attack: async () => { return await defaultAttackStrategy(["bbpompom"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winter_cave", x: 71, y: -164 }) },
//             equipment: { orb: "test_orb" }
//         },
//         bee: {
//             attack: async () => { return await defaultAttackStrategy(["bee"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 152, y: 1487 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bigbird: {
//             attack: async () => { return await defaultAttackStrategy(["bigbird"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1363, y: 248 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: false
//         },
//         boar: {
//             attack: async () => { return await defaultAttackStrategy(["boar"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 40, y: -1109 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         booboo: {
//             attack: async () => { return await defaultAttackStrategy(["booboo"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 265, y: -605 }) },
//             equipment: { orb: "test_orb" },
//         },
//         bscorpion: {
//             attack: async () => {
//                 // Get the bscorpion to target us if it's attacking a friend
//                 const bscorpion = bot.getNearestMonster("bscorpion")?.monster
//                 if (bscorpion && [ranger.id, warrior.id, merchant.id].includes(bscorpion.target)) {
//                     await bot.absorbSins(bscorpion.target)
//                 }

//                 if (bscorpion && bscorpion.target == bot.id && bscorpion.hp < 50000) {
//                     // Equip items that have more luck
//                     if (bot.slots.mainhand?.name !== "lmace" && priest.hasItem("lmace")) await priest.equip(priest.locateItem("lmace"))
//                     if (bot.slots.orb?.name !== "rabbitsfoot" && priest.hasItem("rabbitsfoot")) await priest.equip(priest.locateItem("rabbitsfoot"))
//                     if (bot.slots.offhand?.name !== "mshield" && priest.hasItem("mshield")) await priest.equip(priest.locateItem("mshield"))
//                     if (bot.slots.shoes?.name !== "wshoes" && priest.hasItem("wshoes")) await priest.equip(priest.locateItem("wshoes"))
//                 } else {
//                     // Equip items that do more damage
//                     if (bot.slots.mainhand?.name !== "firestaff") await priest.equip(priest.locateItem("firestaff"))
//                     if (bot.slots.orb?.name !== "orbofint" && priest.hasItem("orbofint")) await priest.equip(priest.locateItem("orbofint"))
//                     if (bot.slots.offhand?.name !== "wbook1" && priest.hasItem("wbook1")) await priest.equip(priest.locateItem("wbook1"))
//                     if (bot.slots.shoes?.name !== "wingedboots" && priest.hasItem("wingedboots")) await priest.equip(priest.locateItem("wingedboots"))
//                 }

//                 return await defaultAttackStrategy(["bscorpion"])
//             },
//             move: async () => {
//                 const bscorpionSpawn = bot.locateMonsters("bscorpion")[0]
//                 const RADIUS = 125
//                 const ANGLE = Math.PI / 2.5
//                 if (Pathfinder.canWalk(bot, bscorpionSpawn)) {
//                     const bscorpion = bot.getNearestMonster("bscorpion")?.monster
//                     if (bscorpion) {
//                         // There's a bscorpion nearby
//                         const angleFromSpawnToBscorpionGoing = Math.atan2(bscorpion.going_y - bscorpionSpawn.y, bscorpion.going_x - bscorpionSpawn.x)
//                         const endGoalAngle = angleFromSpawnToBscorpionGoing + ANGLE
//                         const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(endGoalAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(endGoalAngle) }
//                         bot.move(endGoal.x, endGoal.y).catch(() => { /* Ignore Errors */ })
//                     } else {
//                         // There isn't a bscorpion nearby
//                         const angleFromSpawnToBot = Math.atan2(bot.y - bscorpionSpawn.y, bot.x - bscorpionSpawn.x)
//                         const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToBot), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToBot) }
//                         bot.move(endGoal.x, endGoal.y).catch(() => { /* Ignore Errors */ })
//                     }
//                 } else {
//                     // Move to the bscorpion spawn
//                     await bot.smartMove(bscorpionSpawn, { getWithin: RADIUS })
//                 }
//                 return 250
//             },
//             equipment: { /** We have custom equipment in the loops above to maximize luck and damage */ },
//             requirePriest: true
//         },
//         cgoo: {
//             attack: async () => { return await defaultAttackStrategy(["cgoo"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "arena", x: 650, y: -500 }, "cgoo") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         crab: {
//             attack: async () => { return await defaultAttackStrategy(["crab"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1182, y: -66 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         crabx: {
//             attack: async () => { return await defaultAttackStrategy(["crabx"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -964, y: 1762 }, "crabx") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         croc: {
//             attack: async () => { return await defaultAttackStrategy(["croc"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 821, y: 1710 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         cutebee: {
//             attack: async () => { return await defaultAttackStrategy(["cutebee"]) },
//             move: async () => { return await specialMonsterMoveStrategy("cutebee") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         dragold: {
//             attack: async () => { return await defaultAttackStrategy(["dragold"]) },
//             move: async () => { return await specialMonsterMoveStrategy("dragold") },
//             equipment: { orb: "test_orb" }
//         },
//         fireroamer: {
//             attack: async () => { return await tankAttackStrategy("fireroamer", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: 180, y: -675 }) },
//             equipment: { orb: "test_orb" }
//         },
//         franky: {
//             attack: async () => { return await defaultAttackStrategy(["nerfedmummy", "franky"]) },
//             move: async () => {
//                 const nearest = bot.getNearestMonster("franky")
//                 if (nearest?.monster && nearest.distance > 25) {
//                     // Move close to Franky because other characters might help blast away mummies
//                     await bot.smartMove(nearest.monster, { getWithin: 25 })
//                     return 250
//                 } else {
//                     return await specialMonsterMoveStrategy("franky")
//                 }
//             },
//             equipment: { orb: "test_orb" }
//         },
//         frog: {
//             attack: async () => { return await defaultAttackStrategy(["frog"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1124, y: 1118 }, "frog") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         fvampire: {
//             attack: async () => { return await defaultAttackStrategy(["fvampire"]) },
//             move: async () => { return await specialMonsterMoveStrategy("fvampire") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         ghost: {
//             attack: async () => { return await defaultAttackStrategy(["ghost"]) },
//             move: async () => { return holdPositionMoveStrategy({ map: "halloween", x: 276, y: -1224 }) },
//             equipment: { orb: "test_orb" }
//         },
//         goldenbat: {
//             attack: async () => { return await defaultAttackStrategy(["goldenbat"]) },
//             move: async () => { return await specialMonsterMoveStrategy("goldenbat") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         goo: {
//             attack: async () => { return await defaultAttackStrategy(["goo"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -12, y: 787 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         greenjr: {
//             attack: async () => { return await defaultAttackStrategy(["greenjr"]) },
//             move: async () => { return await specialMonsterMoveStrategy("greenjr") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         hen: {
//             attack: async () => { return await defaultAttackStrategy(["hen"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -41.5, y: -282 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         iceroamer: {
//             attack: async () => { return await defaultAttackStrategy(["iceroamer"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 1492, y: 104 }) },
//             equipment: { orb: "test_orb" }
//         },
//         jr: {
//             attack: async () => { return await defaultAttackStrategy(["jr"]) },
//             move: async () => { return await specialMonsterMoveStrategy("jr") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         minimush: {
//             attack: async () => { return await defaultAttackStrategy(["minimush"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: 28, y: 631 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         mole: {
//             attack: async () => { return await tankAttackStrategy("mole", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "tunnel", x: -35, y: -329 }) },
//             equipment: { orb: "test_orb" }
//         },
//         mummy: {
//             attack: async () => { return await defaultAttackStrategy(["mummy"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 270, y: -1129 }) },
//             equipment: { orb: "test_orb" }
//         },
//         mrgreen: {
//             attack: async () => { return await defaultAttackStrategy(["mrgreen"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mrgreen") },
//             equipment: { orb: "test_orb" }
//         },
//         mrpumpkin: {
//             attack: async () => { return await defaultAttackStrategy(["mrpumpkin"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mrpumpkin") },
//             equipment: { orb: "test_orb" }
//         },
//         mvampire: {
//             attack: async () => { return await defaultAttackStrategy(["mvampire"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mvampire") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         nerfedmummy: {
//             attack: async () => { return await defaultAttackStrategy(["nerfedmummy"]) },
//             move: async () => { return await specialMonsterMoveStrategy("franky") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         oneeye: {
//             attack: async () => { return await tankAttackStrategy("oneeye", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level2w", x: -155, y: 0 }) },
//             equipment: { orb: "test_orb" }
//         },
//         osnake: {
//             attack: async () => { return await defaultAttackStrategy(["osnake"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: -488, y: -708 }, "osnake") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         phoenix: {
//             attack: async () => { return await defaultAttackStrategy(["phoenix"]) },
//             move: async () => { return await specialMonsterMoveStrategy("phoenix") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         plantoid: {
//             attack: async () => { return await defaultAttackStrategy(["plantoid"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -730, y: -125 }) },
//             equipment: { orb: "test_orb" }
//         },
//         poisio: {
//             attack: async () => { return await defaultAttackStrategy(["poisio"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -101, y: 1360 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         porcupine: {
//             attack: async () => { return await defaultAttackStrategy(["porcupine"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -809, y: 135 }) },
//             equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         pppompom: {
//             attack: async () => { return await tankAttackStrategy("pppompom", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 120, y: -130 }) },
//             equipment: { orb: "test_orb" }
//         },
//         prat: {
//             attack: async () => { return await defaultAttackStrategy(["prat"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level1", x: -296, y: 557 }) },
//             equipment: { orb: "test_orb" },
//         },
//         rat: {
//             attack: async () => { return await defaultAttackStrategy(["rat"]) },
//             move: async () => { return holdPositionMoveStrategy({ map: "mansion", x: -224, y: -313 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         rooster: {
//             attack: async () => { return await defaultAttackStrategy(["rooster"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -41.5, y: -282 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         scorpion: {
//             attack: async () => { return await defaultAttackStrategy(["scorpion"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1598, y: -168 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         skeletor: {
//             attack: async () => { return await tankAttackStrategy("skeletor", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "arena", x: 400, y: -575 }) },
//             equipment: { orb: "test_orb" }
//         },
//         snake: {
//             attack: async () => { return await defaultAttackStrategy(["snake"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -62, y: 1901 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         snowman: {
//             attack: async () => { return await defaultAttackStrategy(["snowman"]) },
//             move: async () => { return await specialMonsterMoveStrategy("snowman") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         spider: {
//             attack: async () => { return await defaultAttackStrategy(["spider"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 968, y: -144 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         squig: {
//             attack: async () => { return await defaultAttackStrategy(["squig"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1155, y: 422 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         squigtoad: {
//             attack: async () => { return await defaultAttackStrategy(["squigtoad"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -1155, y: 422 }) },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         stoneworm: {
//             attack: async () => { return await defaultAttackStrategy(["stoneworm"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 697, y: 129 }) },
//             equipment: { orb: "test_orb" },
//         },
//         tinyp: {
//             attack: async () => { return await tankAttackStrategy("tinyp", warrior.id) },
//             move: async () => { return await specialMonsterMoveStrategy("tinyp") },
//             equipment: { orb: "test_orb" }
//         },
//         tortoise: {
//             attack: async () => { return await defaultAttackStrategy(["tortoise"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1104, y: 1118 }, "tortoise") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         wabbit: {
//             attack: async () => { return await defaultAttackStrategy(["wabbit"]) },
//             move: async () => { return await specialMonsterMoveStrategy("wabbit") },
//             equipment: { orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         wolf: {
//             attack: async () => { return await defaultAttackStrategy(["wolf"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 420, y: -2525 }) },
//             equipment: { orb: "test_orb" },
//         },
//         wolfie: {
//             attack: async () => { return await defaultAttackStrategy(["wolfie"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: -149, y: -2026 }, "wolfie") },
//             equipment: { orb: "test_orb" }
//         },
//         xscorpion: {
//             attack: async () => { return await tankAttackStrategy("xscorpion", warrior.id) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: -325, y: 725 }) },
//             equipment: { orb: "test_orb" }
//         }
//     }

//     async function targetLoop(): Promise<void> {
//         try {
//             if (bot.socket.disconnected) return

//             const newTarget = await getTarget(bot, strategy)
//             if (newTarget !== priestTarget) bot.stopSmartMove() // Stop the smart move if we have a new target
//             priestTarget = newTarget
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { await targetLoop() }, 1000)
//     }
//     targetLoop()

//     async function absorbLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             for (const friend of [warrior, ranger]) {
//                 if (Tools.distance(bot, friend.character) <= bot.G.skills.absorb.range
//                     && friend.character.targets > 1
//                     && bot.getCooldown("scare") == 0
//                     && bot.canUse("absorb")) {
//                     let numMagicalTargets = 0
//                     for (const [, entity] of friend.entities) {
//                         if (entity.target !== friend.character.id) continue
//                         if (entity.damage_type !== "magical") continue
//                         if (entity.willBurnToDeath()) continue
//                         if (Tools.willDieToProjectiles(entity, warrior)) continue

//                         numMagicalTargets++
//                     }

//                     if (numMagicalTargets > 0 && bot.targets + numMagicalTargets <= bot.mcourage) {
//                         bot.absorbSins(warrior.id)
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { await absorbLoop() }, 100)
//     }
//     absorbLoop()

//     async function attackLoop() {
//         let cooldown = 10
//         try {
//             if (bot.socket.disconnected) return

//             if (!bot.character || bot.rip) {
//                 setTimeout(async () => { attackLoop() }, 1000)
//                 return
//             }

//             // Heal ourselves if we are low HP
//             if (bot.canUse("heal") && bot.hp < bot.max_hp * 0.8) {
//                 await bot.heal(bot.id)
//             }

//             // Heal party members if they are close
//             let targets: string[] = []
//             for (const [id, player] of bot.players) {
//                 if (![ranger.id, warrior.id, priest.id, merchant.id].includes(id)) continue // Don't heal other players
//                 if (player.hp > player.max_hp * 0.8) continue // Lots of health, no need to heal
//                 if (Tools.distance(bot, player) > bot.range) continue // Too far away to heal

//                 targets.push(id)
//                 break
//             }
//             if (targets.length && bot.canUse("heal")) {
//                 await bot.heal(targets[0])
//             }

//             // Reasons to scare
//             let numTargets = 0
//             let numTargetingAndClose = 0
//             let incomingDPS = 0
//             let noStrategy = false
//             let avoidIdle = false
//             for (const [, entity] of bot.entities) {
//                 if (entity.target == bot.id) {
//                     numTargets++
//                     incomingDPS += Tools.calculateDamageRange(entity, bot.character)[1] * entity.frequency
//                     if (Tools.distance(bot, entity) <= entity.range) numTargetingAndClose++
//                     if (!strategy[entity.type]) noStrategy = true
//                     else if (priestTarget !== entity.type && !strategy[entity.type].attackWhileIdle) avoidIdle = true
//                 }
//             }
//             if (bot.hp < bot.max_hp * 0.25 // We are low on HP
//                 || (bot.s.burned && bot.s.burned.intensity > bot.max_hp / 10) // We are burned
//                 || bot.fear > 0 // We are scared
//                 || (numTargets > 0 && bot.c.town) // We are teleporting
//                 || noStrategy // We don't have a strategy for the given monster
//                 || avoidIdle // A monster is attacking us that we aren't targeting, and don't attack while idle
//                 || (numTargets > 1 && incomingDPS > bot.hp) // We have multiple targets, and a lot of incomingDPS.
//             ) {
//                 if (!bot.slots.orb || bot.slots.orb.name !== "jacko") {
//                     const i = bot.locateItem("jacko")
//                     if (i) await bot.equip(i)
//                 }
//                 if (bot.canUse("scare")) await bot.scare()
//             }

//             if (bot.isPVP()) {
//                 for (const enemy of bot.players.values()) {
//                     if (Tools.distance(bot, enemy) > bot.range) continue // We're too far to attack them
//                     if (bot.owner == enemy.owner) continue // We're friends
//                     if (bot.party && bot.partyData.list && bot.partyData.list.includes(enemy.id)) continue // We're friends
//                     if (enemy.rip) continue // Enemy is dead

//                     if (bot.canUse("curse")) await bot.curse(enemy.id)
//                     if (bot.canUse("attack")) await bot.basicAttack(enemy.id)

//                     setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
//                     return
//                 }
//             }

//             if (bot.c.town) {
//                 setTimeout(async () => { attackLoop() }, 10)
//                 return
//             }

//             if (bot.getCooldown("scare") > 0) {
//                 setTimeout(async () => { attackLoop() }, Math.min(bot.getCooldown("scare"), Math.max(bot.getCooldown("attack"), 10)))
//                 return
//             }

//             if (priestTarget) {
//                 if (strategy[priestTarget].equipment) {
//                     for (const s in strategy[priestTarget].equipment) {
//                         const slot = s as SlotType
//                         const itemName = strategy[priestTarget].equipment[slot]
//                         const wtype = bot.G.items[itemName].wtype
//                         if (bot.G.classes[bot.ctype].doublehand[wtype]) {
//                             // Check if we have something in our offhand, we need to unequip it.
//                             if (bot.slots.offhand) await bot.unequip("offhand")
//                         }

//                         if (slot == "offhand" && bot.slots["mainhand"]) {
//                             const mainhandItem = bot.slots["mainhand"].name
//                             const mainhandWType = bot.G.items[mainhandItem].wtype
//                             if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
//                                 // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
//                                 await bot.unequip("mainhand")
//                             }
//                         }

//                         if (!bot.slots[slot]
//                             || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
//                             const i = bot.locateItem(itemName)
//                             if (i !== undefined) await bot.equip(i, slot)
//                         }
//                     }
//                 }
//             }

//             if (priestTarget && strategy[priestTarget]) {
//                 cooldown = await strategy[priestTarget].attack()
//             }

//             if (bot.canUse("attack")) {
//                 targets = []
//                 for (const [id, entity] of bot.entities) {
//                     if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range

//                     // If the target will die to incoming projectiles, ignore it
//                     if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                     // If the target will burn to death, ignore it
//                     if (entity.willBurnToDeath()) continue

//                     targets.push(id)

//                     const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                     if (minimumDamage > entity.hp) {
//                         // Stop looking for another one to attack, since we can kill this one in one hit.
//                         targets[0] = id
//                         break
//                     }
//                 }

//                 if (targets.length) {
//                     await bot.basicAttack(targets[0])
//                     cooldown = bot.getCooldown("attack")
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { attackLoop() }, cooldown)
//     }
//     attackLoop()

//     async function sendItemLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (!merchant) {
//                 setTimeout(async () => { sendItemLoop() }, 1000)
//                 return
//             }

//             const sendTo = bot.players.get(merchant.id)
//             if (sendTo && Tools.distance(bot, sendTo) < Constants.NPC_INTERACTION_DISTANCE) {
//                 const extraGold = bot.gold - PLAYER_GOLD_TO_HOLD
//                 if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
//                 for (let i = 0; i < bot.items.length; i++) {
//                     const item = bot.items[i]
//                     if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items
//                     if (item.l == "l") continue // Don't send locked items

//                     if (merchant.isFull()) {
//                         // Can we stack it in the merchant's inventory?
//                         if (item.q == undefined) continue // Item is not stackable
//                         for (const itemPos of merchant.locateItems(item.name)) {
//                             const merchantItem = merchant.items[itemPos]
//                             // Send as many as we can
//                             await bot.sendItem(merchant.id, i, Math.min(item.q, bot.G.items[item.name].s - merchantItem.q))
//                         }
//                     } else {
//                         // The merchant has space, send it over.
//                         await bot.sendItem(merchant.id, i, item.q)
//                     }
//                 }
//             }

//             if (bot.isFull()) {
//                 // See if we can stack any of our items on other players
//                 for (const sendTo of [ranger, warrior]) {
//                     if (Tools.distance(bot, sendTo.character) > Constants.NPC_INTERACTION_DISTANCE) continue // Too far away to send items
//                     for (let i = 0; i < bot.items.length; i++) {
//                         const item = bot.items[i]
//                         if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items
//                         if (item.l == "l") continue // Don't send locked items
//                         if (item.q == undefined) continue // Item is not stackable
//                         for (const itemPos of sendTo.locateItems(item.name)) {
//                             const sendToItem = sendTo.character.items[itemPos]
//                             // Send as many as we can
//                             await bot.sendItem(sendTo.character.id, i, Math.min(item.q, bot.G.items[item.name].s - sendToItem.q))
//                         }
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { sendItemLoop() }, 1000)
//     }
//     sendItemLoop()

//     async function moveLoop() {
//         let cooldown = 10

//         try {
//             if (bot.socket.disconnected) return

//             // If we are dead, respawn
//             if (bot.rip) {
//                 await bot.respawn()
//                 setTimeout(async () => { moveLoop() }, 1000)
//                 return
//             }

//             // Priority #1: If it's christmas, and we don't have (or are about to run out of) holiday spirit, go get some at the tree
//             if (bot.S && bot.S.holidayseason
//                 && (!bot.s || !bot.s.holidayspirit)) {
//                 await bot.smartMove("newyear_tree", { getWithin: 400 })
//                 setTimeout(async () => { moveLoop() }, 500)
//                 return
//             }

//             // Priority #2: If there are new characters, and we don't have (or are about to run out of newcomersblessing), go to that character and get some
//             if (!bot.s || !bot.s.newcomersblessing || bot.s.newcomersblessing) {
//                 const newcomer = await CharacterModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 120000 }, $expr: { $eq: ["$s.newcomersblessing.f", "$name"] } }).lean().exec()
//                 if (newcomer) {
//                     await bot.smartMove(newcomer, { getWithin: 20 })
//                     await bot.smartMove("newyear_tree", { getWithin: 400 })
//                     setTimeout(async () => { moveLoop() }, 500)
//                     return
//                 }
//             }

//             // Priority #3: Special monsters
//             if (priestTarget) {
//                 cooldown = await strategy[priestTarget].move()
//             }

//             if (bot.socket.disconnected) return

//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { moveLoop() }, cooldown)
//     }
//     moveLoop()

//     async function partyHealLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.c.town) {
//                 setTimeout(async () => { partyHealLoop() }, bot.c.town.ms)
//                 return
//             }

//             // Heal our own bots (we can do this effectively cross-map!)
//             if (bot.canUse("partyheal")) {
//                 for (const bot of [priest, ranger, warrior, merchant]) {
//                     if (!bot?.party?.list?.includes(priest.id)) continue // Our priest isn't in the party!?
//                     if (bot.rip) continue // Party member is already dead
//                     if (bot.hp < bot.max_hp * 0.5) {
//                         // Someone in our party has low HP
//                         await priest.partyHeal()
//                         break
//                     }
//                 }
//             }

//             // Heal other players (we can only do this effectively nearby)
//             if (bot.canUse("partyheal")) {
//                 for (const [, player] of bot.players) {
//                     if (!bot?.party?.list?.includes(player.party)) continue // They aren't in our party
//                     if (player.rip) continue // Party member is already dead
//                     if (player.hp < player.max_hp * 0.5) {
//                         // Someone in our party has low HP
//                         await priest.partyHeal()
//                         break
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { partyHealLoop() }, Math.max(bot.getCooldown("partyheal"), 10))
//     }
//     partyHealLoop()

//     async function darkBlessingLoop() {
//         try {
//             if (bot.socket.disconnected) return
//             if (bot.canUse("darkblessing")) await bot.darkBlessing()
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { darkBlessingLoop() }, Math.max(10, bot.getCooldown("darkblessing")))
//     }
//     darkBlessingLoop()
// }

// async function startWarrior(bot: Warrior) {
//     const defaultAttackStrategy = async (mtypes: MonsterName[]): Promise<number> => {
//         if (bot.canUse("attack")) {
//             const targets: Entity[] = []

//             for (const [, entity] of bot.entities) {
//                 if (!mtypes.includes(entity.type)) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 const distance = Tools.distance(bot, entity)
//                 if (distance > bot.range) continue // Only attack those in range

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 targets.push(entity)

//                 const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                 if (minimumDamage > entity.hp) {
//                     // Stop looking for another one to attack, since we can kill this one in one hit.
//                     targets[0] = entity
//                     break
//                 }
//             }

//             if (targets.length) {
//                 // Remove from other characters if we're going to kill it
//                 if (await Tools.isGuaranteedKill(bot, targets[0])) {
//                     for (const bot of [ranger, priest, warrior, merchant]) {
//                         bot.entities.delete(targets[0].id)
//                     }
//                 }

//                 await bot.basicAttack(targets[0].id)
//             }
//             if (targets.length == 0) {
//                 let numInAgitateRange = 0
//                 const inTauntRange: MonsterData[] = []
//                 for (const [, entity] of bot.entities) {
//                     const d = Tools.distance(bot, entity)
//                     if (entity.target == bot.id) continue // It's coming towards us already
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (entity.immune) continue // Can't be taunted
//                     if (d > bot.G.skills.agitate.range && d > bot.G.skills.taunt.range) continue
//                     if (d <= bot.G.skills.agitate.range) {
//                         if (!mtypes.includes(entity.type)) numInAgitateRange = Number.MIN_SAFE_INTEGER // We don't want to agitate if there are other monsters nearby
//                         else numInAgitateRange++
//                     }
//                     if (d <= bot.G.skills.taunt.range && mtypes.includes(entity.type)) inTauntRange.push(entity)
//                 }
//                 if (inTauntRange.length == 0 && numInAgitateRange > 0 && bot.canUse("agitate")) {
//                     await bot.agitate()
//                 } else if (inTauntRange.length > 0 && bot.canUse("taunt")) {
//                     await bot.taunt(inTauntRange[0].id)
//                 }
//             }
//         }

//         // Stomp things
//         if (bot.canUse("stomp")) {
//             for (const [, entity] of bot.entities) {
//                 if (!mtypes.includes(entity.type)) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) > bot.G.skills.stomp.range) continue // Only stomp those in range

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 await bot.stomp()
//                 break
//             }
//         }

//         // Cleave things
//         if (bot.canUse("cleave")) {
//             const targets: Entity[] = []
//             for (const [, entity] of bot.entities) {
//                 if (!mtypes.includes(entity.type)) continue
//                 if (entity.immune) continue // Can't do damage to immune enemies with cleave
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) > bot.G.skills.cleave.range) continue // Only attack those in range

//                 if (!strategy[entity.type]) { targets.length = 0; break } // We don't have a strategy for this monster, which means we don't want to attack this.

//                 // If the target will die to incoming projectiles, ignore it
//                 if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                 // If the target will burn to death, ignore it
//                 if (entity.willBurnToDeath()) continue

//                 targets.push(entity)
//             }

//             if (targets.length) {
//                 await bot.cleave()
//             }
//         }

//         return Math.max(10, bot.getCooldown("attack"))
//     }
//     /**
//      * If you're using this strategy, make sure you have a `jacko` equipped.
//      * @param mtype 
//      */
//     const oneTargetAttackStrategy = async (mtype: MonsterName) => {
//         // If we have more than one target, scare
//         if (bot.targets > 1) {
//             if (bot.canUse("scare")) await bot.scare()
//             return bot.getCooldown("scare") // Don't attack until we have scare available again
//         }

//         if (bot.canUse("attack")) {
//             let target: MonsterData

//             for (const [, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range

//                 if (entity.target == bot.id) {
//                     target = entity
//                     break // This entity is already targeting us, we should attack it.
//                 }

//                 if (!target) {
//                     target = entity
//                 } else if (entity.hp < target.hp) {
//                     // Prioritize killing lower hp monsters first
//                     target = entity
//                 }
//             }

//             if (!target && bot.canUse("taunt")) {
//                 // See if one is in taunt distance
//                 for (const [, entity] of bot.entities) {
//                     if (entity.type !== mtype) continue
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.G.skills.taunt.range) continue // Only taunt those in range
//                     if (entity.immune) continue // Can't' be taunted

//                     if (entity.target == bot.id) {
//                         target = entity
//                         break // This entity is already targeting us, we should attack it.
//                     }

//                     if (!target) {
//                         target = entity
//                     } else if (entity.hp < target.hp) {
//                         // Prioritize killing lower hp monsters first
//                         target = entity
//                     } else if (entity.hp <= target.hp && Tools.distance(bot, entity) < Tools.distance(bot, target)) {
//                         // Same HP, but closer
//                         target = entity
//                     }
//                 }
//                 if (target && target.target !== bot.id) {
//                     if (Tools.distance(bot, target) < bot.G.skills.stomp.range && bot.canUse("stomp")) {
//                         await bot.stomp()
//                     }
//                     await bot.taunt(target.id)
//                 }
//             } else if (target) {
//                 if (bot.G.monsters[target.type].damage_type == "physical" && bot.canUse("hardshell")) {
//                     await bot.hardshell()
//                 }

//                 if (bot.canUse("stomp")) {
//                     await bot.stomp()
//                 }

//                 // Remove from other characters if we're going to kill it
//                 if (await bot.canKillInOneShot(target)) {
//                     for (const bot of [ranger, priest, warrior, merchant]) {
//                         bot.entities.delete(target.id)
//                     }
//                 }

//                 await bot.basicAttack(target.id)
//             }
//         }

//         return Math.max(10, bot.getCooldown("attack"))
//     }
//     const stompThenAttackStrategy = async (mtype: MonsterName) => {
//         let target: MonsterData
//         for (const [, entity] of bot.entities) {
//             if (entity.type !== mtype) continue
//             if (entity.range > bot.range + bot.speed) continue
//             if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//             target = entity
//         }

//         if (target && !target.s.stunned && bot.canUse("stomp")) {
//             // If they're not stunned, stun then attack
//             await bot.stomp()
//             if (bot.canUse("attack")) await bot.basicAttack(target.id)
//         } else if (target?.s.stunned && bot.canUse("attack")) {
//             await bot.basicAttack(target.id)
//         }

//         return Math.max(10, bot.getCooldown("attack"))

//     }
//     const holdPositionMoveStrategy = async (position: NodeData) => {
//         try {
//             if (Tools.distance(bot, position) > 0) await bot.smartMove(position)
//         } catch (e) {
//             console.error(e)
//         }
//         return 1000
//     }
//     const nearbyMonstersMoveStrategy = async (position: NodeData, mtype: MonsterName) => {
//         let closestEntitiy: MonsterData
//         let closestDistance: number = Number.MAX_VALUE
//         for (const [, entity] of bot.entities) {
//             if (entity.type !== mtype) continue
//             if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else

//             // If the target will die to incoming projectiles, ignore it
//             if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//             // If the target will burn to death, ignore it
//             if (entity.willBurnToDeath()) continue

//             const distance = Tools.distance(bot, entity)
//             if (distance < closestDistance) {
//                 closestDistance = distance
//                 closestEntitiy = entity
//             }
//         }

//         try {
//             if (!closestEntitiy && !bot.moving) await bot.smartMove(position)
//             // We will get a lot of errors without catching, because we'll be dropping a lot of movements 
//             // eslint-disable-next-line @typescript-eslint/no-empty-function
//             else if (closestEntitiy && Pathfinder.canWalk(bot, closestEntitiy)) bot.move(closestEntitiy.x, closestEntitiy.y).catch(() => { })
//             else if (closestEntitiy && Tools.distance(bot, closestEntitiy) > bot.range) await bot.smartMove(closestEntitiy)
//         } catch (e) {
//             // console.error(e)
//             bot.stopSmartMove()
//         }
//         return 250
//     }
//     const specialMonsterMoveStrategy = async (mtype: MonsterName) => {
//         try {
//             // Look in nearby entities for monster
//             for (const [, entity] of bot.entities) {
//                 if (entity.type !== mtype) continue
//                 if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                 if (Tools.distance(bot, entity) <= bot.range) return 250 // We're in range
//                 await bot.smartMove(entity, { getWithin: bot.range - 10 })
//                 return 250
//             }

//             // Look in 'S' for monster
//             if (bot.S && bot.S[mtype] && bot.S[mtype].live) {
//                 if (Tools.distance(bot, bot.S[mtype]) <= bot.range) return 250 // We're in range
//                 await bot.smartMove(bot.S[mtype], { getWithin: bot.range - 10 })
//                 return 250
//             }

//             // Look in database for monster
//             const specialTarget = await EntityModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, type: mtype }).lean().exec()
//             if (specialTarget) {
//                 await bot.smartMove(specialTarget, { getWithin: bot.range - 10 })
//             } else {
//                 // See if there's a spawn for them. If there is, go check there
//                 for (const spawn of bot.locateMonsters(mtype)) {
//                     await bot.smartMove(spawn, { getWithin: 300 })

//                     // Check if we've found it
//                     let monsterIsNear = false
//                     for (const [, entity] of bot.entities) {
//                         if (entity.type !== mtype) continue
//                         monsterIsNear = true
//                         break
//                     }
//                     if (monsterIsNear) break
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }
//         return 100
//     }
//     const strategy: Strategy = {
//         arcticbee: {
//             attack: async () => { return await defaultAttackStrategy(["arcticbee"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: 1062, y: -873 }, "arcticbee") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bat: {
//             attack: async () => { return await defaultAttackStrategy(["bat"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "cave", x: 1243, y: -27 }, "bat") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bbpompom: {
//             attack: async () => { return await defaultAttackStrategy(["bbpompom"]) },
//             move: async () => {
//                 if (bot.hp < bot.max_hp * 0.5) {
//                     await bot.smartMove(priest.character, { getWithin: priest.range })
//                     return 1000
//                 } else {
//                     return await nearbyMonstersMoveStrategy({ map: "winter_cave", x: 31, y: -164 }, "bbpompom")
//                 }
//             },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" }
//         },
//         bee: {
//             attack: async () => { return await defaultAttackStrategy(["bee"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 737, y: 720 }, "bee") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         bigbird: {
//             attack: async () => { return await defaultAttackStrategy(["bigbird"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: 1323, y: 248 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true,
//             attackWhileIdle: false
//         },
//         boar: {
//             attack: async () => { return await defaultAttackStrategy(["boar"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 0, y: -1109 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         booboo: {
//             attack: async () => { return await oneTargetAttackStrategy("booboo") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "spookytown", x: 265, y: -625 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         bscorpion: {
//             attack: async () => {
//                 const bscorpion = bot.getNearestMonster("bscorpion")?.monster
//                 if (bscorpion?.target) {
//                     return await defaultAttackStrategy(["bscorpion"])
//                 } else {
//                     return 250
//                 }
//             },
//             move: async () => {
//                 const bscorpionSpawn = bot.locateMonsters("bscorpion")[0]
//                 const RADIUS = 125
//                 const ANGLE = Math.PI / 2.5
//                 if (Pathfinder.canWalk(bot, bscorpionSpawn)) {
//                     const bscorpion = bot.getNearestMonster("bscorpion")?.monster
//                     if (bscorpion?.target) {
//                         // There's a bscorpion and it has a target
//                         bot.move(bscorpion.x, bscorpion.y).catch(() => { /* Ignore errors */ })
//                     } else if (bscorpion) {
//                         // It has no target
//                         const angleFromSpawnToBscorpionGoing = Math.atan2(bscorpion.going_y - bscorpionSpawn.y, bscorpion.going_x - bscorpionSpawn.x)
//                         const endGoalAngle = angleFromSpawnToBscorpionGoing + ANGLE // Our goal is 90 degrees
//                         const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(endGoalAngle), y: bscorpionSpawn.y + RADIUS * Math.sin(endGoalAngle) }
//                         bot.move(endGoal.x, endGoal.y).catch(() => { /* Ignore Errors */ })
//                     } else {
//                         // There isn't a bscorpion nearby
//                         const angleFromSpawnToBot = Math.atan2(bot.y - bscorpionSpawn.y, bot.x - bscorpionSpawn.x)
//                         const endGoal = { x: bscorpionSpawn.x + RADIUS * Math.cos(angleFromSpawnToBot), y: bscorpionSpawn.y + RADIUS * Math.sin(angleFromSpawnToBot) }
//                         bot.move(endGoal.x, endGoal.y).catch(() => { /* Ignore Errors */ })
//                     }
//                 } else {
//                     // Move to the bscorpion spawn
//                     await bot.smartMove(bscorpionSpawn, { getWithin: RADIUS })
//                 }
//                 return 250
//             },
//             equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "test_orb" },
//             requirePriest: true
//         },
//         cgoo: {
//             attack: async () => { return await defaultAttackStrategy(["cgoo"]) },
//             move: async () => {
//                 if (bot.hp < bot.max_hp * 0.5) {
//                     await bot.smartMove(priest.character, { getWithin: priest.range })
//                     return 1000
//                 } else {
//                     return await nearbyMonstersMoveStrategy({ map: "arena", x: 151.6, y: 40.82 }, "cgoo")
//                 }
//             },
//             equipment: { mainhand: "basher", orb: "test_orb" }
//         },
//         crab: {
//             attack: async () => { return await defaultAttackStrategy(["crab"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1222, y: -66 }, "crab") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         crabx: {
//             attack: async () => { return await defaultAttackStrategy(["crabx"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1004, y: 1762 }, "crabx") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         croc: {
//             attack: async () => { return await defaultAttackStrategy(["croc"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 781, y: 1710 }, "croc") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         cutebee: {
//             attack: async () => { return await defaultAttackStrategy(["cutebee"]) },
//             move: async () => {
//                 const cutebee = bot.getNearestMonster("cutebee")
//                 if (cutebee && !cutebee.monster.target) {
//                     await bot.smartMove({ x: cutebee.monster.going_x, y: cutebee.monster.going_y })
//                     return 250
//                 }
//                 return await specialMonsterMoveStrategy("cutebee")
//             },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         dragold: {
//             attack: async () => { return await defaultAttackStrategy(["dragold"]) },
//             move: async () => { return await specialMonsterMoveStrategy("dragold") },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//         },
//         fireroamer: {
//             attack: async () => { return await oneTargetAttackStrategy("fireroamer") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: 140, y: -675 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         franky: {
//             attack: async () => { return await defaultAttackStrategy(["nerfedmummy", "franky"]) },
//             move: async () => { return await specialMonsterMoveStrategy("franky") },
//             equipment: { mainhand: "basher", orb: "test_orb" }
//         },
//         fvampire: {
//             attack: async () => { return await defaultAttackStrategy(["fvampire"]) },
//             move: async () => { return await specialMonsterMoveStrategy("fvampire") },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             attackWhileIdle: true,
//             requirePriest: true
//         },
//         ghost: {
//             attack: async () => { return await defaultAttackStrategy(["ghost"]) },
//             move: async () => { return nearbyMonstersMoveStrategy({ map: "halloween", x: 236, y: -1224 }, "ghost") },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" }
//         },
//         goldenbat: {
//             attack: async () => { return await defaultAttackStrategy(["goldenbat"]) },
//             move: async () => { return await specialMonsterMoveStrategy("goldenbat") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         goo: {
//             attack: async () => { return await defaultAttackStrategy(["goo"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -52, y: 787 }, "goo") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         greenjr: {
//             attack: async () => { return await defaultAttackStrategy(["greenjr"]) },
//             move: async () => { return await specialMonsterMoveStrategy("greenjr") },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         hen: {
//             attack: async () => { return await defaultAttackStrategy(["hen"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -81.5, y: -282 }) },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         iceroamer: {
//             attack: async () => { return await defaultAttackStrategy(["iceroamer"]) },
//             move: async () => {
//                 if (bot.hp < bot.max_hp * 0.5) {
//                     await bot.smartMove(priest.character, { getWithin: priest.range })
//                     return 1000
//                 } else {
//                     return await nearbyMonstersMoveStrategy({ map: "winterland", x: 1532, y: 104 }, "iceroamer")
//                 }
//             },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" }
//         },
//         jr: {
//             attack: async () => { return await defaultAttackStrategy(["jr"]) },
//             move: async () => { return await specialMonsterMoveStrategy("jr") },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         minimush: {
//             attack: async () => { return await defaultAttackStrategy(["minimush"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: -18, y: 631 }, "minimush") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         mole: {
//             attack: async () => {
//                 let shouldAgitate = bot.canUse("agitate")
//                 if (shouldAgitate) {
//                     for (const [, mole] of bot.entities) {
//                         if (Tools.distance(bot, mole) > bot.G.skills.agitate.range) continue // Too far away to agitate
//                         if (mole.target) continue // It's already targeting something
//                         if (mole.type !== "mole" // There's something that's not a mole here...
//                             || mole.target
//                             || mole.level > 3) { // The moles are too high level
//                             shouldAgitate = false
//                             break
//                         }
//                     }
//                     if (shouldAgitate) await bot.agitate()
//                 }
//                 return await defaultAttackStrategy(["mole"])
//             },
//             move: async () => { return await holdPositionMoveStrategy({ map: "tunnel", x: 5, y: -329 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         mummy: {
//             attack: async () => { return await defaultAttackStrategy(["mummy"]) },
//             // TODO: Make abuseRageMoveStrategy where we go to the rage range until we have targets, then move back.
//             move: async () => {
//                 let highestMummyLevel = 0
//                 for (const [, entity] of bot.entities) {
//                     if (entity.type !== "mummy") continue
//                     if (entity.level > highestMummyLevel) highestMummyLevel = entity.level
//                 }
//                 if (highestMummyLevel <= 1) // Aggro mummies
//                     return await holdPositionMoveStrategy({ map: "spookytown", x: 230, y: -1131 })
//                 else if (bot.targets) // Don't aggro mummies
//                     return await holdPositionMoveStrategy({ map: "spookytown", x: 230, y: -1129 })
//                 else // Aggro mummies
//                     return await holdPositionMoveStrategy({ map: "spookytown", x: 230, y: -1131 })
//             },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             requirePriest: true
//         },
//         mrgreen: {
//             attack: async () => { return await defaultAttackStrategy(["mrgreen"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mrgreen") },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" },
//             requirePriest: true
//         },
//         mrpumpkin: {
//             attack: async () => { return await defaultAttackStrategy(["mrpumpkin"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mrpumpkin") },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" },
//             requirePriest: true
//         },
//         mvampire: {
//             attack: async () => { return await defaultAttackStrategy(["mvampire"]) },
//             move: async () => { return await specialMonsterMoveStrategy("mvampire") },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         nerfedmummy: {
//             attack: async () => { return await defaultAttackStrategy(["nerfedmummy"]) },
//             move: async () => { return await specialMonsterMoveStrategy("franky") },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         oneeye: {
//             attack: async () => { return await oneTargetAttackStrategy("oneeye") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level2w", x: -195, y: 0 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         osnake: {
//             attack: async () => {
//                 // Agitate snakes to farm them while attacking the osnakes
//                 let shouldAgitate = bot.canUse("agitate")
//                 if (shouldAgitate) {
//                     for (const [, entity] of bot.entities) {
//                         if (Tools.distance(bot, entity) > bot.G.skills.agitate.range) continue // Out of range
//                         if (entity.target) continue // It's already targeting something
//                         if (entity.type !== "osnake" && !strategy[entity.type].attackWhileIdle) {
//                             // Something else is here.
//                             shouldAgitate = false
//                             break
//                         }
//                         shouldAgitate = true
//                     }
//                     if (shouldAgitate) await bot.agitate()
//                 }
//                 return await defaultAttackStrategy(["osnake"])
//             },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "halloween", x: 347, y: -747 }, "osnake") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         phoenix: {
//             attack: async () => { return await defaultAttackStrategy(["phoenix"]) },
//             move: async () => { return await specialMonsterMoveStrategy("phoenix") },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         plantoid: {
//             attack: async () => { return await oneTargetAttackStrategy("plantoid") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "desertland", x: -770, y: -125 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         poisio: {
//             attack: async () => { return await defaultAttackStrategy(["poisio"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -141, y: 1360 }, "poisio") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         pppompom: {
//             attack: async () => { return oneTargetAttackStrategy("pppompom") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "level2n", x: 120, y: -150 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         rat: {
//             attack: async () => { return await defaultAttackStrategy(["rat"]) },
//             move: async () => { return nearbyMonstersMoveStrategy({ map: "mansion", x: 0, y: -21 }, "rat") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         rooster: {
//             attack: async () => { return await defaultAttackStrategy(["rooster"]) },
//             move: async () => { return await holdPositionMoveStrategy({ map: "main", x: -81.5, y: -282 }) },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         scorpion: {
//             attack: async () => { return await defaultAttackStrategy(["scorpion"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 1558, y: -168 }, "scorpion") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         skeletor: {
//             attack: async () => { return await oneTargetAttackStrategy("skeletor") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "arena", x: 360, y: -575 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         snake: {
//             attack: async () => { return await defaultAttackStrategy(["snake"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -102, y: 1901 }, "snake") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         snowman: {
//             attack: async () => {
//                 // Agitate bees to farm them while attacking the snowman
//                 let shouldAgitate = false
//                 for (const [, entity] of bot.entities) {
//                     if (Tools.distance(bot, entity) > bot.G.skills.agitate.range) continue // Out of range
//                     if (entity.target) continue // It's already targeting something
//                     if (entity.type !== "snowman" && !strategy[entity.type].attackWhileIdle) {
//                         // Something else is here.
//                         shouldAgitate = false
//                         break
//                     }
//                     shouldAgitate = true
//                 }
//                 if (shouldAgitate && bot.canUse("agitate")) bot.agitate()
//                 return await defaultAttackStrategy(["snowman"])
//             },
//             move: async () => { return await specialMonsterMoveStrategy("snowman") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         spider: {
//             attack: async () => { return await defaultAttackStrategy(["spider"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: 928, y: -144 }, "spider") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         squig: {
//             attack: async () => { return await defaultAttackStrategy(["squig"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1195, y: 422 }, "squig") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         squigtoad: {
//             attack: async () => {
//                 // Agitate squigs to farm them while attacking the squigtoads
//                 let shouldAgitate = false
//                 for (const [, entity] of bot.entities) {
//                     if (Tools.distance(bot, entity) > bot.G.skills.agitate.range) continue // Out of range
//                     if (entity.target) continue // It's already targeting something
//                     if (entity.type !== "squigtoad" && !strategy[entity.type].attackWhileIdle) {
//                         // Something else is here.
//                         shouldAgitate = false
//                         break
//                     }
//                     shouldAgitate = true
//                 }
//                 if (shouldAgitate && bot.canUse("agitate")) bot.agitate()
//                 return await defaultAttackStrategy(["squigtoad"])
//             },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1195, y: 422 }, "squigtoad") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         stoneworm: {
//             attack: async () => { return await defaultAttackStrategy(["stoneworm"]) },
//             move: async () => {
//                 if (bot.hp < bot.max_hp * 0.5) {
//                     await bot.smartMove(priest.character, { getWithin: priest.range })
//                     return 1000
//                 } else {
//                     return await nearbyMonstersMoveStrategy({ map: "spookytown", x: 717, y: 129 }, "stoneworm")
//                 }
//             },
//             equipment: { mainhand: "fireblade", offhand: "candycanesword", orb: "test_orb" }
//         },
//         tinyp: {
//             attack: async () => { return await stompThenAttackStrategy("tinyp") },
//             move: async () => { return await specialMonsterMoveStrategy("tinyp") },
//             equipment: { mainhand: "basher", orb: "test_orb" }
//         },
//         tortoise: {
//             attack: async () => { return await defaultAttackStrategy(["tortoise"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "main", x: -1144, y: 1118 }, "tortoise") },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         wabbit: {
//             attack: async () => { return await defaultAttackStrategy(["wabbit"]) },
//             move: async () => {
//                 const wabbit = bot.getNearestMonster("wabbit")
//                 if (wabbit && !wabbit.monster.target) {
//                     await bot.smartMove({ x: wabbit.monster.going_x, y: wabbit.monster.going_y })
//                     return 250
//                 }
//                 return await specialMonsterMoveStrategy("wabbit")
//             },
//             equipment: { mainhand: "bataxe", orb: "test_orb" },
//             attackWhileIdle: true
//         },
//         wolf: {
//             attack: async () => { return await oneTargetAttackStrategy("wolf") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "winterland", x: 380, y: -2525 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         wolfie: {
//             attack: async () => { return await defaultAttackStrategy(["wolfie"]) },
//             move: async () => { return await nearbyMonstersMoveStrategy({ map: "winterland", x: -189, y: -2026 }, "wolfie") },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         },
//         xscorpion: {
//             attack: async () => { return await oneTargetAttackStrategy("xscorpion") },
//             move: async () => { return await holdPositionMoveStrategy({ map: "halloween", x: -325, y: 750 }) },
//             equipment: { mainhand: "basher", orb: "test_orb" },
//             requirePriest: true
//         }
//     }

//     async function targetLoop(): Promise<void> {
//         try {
//             if (bot.socket.disconnected) return

//             const newTarget = await getTarget(bot, strategy)
//             if (newTarget !== warriorTarget) bot.stopSmartMove() // Stop the smart move if we have a new target
//             warriorTarget = newTarget
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { await targetLoop() }, 1000)
//     }
//     targetLoop()

//     async function attackLoop() {
//         let cooldown = 10
//         try {
//             if (bot.socket.disconnected) return

//             if (!bot.character || bot.rip) {
//                 setTimeout(async () => { attackLoop() }, 1000)
//                 return
//             }

//             if (bot.isPVP()) {
//                 for (const enemy of bot.players.values()) {
//                     if (Tools.distance(bot, enemy) > bot.range) continue // We're too far to attack them
//                     if (bot.owner == enemy.owner) continue // We're friends
//                     if (bot.party && bot.partyData.list && bot.partyData.list.includes(enemy.id)) continue // We're friends
//                     if (enemy.rip) continue // Enemy is dead

//                     if (bot.canUse("stomp")) await bot.stomp()
//                     if (bot.canUse("attack")) await bot.basicAttack(enemy.id)

//                     setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
//                     return
//                 }
//             }

//             // Reasons to scare
//             let numTargets = 0
//             let numTargetingAndClose = 0
//             let incomingDPS = 0
//             let noStrategy = false
//             let avoidIdle = false
//             for (const [, entity] of bot.entities) {
//                 if (entity.target == bot.id) {
//                     numTargets++
//                     incomingDPS += Tools.calculateDamageRange(entity, bot.character)[1] * entity.frequency
//                     if (Tools.distance(bot, entity) <= entity.range) numTargetingAndClose++
//                     if (!strategy[entity.type]) noStrategy = true
//                     else if (warriorTarget !== entity.type && !strategy[entity.type].attackWhileIdle) avoidIdle = true
//                 }
//             }
//             if (bot.hp < bot.max_hp * 0.25 // We are low on HP
//                 || (bot.s.burned && bot.s.burned.intensity > bot.max_hp / 10) // We are burned
//                 || bot.fear > 0 // We are scared
//                 || (numTargets > 0 && bot.c.town) // We are teleporting
//                 || noStrategy // We don't have a strategy for the given monster
//                 || avoidIdle // A monster is attacking us that we aren't targeting, and don't attack while idle
//                 || (numTargets > 1 && incomingDPS > bot.hp) // We have multiple targets, and a lot of incomingDPS.
//             ) {
//                 if (!bot.slots.orb || bot.slots.orb.name !== "jacko") {
//                     const i = bot.locateItem("jacko")
//                     if (i) await bot.equip(i)
//                 }
//                 if (bot.canUse("scare")) await bot.scare()
//             }

//             if (bot.c.town) {
//                 setTimeout(async () => { attackLoop() }, 10)
//                 return
//             }

//             if (bot.getCooldown("scare") > 0) {
//                 setTimeout(async () => { attackLoop() }, Math.min(bot.getCooldown("scare"), Math.max(bot.getCooldown("attack"), 10)))
//                 return
//             }

//             if (warriorTarget) {
//                 if (strategy[warriorTarget].equipment) {
//                     for (const s in strategy[warriorTarget].equipment) {
//                         const slot = s as SlotType
//                         const itemName = strategy[warriorTarget].equipment[slot]
//                         const wtype = bot.G.items[itemName].wtype
//                         if (bot.G.classes[bot.ctype].doublehand[wtype]) {
//                             // Check if we have something in our offhand, we need to unequip it.
//                             if (bot.slots.offhand) await bot.unequip("offhand")
//                         }

//                         if (slot == "offhand" && bot.slots["mainhand"]) {
//                             const mainhandItem = bot.slots["mainhand"].name
//                             const mainhandWType = bot.G.items[mainhandItem].wtype
//                             if (bot.G.classes[bot.ctype].doublehand[mainhandWType]) {
//                                 // We're equipping an offhand item, but we have a doublehand item equipped in our mainhand.
//                                 await bot.unequip("mainhand")
//                             }
//                         }

//                         if (!bot.slots[slot]
//                             || (bot.slots[slot] && bot.slots[slot].name !== itemName)) {
//                             const i = bot.locateItem(itemName)
//                             if (i !== undefined) await bot.equip(i, slot)
//                         }
//                     }
//                 }
//             }

//             if (warriorTarget && strategy[warriorTarget]) {
//                 cooldown = await strategy[warriorTarget].attack()
//             }

//             if (bot.canUse("attack")) {
//                 const targets: string[] = []
//                 for (const [id, entity] of bot.entities) {
//                     if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.range) continue // Only attack those in range

//                     // If the target will die to incoming projectiles, ignore it
//                     if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                     // If the target will burn to death, ignore it
//                     if (entity.willBurnToDeath()) continue

//                     targets.push(id)

//                     const minimumDamage = Tools.calculateDamageRange(bot, entity)[0]
//                     if (minimumDamage > entity.hp) {
//                         // Stop looking for another one to attack, since we can kill this one in one hit.
//                         targets[0] = id
//                         break
//                     }
//                 }

//                 if (targets.length) {
//                     await bot.basicAttack(targets[0])
//                 }
//             }

//             // Cleave things
//             if (bot.canUse("cleave")) {
//                 const targets: Entity[] = []
//                 for (const [, entity] of bot.entities) {
//                     if (!strategy[entity.type] || !strategy[entity.type].attackWhileIdle) continue
//                     if (entity.immune) continue // Can't do damage to immune enemies with cleave
//                     if (entity.cooperative !== true && entity.target && ![ranger.id, warrior.id, priest.id, merchant.id].includes(entity.target)) continue // It's targeting someone else
//                     if (Tools.distance(bot, entity) > bot.G.skills.cleave.range) continue // Only attack those in range

//                     // If the target will die to incoming projectiles, ignore it
//                     if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue

//                     // If the target will burn to death, ignore it
//                     if (entity.willBurnToDeath()) continue

//                     targets.push(entity)
//                 }

//                 if (targets.length) {
//                     await bot.cleave()
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { attackLoop() }, cooldown)
//     }
//     attackLoop()

//     async function chargeLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.canUse("charge")) await bot.charge()
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { chargeLoop() }, bot.getCooldown("charge"))
//     }
//     chargeLoop()

//     async function sendItemLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (!merchant) {
//                 setTimeout(async () => { sendItemLoop() }, 10000)
//                 return
//             }

//             const sendTo = bot.players.get(merchant.id)
//             if (sendTo && Tools.distance(bot, sendTo) < Constants.NPC_INTERACTION_DISTANCE) {
//                 const extraGold = bot.gold - PLAYER_GOLD_TO_HOLD
//                 if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
//                 for (let i = 0; i < bot.items.length; i++) {
//                     const item = bot.items[i]
//                     if (!item || WARRIOR_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items
//                     if (item.l == "l") continue // Don't send locked items

//                     if (merchant.isFull()) {
//                         // Can we stack it in the merchant's inventory?
//                         if (item.q == undefined) continue // Item is not stackable
//                         for (const itemPos of merchant.locateItems(item.name)) {
//                             const merchantItem = merchant.items[itemPos]
//                             // Send as many as we can
//                             await bot.sendItem(merchant.id, i, Math.min(item.q, bot.G.items[item.name].s - merchantItem.q))
//                         }
//                     } else {
//                         // The merchant has space, send it over.
//                         await bot.sendItem(merchant.id, i, item.q)
//                     }
//                 }
//             }

//             if (bot.isFull()) {
//                 // See if we can stack any of our items on other players
//                 for (const sendTo of [priest, ranger]) {
//                     if (Tools.distance(bot, sendTo.character) > Constants.NPC_INTERACTION_DISTANCE) continue // Too far away to send items
//                     for (let i = 0; i < bot.items.length; i++) {
//                         const item = bot.items[i]
//                         if (!item || WARRIOR_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items
//                         if (item.l == "l") continue // Don't send locked items
//                         if (item.q == undefined) continue // Item is not stackable
//                         for (const itemPos of sendTo.locateItems(item.name)) {
//                             const sendToItem = sendTo.character.items[itemPos]
//                             // Send as many as we can
//                             await bot.sendItem(sendTo.character.id, i, Math.min(item.q, bot.G.items[item.name].s - sendToItem.q))
//                         }
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { sendItemLoop() }, 1000)
//     }
//     sendItemLoop()

//     async function moveLoop() {
//         let cooldown = 10

//         try {
//             if (bot.socket.disconnected) return

//             // If we are dead, respawn
//             if (bot.rip) {
//                 await bot.respawn()
//                 setTimeout(async () => { moveLoop() }, 1000)
//                 return
//             }

//             // Priority #1: If it's christmas, and we don't have (or are about to run out of) holiday spirit, go get some at the tree
//             if (bot.S && bot.S.holidayseason
//                 && (!bot.s || !bot.s.holidayspirit)) {
//                 await bot.smartMove("newyear_tree", { getWithin: 400 })
//                 setTimeout(async () => { moveLoop() }, 500)
//                 return
//             }

//             // Priority #2: If there are new characters, and we don't have (or are about to run out of newcomersblessing), go to that character and get some
//             if (!bot.s || !bot.s.newcomersblessing || bot.s.newcomersblessing) {
//                 const newcomer = await CharacterModel.findOne({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 120000 }, $expr: { $eq: ["$s.newcomersblessing.f", "$name"] } }).lean().exec()
//                 if (newcomer) {
//                     await bot.smartMove(newcomer, { getWithin: 20 })
//                     await bot.smartMove("newyear_tree", { getWithin: 400 })
//                     setTimeout(async () => { moveLoop() }, 500)
//                     return
//                 }
//             }

//             // Priority #3: Special monsters
//             if (warriorTarget) {
//                 cooldown = await strategy[warriorTarget].move()
//             }

//             if (bot.socket.disconnected) return

//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { moveLoop() }, cooldown)
//     }
//     moveLoop()

//     async function warcryLoop() {
//         try {
//             if (bot.socket.disconnected) return
//             if (bot.canUse("warcry")) await bot.warcry()
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { warcryLoop() }, Math.max(10, bot.getCooldown("warcry")))
//     }
//     warcryLoop()
// }

// async function startMerchant(bot: Merchant) {
//     bot.socket.on("request", (data: { name: string }) => {
//         bot.acceptPartyRequest(data.name)
//     })

//     async function attackLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (!bot.character || bot.rip) {
//                 setTimeout(async () => { attackLoop() }, 1000)
//                 return
//             }

//             if (bot.targets > 0 && bot.canUse("scare")) {
//                 await bot.scare()
//             }

//             if (bot.c.town) {
//                 setTimeout(async () => { attackLoop() }, 10)
//                 return
//             }

//             if (bot.canUse("attack")) {
//                 let target: MonsterData
//                 for (const [, entity] of bot.entities) {
//                     if (!(["hen", "rooster"] as MonsterName[]).includes(entity.type)) continue // We only want to target these for Halloween
//                     if (Tools.distance(bot, entity) > bot.range) continue // We're too far away to attack

//                     target = entity
//                     break
//                 }

//                 if (target) {
//                     await bot.basicAttack(target.id)
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { attackLoop() }, 250)
//     }
//     attackLoop()

//     async function craftLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.esize > 5) {
//                 // We have enough empy slots
//                 if (bot.canCraft("pouchbow")) await bot.craft("pouchbow")
//                 if (bot.hasItem("smoke") && bot.canBuy("bow")) {
//                     // We have smoke, and we can buy the bow, let's do that and make a pouchbow
//                     await bot.buy("bow")
//                     await bot.craft("pouchbow")
//                 }

//                 if (bot.canCraft("basketofeggs")) await bot.craft("basketofeggs")
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { craftLoop() }, 250)
//     }
//     craftLoop()

//     async function emoteLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             bot.socket.emit("emotion", { name: "drop_egg" })
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { emoteLoop() }, 2000 + Math.min(...bot.pings))
//     }
//     emoteLoop()

//     async function mluckLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             if (bot.canUse("mluck")) {
//                 if (!bot.s.mluck || bot.s.mluck.f !== bot.id) await bot.mluck(bot.id) // mluck ourselves

//                 for (const [, player] of bot.players) {
//                     if (Tools.distance(bot, player) > bot.G.skills.mluck.range) continue // Too far away to mluck
//                     if (player.npc) continue // It's an NPC, we can't mluck NPCs.

//                     if (!player.s.mluck) {
//                         await bot.mluck(player.id) // Give the mluck 
//                     } else if (!player.s.mluck.strong && player.s.mluck.f !== bot.id) {
//                         await bot.mluck(player.id) // Steal the mluck
//                     } else if ((!player.s.mluck.strong && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))
//                         || (player.s.mluck.strong && player.s.mluck.f == bot.id && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))) {
//                         await bot.mluck(player.id) // Extend the mluck
//                     }
//                 }
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { mluckLoop() }, 250)
//     }
//     mluckLoop()

//     let lastBankVisit = Number.MIN_VALUE
//     let lastSpecialCheckTime = Number.MIN_VALUE
//     async function moveLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             // If we are dead, respawn
//             if (bot.rip) {
//                 await bot.respawn()
//                 setTimeout(async () => { moveLoop() }, 1000)
//                 return
//             }

//             // If we are full, let's go to the bank
//             let freeSlots = 0
//             for (const item of bot.items) {
//                 if (!item) freeSlots++
//             }
//             if (freeSlots == 0 || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
//                 await bot.closeMerchantStand()
//                 await bot.smartMove("items1")

//                 lastBankVisit = Date.now()

//                 // Deposit excess gold
//                 const excessGold = bot.gold - MERCHANT_GOLD_TO_HOLD
//                 if (excessGold > 0) {
//                     await bot.depositGold(excessGold)
//                 } else if (excessGold < 0) {
//                     await bot.withdrawGold(-excessGold)
//                 }

//                 // Deposit items
//                 for (let i = 0; i < bot.items.length; i++) {
//                     const item = bot.items[i]
//                     if (!item) continue
//                     if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name) /* We don't want to hold on to it */
//                         || item.v) /* Item is PvP marked */ {
//                         // Deposit it in the bank
//                         try {
//                             await bot.depositItem(i)
//                         } catch (e) {
//                             console.error(e)
//                         }
//                     }
//                 }

//                 // Store information about everything in our bank to use it later to find upgradable stuff
//                 const bankItems: ItemInfo[] = []
//                 for (let i = 0; i <= 7; i++) {
//                     const bankPack = `items${i}` as Exclude<BankPackType, "gold">
//                     for (const item of bot.bank[bankPack]) {
//                         bankItems.push(item)
//                     }
//                 }
//                 let freeSpaces = bot.esize
//                 const duplicates = bot.locateDuplicateItems(bankItems)

//                 // Withdraw compoundable & upgradable things
//                 for (const iN in duplicates) {
//                     const itemName = iN as ItemName
//                     const d = duplicates[itemName]
//                     const gInfo = bot.G.items[itemName]
//                     if (gInfo.upgrade) {
//                         // Withdraw upgradable items
//                         if (freeSpaces < 3) break // Not enough space in inventory

//                         const pack1 = `items${Math.floor((d[0]) / 42)}` as Exclude<BankPackType, "gold">
//                         const slot1 = d[0] % 42
//                         let withdrew = false
//                         for (let i = 1; i < d.length && freeSpaces > 2; i++) {
//                             const pack2 = `items${Math.floor((d[i]) / 42)}` as Exclude<BankPackType, "gold">
//                             const slot2 = d[i] % 42
//                             const item2 = bot.bank[pack2][slot2]
//                             const level0Grade = gInfo.grades.lastIndexOf(0) + 1

//                             if (item2.level >= 9 - level0Grade) continue // We don't want to upgrade high level items automatically

//                             try {
//                                 await bot.withdrawItem(pack2, slot2)
//                                 withdrew = true
//                                 freeSpaces--
//                             } catch (e) {
//                                 console.error(e)
//                             }
//                         }
//                         if (withdrew) {
//                             try {
//                                 await bot.withdrawItem(pack1, slot1)
//                                 freeSpaces--
//                             } catch (e) {
//                                 console.error(e)
//                             }
//                         }
//                     } else if (gInfo.compound) {
//                         // Withdraw compoundable items
//                         if (freeSpaces < 5) break // Not enough space in inventory
//                         if (d.length < 3) continue // Not enough to compound

//                         for (let i = 0; i < d.length - 2 && freeSpaces > 4; i++) {
//                             const pack1 = `items${Math.floor((d[i]) / 42)}` as Exclude<BankPackType, "gold">
//                             const slot1 = d[i] % 42
//                             const item1 = bot.bank[pack1][slot1]
//                             const pack2 = `items${Math.floor((d[i + 1]) / 42)}` as Exclude<BankPackType, "gold">
//                             const slot2 = d[i + 1] % 42
//                             const item2 = bot.bank[pack2][slot2]
//                             const pack3 = `items${Math.floor((d[i + 2]) / 42)}` as Exclude<BankPackType, "gold">
//                             const slot3 = d[i + 2] % 42
//                             const item3 = bot.bank[pack3][slot3]

//                             const level0Grade = gInfo.grades.lastIndexOf(0) + 1
//                             if (item1.level >= 4 - level0Grade) continue // We don't want to comopound high level items automaticaclly
//                             if (item1.level !== item2.level) continue
//                             if (item1.level !== item3.level) continue

//                             // Withdraw the three items
//                             try {
//                                 await bot.withdrawItem(pack1, slot1)
//                                 freeSpaces--
//                                 await bot.withdrawItem(pack2, slot2)
//                                 freeSpaces--
//                                 await bot.withdrawItem(pack3, slot3)
//                                 freeSpaces--
//                             } catch (e) {
//                                 console.error(e)
//                             }

//                             // Remove the three items from the array
//                             d.splice(i, 3)
//                             i = i - 1
//                             break
//                         }
//                     }
//                 }

//                 // Withdraw exchangable items
//                 for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
//                     const item = bankItems[i]
//                     if (!item) continue // No item

//                     if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Not exchangable

//                     const gInfo = bot.G.items[item.name]
//                     if (item.q < gInfo.e) continue // Not enough to exchange

//                     // Withdraw the item
//                     const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackType, "gold">
//                     const slot = i % 42
//                     await bot.withdrawItem(pack, slot)
//                     freeSpaces--
//                 }

//                 // Withdraw things we want to hold
//                 // TODO: improve to stack items that are stackable
//                 for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
//                     const item = bankItems[i]
//                     if (!item) continue // No item

//                     if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name)) continue // We don't want to hold this item
//                     if (bot.hasItem(item.name)) continue // We are already holding one of these items

//                     const pack = `items${Math.floor(i / 42)}` as Exclude<BankPackType, "gold">
//                     const slot = i % 42
//                     bot.withdrawItem(pack, slot)
//                     freeSpaces--
//                 }

//                 setTimeout(async () => { moveLoop() }, 250)
//                 return
//             }

//             // Check for special monsters every 15 minutes
//             if (lastSpecialCheckTime < Date.now() - 900000) {
//                 await bot.closeMerchantStand()
//                 const locations: NodeData[] = []
//                 //locations.push(...bot.locateMonsters("skeletor"))
//                 locations.push(...bot.locateMonsters("mvampire")) // Also checks goldenbat and dragold
//                 locations.push(...bot.locateMonsters("fvampire"))
//                 locations.push(...bot.locateMonsters("greenjr")) // Mostly checks tinyp, too
//                 locations.push(...bot.locateMonsters("jr"))

//                 for (const location of locations) {
//                     console.log(location)
//                     await bot.smartMove(location, { getWithin: 400 })
//                     lastSpecialCheckTime = Date.now()
//                 }
//             }

//             // Move to our friends if they have lots of items (they'll send them over)
//             for (const friend of [priest, ranger, warrior]) {
//                 if (!friend) continue

//                 // Check if friend is full, or needs mluck
//                 if (friend.character.esize < 10 || (bot.canUse("mluck") && (!friend.character.s.mluck || friend.character.s.mluck.ms < 120000 || friend.character.s.mluck.f !== bot.id))) {
//                     if (Tools.distance(bot, friend.character) > bot.G.skills.mluck.range) {
//                         await bot.closeMerchantStand()
//                         console.log(`[merchant] We are moving to ${friend.character.id}!`)
//                         await bot.smartMove(friend.character, { getWithin: bot.G.skills.mluck.range / 2 })
//                     }

//                     setTimeout(async () => { moveLoop() }, 250)
//                     return
//                 }
//             }

//             // MLuck people if there is a server info target
//             for (const mN in bot.S) {
//                 const type = mN as MonsterName
//                 if (!bot.S[type].live) continue
//                 if (!bot.S[type].target) continue

//                 if (Tools.distance(bot, bot.S[type]) > 100) {
//                     await bot.closeMerchantStand()
//                     await bot.smartMove(bot.S[type], { getWithin: 100 })
//                 }

//                 setTimeout(async () => { moveLoop() }, 250)
//                 return
//             }

//             // Find other characters that need mluck and go find them
//             if (bot.canUse("mluck")) {
//                 const charactersToMluck = await CharacterModel.find({ serverRegion: bot.server.region, serverIdentifier: bot.server.name, lastSeen: { $gt: Date.now() - 120000 }, $or: [{ "s.mluck": undefined }, { "s.mluck.strong": undefined, "s.mluck.f": { "$ne": bot.id } }] }).lean().exec()
//                 for (const character of charactersToMluck) {
//                     // Move to them, and we'll automatically mluck them
//                     if (Tools.distance(bot, character) > bot.G.skills.mluck.range) {
//                         await bot.closeMerchantStand()
//                         console.log(`[merchant] We are moving to ${character.name} to mluck them!`)
//                         await bot.smartMove(character, { getWithin: bot.G.skills.mluck.range / 2 })
//                     }

//                     setTimeout(async () => { moveLoop() }, 250)
//                     return
//                 }
//             }

//             // Go fishing if we can
//             if (bot.getCooldown("fishing") == 0 /* Fishing is available */
//                 && (bot.hasItem("rod") || bot.isEquipped("rod")) /* We have a rod */) {
//                 merchant.closeMerchantStand()
//                 await bot.smartMove({ map: "main", x: -1368, y: 0 }) // Move to fishing sppot
//                 if (bot.slots.offhand) await bot.unequip("offhand")
//                 if (bot.slots.mainhand) await bot.unequip("mainhand")
//                 await bot.equip(bot.locateItem("rod"))
//                 await bot.fish()
//                 await bot.unequip("mainhand")
//                 if (bot.hasItem("dartgun")) await bot.equip(bot.locateItem("dartgun"))
//                 if (bot.hasItem("wbook1")) await bot.equip(bot.locateItem("wbook1"))
//             }

//             // Go mining if we can
//             if (merchant.getCooldown("mining") == 0 /* Mining is available */
//                 && (merchant.hasItem("pickaxe") || merchant.isEquipped("pickaxe")) /* We have a pickaxe */) {
//                 merchant.closeMerchantStand()
//                 await bot.smartMove({ map: "tunnel", x: -280, y: -10 }) // Move to mining sppot
//                 if (bot.slots.offhand) await bot.unequip("offhand")
//                 if (bot.slots.mainhand) await bot.unequip("mainhand")
//                 await bot.equip(bot.locateItem("pickaxe"))
//                 await bot.mine()
//                 await bot.unequip("mainhand")
//                 if (bot.hasItem("dartgun")) await bot.equip(bot.locateItem("dartgun"))
//                 if (bot.hasItem("wbook1")) await bot.equip(bot.locateItem("wbook1"))
//             }

//             // Hang out in town
//             await bot.smartMove("main")
//             await bot.openMerchantStand()
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { moveLoop() }, 250)
//     }
//     moveLoop()

//     async function tradeLoop() {
//         try {
//             if (bot.socket.disconnected) return

//             const mhTokens = bot.locateItem("monstertoken")
//             if (mhTokens !== undefined && bot.stand) {
//                 if (bot.slots.trade1) await bot.unequip("trade1")

//                 const numTokens = bot.items[mhTokens].q

//                 await bot.listForSale(mhTokens, "trade1", 250000, numTokens)
//             }
//         } catch (e) {
//             console.error(e)
//         }

//         setTimeout(async () => { tradeLoop() }, 250)
//     }
//     tradeLoop()
// }

// async function run(rangerName: string, warriorName: string, priestName: string, merchantNames: string[]) {
//     await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

//     try {
//         const loopRanger = async () => {
//             try {
//                 await Game.stopCharacter(rangerName)
//                 ranger = await Game.startRanger(rangerName, region, identifier)
//                 ranger.socket.on("disconnect", async () => { await loopRanger() })
//                 startRanger(ranger)
//                 generalBotStuff(ranger)
//             } catch (e) {
//                 await Game.stopCharacter(rangerName)
//                 setTimeout(async () => { await loopRanger() }, 1000)
//             }
//         }
//         const loopWarrior = async () => {
//             try {
//                 await Game.stopCharacter(warriorName)
//                 warrior = await Game.startWarrior(warriorName, region, identifier)
//                 warrior.socket.on("disconnect", async () => { await loopWarrior() })
//                 startWarrior(warrior)
//                 generalBotStuff(warrior)
//             } catch (e) {
//                 await Game.stopCharacter(warriorName)
//                 setTimeout(async () => { await loopWarrior() }, 1000)
//             }
//         }
//         const loopPriest = async () => {
//             try {
//                 await Game.stopCharacter(priestName)
//                 priest = await Game.startPriest(priestName, region, identifier)
//                 priest.socket.on("disconnect", async () => { await loopPriest() })
//                 startPriest(priest)
//                 generalBotStuff(priest)
//             } catch (e) {
//                 await Game.stopCharacter(priestName)
//                 setTimeout(async () => { await loopPriest() }, 1000)
//             }
//         }
//         const loopMerchant = async () => {
//             try {
//                 for (const merchantName of merchantNames) {
//                     await Game.stopCharacter(merchantName)
//                 }
//                 if (region == DEFAULT_REGION && identifier == DEFAULT_IDENTIFIER) {
//                     // Use the first merchant for our default (so we keep fishing)
//                     merchant = await Game.startMerchant(merchantNames[0], region, identifier)
//                 } else {
//                     // Use the second merchant for others
//                     merchant = await Game.startMerchant(merchantNames[1], region, identifier)
//                 }
//                 merchant.socket.on("disconnect", async () => { await loopMerchant() })
//                 startMerchant(merchant)
//                 generalBotStuff(merchant)
//             } catch (e) {
//                 await Game.stopCharacter(merchantNames[0])
//                 setTimeout(async () => { await loopMerchant() }, 1000)
//             }
//         }

//         let lastServerChangeTime = Date.now()
//         const serverLoop = async () => {
//             try {
//                 if (lastServerChangeTime > Date.now() - 120000) {
//                     // Don't change servers too fast
//                     setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime - Date.now() - 120000))
//                     return
//                 }
//                 if (!ranger) {
//                     // We haven't logged in yet?
//                     setTimeout(async () => { serverLoop() }, 1000)
//                     return
//                 }
//                 if (SPECIAL_MONSTERS.includes(rangerTarget)) {
//                     // We're currently attacking something special, don't change servers.
//                     setTimeout(async () => { serverLoop() }, 1000)
//                     return
//                 }

//                 const currentRegion = ranger.server.region
//                 const currentIdentifier = ranger.server.name
//                 const G = ranger.G


//                 // Priority #1: Special co-op monsters that take a team effort
//                 const coop: MonsterName[] = [
//                     "dragold", "grinch", "mrgreen", "mrpumpkin", "franky"
//                 ]
//                 const coopEntities: IEntity[] = await EntityModel.aggregate([
//                     {
//                         $match: {
//                             type: { $in: coop },
//                             target: { $ne: undefined }, // We only want to do these if others are doing them, too.
//                             serverIdentifier: { $nin: ["PVP"] },
//                             lastSeen: { $gt: Date.now() - 30000 }
//                         }
//                     },
//                     { $addFields: { __order: { $indexOfArray: [coop, "$type"] } } },
//                     { $sort: { "__order": 1, "hp": 1 } }]).exec()
//                 for (const entity of coopEntities) {
//                     if (currentRegion == entity.serverRegion && currentIdentifier == entity.serverIdentifier) {
//                         // We're already on the correct server
//                         setTimeout(async () => { serverLoop() }, 1000)
//                         return
//                     }

//                     // Change servers to attack this entity
//                     region = entity.serverRegion
//                     identifier = entity.serverIdentifier
//                     console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${region} ${identifier}`)

//                     // Loot all of our remaining chests
//                     await sleep(1000)
//                     for (const [, chest] of ranger.chests) await ranger.openChest(chest.id)
//                     await sleep(1000)

//                     await Game.disconnect(false)
//                     await sleep(5000)
//                     lastServerChangeTime = Date.now()
//                     setTimeout(async () => { serverLoop() }, 1000)
//                     return
//                 }

//                 // Priority #2: Special monsters that we can defeat by ourselves
//                 const solo: MonsterName[] = [
//                     // Very Rare Monsters
//                     "goldenbat", "tinyp", "cutebee",
//                     // Event Monsters
//                     "pinkgoo", "wabbit",
//                     // // Rare Monsters
//                     "greenjr", "jr", "skeletor", "mvampire", "fvampire", "snowman"
//                 ]
//                 const soloEntities: IEntity[] = await EntityModel.aggregate([
//                     {
//                         $match: {
//                             type: { $in: solo },
//                             serverIdentifier: { $nin: ["PVP"] },
//                             lastSeen: { $gt: Date.now() - 30000 }
//                         }
//                     },
//                     { $addFields: { __order: { $indexOfArray: [solo, "$type"] } } },
//                     { $sort: { "__order": 1, "hp": 1 } }]).exec()
//                 for (const entity of soloEntities) {
//                     if ((currentRegion == entity.serverRegion && currentIdentifier == entity.serverIdentifier) // We're already on the correct server
//                         || (!G.monsters[entity.type].cooperative && entity.target)) // The target isn't cooperative, and someone is already attacking it
//                     {
//                         setTimeout(async () => { serverLoop() }, 1000)
//                         return
//                     }

//                     // Change servers to attack this entity
//                     region = entity.serverRegion
//                     identifier = entity.serverIdentifier
//                     console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${region} ${identifier}`)

//                     // Loot all of our remaining chests
//                     await sleep(1000)
//                     for (const [, chest] of ranger.chests) await ranger.openChest(chest.id)
//                     await sleep(1000)

//                     await Game.disconnect(false)
//                     await sleep(5000)
//                     lastServerChangeTime = Date.now()
//                     setTimeout(async () => { serverLoop() }, 1000)
//                     return
//                 }

//                 // Priority #3: Default Server
//                 if (currentRegion !== DEFAULT_REGION || currentIdentifier !== DEFAULT_IDENTIFIER) {
//                     // Change servers to attack this entity
//                     region = DEFAULT_REGION
//                     identifier = DEFAULT_IDENTIFIER
//                     console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${region} ${identifier}`)

//                     // Loot all of our remaining chests
//                     await sleep(1000)
//                     for (const [, chest] of ranger.chests) await ranger.openChest(chest.id)
//                     await sleep(1000)

//                     await Game.disconnect(false)
//                     await sleep(5000)
//                     lastServerChangeTime = Date.now()
//                     setTimeout(async () => { serverLoop() }, 1000)
//                     return
//                 }
//             } catch (e) {
//                 console.error(e)
//             }

//             setTimeout(async () => { serverLoop() }, 1000)
//         }
//         serverLoop()

//         await loopRanger()
//         await loopWarrior()
//         await loopPriest()
//         await loopMerchant()
//     } catch (e) {
//         await Game.disconnect()
//     }
// }
// run("earthiverse", "earthWar", "earthPri", ["earthMer", "earthMer2"])