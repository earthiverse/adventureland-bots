import AL, { Tools } from "alclient-mongo"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startCompoundLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpgradeLoop, startAvoidStacking, startReconnectLoop, LOOP_MS } from "../base/general.js"
import { MERCHANT_GOLD_TO_HOLD, MERCHANT_ITEMS_TO_HOLD, startMluckLoop } from "../base/merchant.js"
import { startChargeLoop, startWarcryLoop } from "../base/warrior.js"
import { partyLeader, partyMembers } from "./party.js"

/** Config */
const merchantName = "earthMer"
const warrior1Name = "earthWar"
const warrior2Name = "earthWar2"
const warrior3Name = "earthWar3"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"
const target: AL.MonsterName = "bee"
const defaultLocation: AL.IPosition = { map: "main", x: 152, y: 1487 } // bees

let merchant: AL.Merchant
let warrior1: AL.Warrior
let warrior2: AL.Warrior
let warrior3: AL.Warrior

async function startShared(bot: AL.Character) {
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader, partyMembers)
    startSellLoop(bot)

    if (bot.ctype !== "merchant") {
        startSendStuffDenylistLoop(bot, merchant)
    }

    startUpgradeLoop(bot)
}

async function startWarrior(bot: AL.Warrior, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }

            if (bot.canUse("attack")) {
                for (const [, entity] of bot.entities) {
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far away
                    if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id, warrior3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                    if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                    if (entity.willBurnToDeath()) continue // Will burn to death shortly

                    if (bot.canKillInOneShot(entity)) {
                        for (const friend of [merchant, warrior1, warrior2, warrior3]) {
                            if (!friend) continue
                            friend.entities.delete(entity.id)
                        }
                    }

                    await bot.basicAttack(entity.id)

                    // Move to the next entity if we're gonna kill it
                    if (bot.canKillInOneShot(entity)) {
                        let closest: AL.Entity
                        let distance = Number.MAX_VALUE
                        for (const [, entity] of bot.entities) {
                            if (entity.type !== target) continue // Only attack our target
                            if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                            if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id, warrior3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                            if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                            if (entity.willBurnToDeath()) continue // Will burn to death shortly

                            const d = Tools.distance(bot, entity)
                            if (d < distance) {
                                closest = entity
                                distance = d
                            }
                        }

                        if (closest && Tools.distance(bot, closest) > bot.range) {
                            bot.smartMove(closest, { getWithin: bot.range / 2 }).catch(() => { /* suppress warnings */ })
                        }
                    }
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack"))))
    }
    attackLoop()

    startAvoidStacking(bot)
    startChargeLoop(bot)

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) {
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            await goToPoitonSellerIfLow(bot)
            await goToNPCShopIfFull(bot)

            let closest: AL.Entity
            let distance = Number.MAX_VALUE
            for (const [, entity] of bot.entities) {
                if (entity.type !== target) continue // Only attack our target
                if (!AL.Pathfinder.canWalkPath(bot, entity)) continue // Can't simply walk to entity
                if (entity.cooperative !== true && entity.target && ![warrior1?.id, warrior2?.id, warrior3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                if (entity.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Possibly gonna die
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                const d = Tools.distance(bot, entity)
                if (d < distance) {
                    closest = entity
                    distance = d
                }
            }

            if (!closest) {
                const destination: AL.IPosition = { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }
                if (AL.Tools.distance(bot, destination) > 1) await bot.smartMove(destination)
            } else if (Tools.distance(bot, closest) > bot.range) {
                bot.smartMove(closest, { getWithin: bot.range / 2 }).catch(() => { /* suppress warnings */ })
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()

    startWarcryLoop(bot)
}

async function startMerchant(merchant: AL.Merchant) {
    startPartyLoop(merchant, merchant.id) // Let anyone who wants to party with me do so

    startMluckLoop(merchant)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (merchant.socket.disconnected) {
                merchant.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // If we are dead, respawn
            if (merchant.rip) {
                await merchant.respawn()
                merchant.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 1000))
                return
            }

            // If we are full, let's go to the bank
            if (merchant.isFull() || lastBankVisit < Date.now() - 120000 || merchant.hasPvPMarkedItem()) {
                await merchant.closeMerchantStand()
                await merchant.smartMove("items1")

                lastBankVisit = Date.now()

                // Deposit excess gold
                const excessGold = merchant.gold - MERCHANT_GOLD_TO_HOLD
                if (excessGold > 0) {
                    await merchant.depositGold(excessGold)
                } else if (excessGold < 0) {
                    await merchant.withdrawGold(-excessGold)
                }

                // Deposit items
                for (let i = 0; i < merchant.items.length; i++) {
                    const item = merchant.items[i]
                    if (!item) continue
                    if (!MERCHANT_ITEMS_TO_HOLD.has(item.name) /* We don't want to hold on to it */
                        || item.v) /* Item is PvP marked */ {
                        // Deposit it in the bank
                        try {
                            await merchant.depositItem(i)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                }

                // Store information about everything in our bank to use it later to find upgradable stuff
                const bankItems: AL.ItemData[] = []
                for (let i = 0; i <= 7; i++) {
                    const bankPack = `items${i}` as Exclude<AL.BankPackName, "gold">
                    if (!merchant?.bank[bankPack]) continue // This bank slot isn't available
                    for (const item of merchant.bank[bankPack]) {
                        bankItems.push(item)
                    }
                }
                let freeSpaces = merchant.esize
                const duplicates = merchant.locateDuplicateItems(bankItems)

                // Withdraw compoundable & upgradable things
                for (const iN in duplicates) {
                    const itemName = iN as AL.ItemName
                    const d = duplicates[itemName]
                    const gInfo = merchant.G.items[itemName]
                    if (gInfo.upgrade) {
                        // Withdraw upgradable items
                        if (freeSpaces < 3) break // Not enough space in inventory

                        const pack1 = `items${Math.floor((d[0]) / 42)}` as Exclude<AL.BankPackName, "gold">
                        const slot1 = d[0] % 42
                        let withdrew = false
                        for (let i = 1; i < d.length && freeSpaces > 2; i++) {
                            const pack2 = `items${Math.floor((d[i]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot2 = d[i] % 42
                            const item2 = merchant.bank[pack2][slot2]
                            const level0Grade = gInfo.grades.lastIndexOf(0) + 1

                            if (item2.level >= 9 - level0Grade) continue // We don't want to upgrade high level items automatically

                            try {
                                await merchant.withdrawItem(pack2, slot2)
                                withdrew = true
                                freeSpaces--
                            } catch (e) {
                                console.error(e)
                            }
                        }
                        if (withdrew) {
                            try {
                                await merchant.withdrawItem(pack1, slot1)
                                freeSpaces--
                            } catch (e) {
                                console.error(e)
                            }
                        }
                    } else if (gInfo.compound) {
                        // Withdraw compoundable items
                        if (freeSpaces < 5) break // Not enough space in inventory
                        if (d.length < 3) continue // Not enough to compound

                        for (let i = 0; i < d.length - 2 && freeSpaces > 4; i++) {
                            const pack1 = `items${Math.floor((d[i]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot1 = d[i] % 42
                            const item1 = merchant.bank[pack1][slot1]
                            const pack2 = `items${Math.floor((d[i + 1]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot2 = d[i + 1] % 42
                            const item2 = merchant.bank[pack2][slot2]
                            const pack3 = `items${Math.floor((d[i + 2]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot3 = d[i + 2] % 42
                            const item3 = merchant.bank[pack3][slot3]

                            const level0Grade = gInfo.grades.lastIndexOf(0) + 1
                            if (item1.level >= 4 - level0Grade) continue // We don't want to comopound high level items automaticaclly
                            if (item1.level !== item2.level) continue
                            if (item1.level !== item3.level) continue

                            // Withdraw the three items
                            try {
                                await merchant.withdrawItem(pack1, slot1)
                                freeSpaces--
                                await merchant.withdrawItem(pack2, slot2)
                                freeSpaces--
                                await merchant.withdrawItem(pack3, slot3)
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

                // Withdraw things we want to hold
                // TODO: improve to stack items that are stackable
                for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
                    const item = bankItems[i]
                    if (!item) continue // No item

                    if (!MERCHANT_ITEMS_TO_HOLD.has(item.name)) continue // We don't want to hold this item
                    if (merchant.hasItem(item.name)) continue // We are already holding one of these items

                    const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
                    const slot = i % 42
                    merchant.withdrawItem(pack, slot)
                    freeSpaces--
                }

                merchant.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // MLuck people if there is a server info target
            for (const mN in merchant.S) {
                const type = mN as AL.MonsterName
                if (merchant.S[type].live) continue
                if (!(merchant.S[type] as AL.ServerInfoDataLive).target) continue

                if (AL.Tools.distance(merchant, (merchant.S[type] as AL.ServerInfoDataLive)) > 100) {
                    await merchant.closeMerchantStand()
                    await merchant.smartMove((merchant.S[type] as AL.ServerInfoDataLive), { getWithin: 100 })
                }

                merchant.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                return
            }

            // mluck our friends
            if (merchant.canUse("mluck")) {
                for (const friend of [warrior1, warrior2, warrior3]) {
                    if (!friend) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(merchant, friend) > merchant.G.skills.mluck.range) {
                            await merchant.closeMerchantStand()
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await merchant.smartMove(friend, { getWithin: merchant.G.skills.mluck.range / 2 })
                        }

                        merchant.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
                        return
                    }
                }
            }

            // Go fishing if we can
            if (merchant.getCooldown("fishing") == 0 /* Fishing is available */
                && (merchant.hasItem("rod") || merchant.isEquipped("rod")) /* We have a rod */) {
                let wasEquippedMainhand = merchant.slots.mainhand
                let wasEquippedOffhand = merchant.slots.offhand
                if (wasEquippedOffhand) await merchant.unequip("offhand") // rod is a 2-handed weapon, so we need to unequip our offhand if we have something equipped
                else if (merchant.hasItem("wbook1")) wasEquippedOffhand = { name: "wbook1" } // We want to equip a wbook1 by default if we have one after we go fishing
                if (wasEquippedMainhand) {
                    if (wasEquippedMainhand.name !== "rod") {
                        // We didn't have a rod equipped before, let's equip one now
                        await merchant.unequip("mainhand")
                        await merchant.equip(merchant.locateItem("rod"))
                    }
                } else {
                    // We didn't have anything equipped before
                    if (merchant.hasItem("dartgun")) wasEquippedMainhand = { name: "dartgun" } // We want to equip a dartgun by default if we have one after we go fishing
                    await merchant.equip(merchant.locateItem("rod")) // Equip the rod
                }
                merchant.closeMerchantStand()
                await merchant.smartMove({ map: "main", x: -1368, y: 0 }) // Move to fishing sppot
                await merchant.fish()
                if (wasEquippedMainhand) await merchant.equip(merchant.locateItem(wasEquippedMainhand.name))
                if (wasEquippedOffhand) await merchant.equip(merchant.locateItem(wasEquippedOffhand.name))
            }

            // Go mining if we can
            if (merchant.getCooldown("mining") == 0 /* Mining is available */
                && (merchant.hasItem("pickaxe") || merchant.isEquipped("pickaxe")) /* We have a pickaxe */) {
                let wasEquippedMainhand = merchant.slots.mainhand
                let wasEquippedOffhand = merchant.slots.offhand
                if (wasEquippedOffhand) await merchant.unequip("offhand") // pickaxe is a 2-handed weapon, so we need to unequip our offhand if we have something equipped
                else if (merchant.hasItem("wbook1")) wasEquippedOffhand = { name: "wbook1" } // We want to equip a wbook1 by default if we have one after we go mining
                if (wasEquippedMainhand) {
                    if (wasEquippedMainhand.name !== "pickaxe") {
                        // We didn't have a pickaxe equipped before, let's equip one now
                        await merchant.unequip("mainhand")
                        await merchant.equip(merchant.locateItem("pickaxe"))
                    }
                } else {
                    // We didn't have anything equipped before
                    if (merchant.hasItem("dartgun")) wasEquippedMainhand = { name: "dartgun" } // We want to equip a dartgun by default if we have one after we go mining
                    await merchant.equip(merchant.locateItem("pickaxe")) // Equip the pickaxe
                }
                merchant.closeMerchantStand()
                await merchant.smartMove({ map: "tunnel", x: -280, y: -10 }) // Move to mining sppot
                await merchant.mine()
                if (wasEquippedMainhand) await merchant.equip(merchant.locateItem(wasEquippedMainhand.name))
                if (wasEquippedOffhand) await merchant.equip(merchant.locateItem(wasEquippedOffhand.name))
            }

            // Hang out in town
            await merchant.smartMove("main")
            await merchant.openMerchantStand()
        } catch (e) {
            console.error(e)
        }

        merchant.timeouts.set("moveloop", setTimeout(async () => { moveLoop() }, 250))
    }
    moveLoop()
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const warrior1P = AL.Game.startWarrior(warrior1Name, region, identifier)
    const warrior2P = AL.Game.startWarrior(warrior2Name, region, identifier)
    const warrior3P = AL.Game.startWarrior(warrior3Name, region, identifier)
    merchant = await merchantP
    warrior1 = await warrior1P
    warrior2 = await warrior2P
    // rogue = await rogueP
    warrior3 = await warrior3P

    // Start the characters
    startShared(merchant)
    startMerchant(merchant)

    startShared(warrior1)
    startWarrior(warrior1)
    startTrackerLoop(warrior1)

    startShared(warrior2)
    startWarrior(warrior2, { x: -20, y: 0 })

    startShared(warrior3)
    startWarrior(warrior3, { x: 20, y: 0 })
}
run()