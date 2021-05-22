import AL from "alclient-mongo"
import { goToPoitonSellerIfLow, goToNPCShopIfFull, startBuyLoop, startCompoundLoop, startConnectLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpdateLoop, startUpgradeLoop, startBuyToUpgradeLoop } from "./base/general.js"
import { startMluckLoop } from "./base/merchant.js"

/** Config */
const partyLeader = "earthMer"
const merchantName = "earthMer"
const mage1Name = "earthMag"
const mage2Name = "earthMag2"
const mage3Name = "earthMag3"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "III"
const defaultLocation: AL.IPosition = { map: "halloween", x: 346.5, y: -747 } // Snakes in Halloween

let merchant: AL.Merchant
let mage1: AL.Mage
let mage2: AL.Mage
let mage3: AL.Mage

const ITEMS_TO_BUY: AL.ItemName[] = [
    "intring", "intearring",
    "wbook0", "wbook1",
    "wand", "pinkie",
    "ornamentstaff"
]

const MERCHANT_GOLD_TO_HOLD = 100_000_000
const MERCHANT_ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0", "xptome",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll",
    // Pickaxe and fishing rod
    "pickaxe", "rod",
    // Main Items
    "dartgun", "wbook1",

    // TEMP: For crafting pouchbows
    "smoke",

    // TEMP: For crafting eggbaskets
    "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8"
]

const BOT_GOLD_TO_HOLD = 2_000_000
const BOT_ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "xptome",

    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1"
]

async function startShared(bot: AL.Character) {
    startBuyLoop(bot, ITEMS_TO_BUY)
    startCompoundLoop(bot)
    startConnectLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, partyLeader)
    startSellLoop(bot)

    if (bot.ctype !== "merchant") {
        startSendStuffDenylistLoop(bot, merchant, BOT_ITEMS_TO_HOLD, BOT_GOLD_TO_HOLD)
    }

    if (bot.id == mage1Name) {
        startTrackerLoop(bot)
    }

    startUpdateLoop(bot)
    startUpgradeLoop(bot)
}

async function startMage(mage: AL.Mage, positionOffset: { x: number, y: number } = { x: 0, y: 0 }) {
    async function attackLoop() {
        try {
            if (mage.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            if (mage.canUse("attack")) {
                for (const [, entity] of mage.entities) {
                    if (AL.Tools.distance(mage, entity) > mage.range) continue // Too far away
                    if (entity.cooperative !== true && entity.target && ![mage1?.id, mage2?.id, mage3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                    if (entity.couldDieToProjectiles(mage.projectiles, mage.players, mage.entities)) continue // Possibly gonna die
                    if (entity.willBurnToDeath()) continue // Will burn to death shortly

                    if (mage.canKillInOneShot(entity)) {
                        for (const friend of [merchant, mage1, mage2, mage3]) {
                            if (!friend) continue
                            friend.entities.delete(entity.id)
                        }
                    }

                    // Energize for more DPS
                    if (!mage.s.energized) {
                        for (const friend of [mage1, mage2, mage3]) {
                            if (friend.socket.disconnected) continue // Friend is disconnected
                            if (friend.id == mage.id) continue // Can't energize ourselves
                            if (AL.Tools.distance(mage, friend) > mage.G.skills.energize.range) continue // Too far away
                            if (!friend.canUse("energize")) continue // Friend can't use energize

                            // Energize!
                            friend.energize(mage.id)
                            break
                        }
                    }

                    await mage.basicAttack(entity.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, mage.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (mage.socket.disconnected) {
                setTimeout(async () => { moveLoop() }, 10)
                return
            }

            // If we are dead, respawn
            if (mage.rip) {
                await mage.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            await goToPoitonSellerIfLow(mage)
            await goToNPCShopIfFull(mage)

            const destination: AL.IPosition = { map: defaultLocation.map, x: defaultLocation.x + positionOffset.x, y: defaultLocation.y + positionOffset.y }
            if (AL.Tools.distance(mage, destination) > 1) await mage.smartMove(destination)
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()
}

async function startMerchant(merchant: AL.Merchant) {
    startPartyLoop(merchant, merchant.id) // Let anyone who wants to party with me do so

    startBuyToUpgradeLoop(merchant, "wand", 5)

    startMluckLoop(merchant)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (merchant.socket.disconnected) {
                setTimeout(async () => { moveLoop() }, 10)
                return
            }

            // If we are dead, respawn
            if (merchant.rip) {
                await merchant.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
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
                    if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name) /* We don't want to hold on to it */
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

                    if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name)) continue // We don't want to hold this item
                    if (merchant.hasItem(item.name)) continue // We are already holding one of these items

                    const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
                    const slot = i % 42
                    merchant.withdrawItem(pack, slot)
                    freeSpaces--
                }

                setTimeout(async () => { moveLoop() }, 250)
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

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // mluck our friends
            if (merchant.canUse("mluck")) {
                for (const friend of [mage1, mage2, mage3]) {
                    if (!friend) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(merchant, friend) > merchant.G.skills.mluck.range) {
                            await merchant.closeMerchantStand()
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await merchant.smartMove(friend, { getWithin: merchant.G.skills.mluck.range / 2 })
                        }

                        setTimeout(async () => { moveLoop() }, 250)
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

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    startPontyLoop(merchant, ITEMS_TO_BUY)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const mage1P = AL.Game.startMage(mage1Name, region, identifier)
    const mage2P = AL.Game.startMage(mage2Name, region, identifier)
    // const rogueP = AL.Game.startRogue(rogueName, region, identifier)
    const mage3P = AL.Game.startMage(mage3Name, region, identifier)
    merchant = await merchantP
    mage1 = await mage1P
    mage2 = await mage2P
    // rogue = await rogueP
    mage3 = await mage3P

    // Start the characters
    startShared(merchant)
    startMerchant(merchant)
    startShared(mage1)
    startMage(mage1)
    startShared(mage2)
    startMage(mage2, { x: -20, y: 0 })
    startShared(mage3)
    startMage(mage3, { x: 20, y: 0 })
}
run()