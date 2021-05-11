import AL from "alclient-mongo"
import { ITEMS_TO_EXCHANGE, LOOP_MS, startBuyLoop, startCompoundLoop, startConnectLoop, startElixirLoop, startExchangeLoop, startHealLoop, startLootLoop, startPartyLoop, startPontyLoop, startSellLoop, startSendStuffDenylistLoop, startTrackerLoop, startUpdateLoop, startUpgradeLoop } from "./base/general.js"
import { MERCHANT_GOLD_TO_HOLD, MERCHANT_ITEMS_TO_HOLD, startMluckLoop } from "./base/merchant.js"

/** Config */
const merchantName = "earthMer"
const rangerName = "earthiverse"
const mage1Name = "earthMag"
const mage2Name = "earthMag2"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"

const partyLeader = "earthiverse"
const partyMembers = [rangerName, mage1Name, mage2Name,
    // Kouin's characters
    "bataxedude", "cclair", "fathergreen", "kakaka", "kekeke", "kouin", "kukuku", "piredude", "mule0", "mule1", "mule2", "mule3", "mule4", "mule5", "mule6", "mule7", "mule8", "mule9", "mule10",
    // Lolwutpear's characters
    "lolwutpear", "shoopdawhoop", "ytmnd"
]

const rangerLocation: AL.IPosition = { map: "spookytown", x: 994.5, y: -133 }
const mage1Location: AL.IPosition = { map: "spookytown", x: 741, y: 61 }
const mage2Location: AL.IPosition = { map: "spookytown", x: 852, y: 153 }

/** Characters */
let merchant: AL.Merchant
let ranger: AL.Ranger
let mage1: AL.Mage
let mage2: AL.Mage

async function startShared(bot: AL.Character) {
    startBuyLoop(bot)
    startCompoundLoop(bot)
    startConnectLoop(bot)
    startElixirLoop(bot, "elixirluck")
    startExchangeLoop(bot)
    startHealLoop(bot)
    startLootLoop(bot)

    if (bot.id == partyLeader) {
        bot.socket.on("request", async (data: { name: string }) => {
            if (partyMembers.includes(data.name)) {
                await bot.acceptPartyRequest(data.name)
            }
        })
        bot.socket.on("invite", async (data: { name: string }) => {
            if (partyMembers.includes(data.name)) {
                await bot.acceptPartyInvite(data.name)
            }
        })
        // startPartyInviteLoop(bot, "cclair")
        // startPartyInviteLoop(bot, "fathergreen")
        // startPartyInviteLoop(bot, "kakaka")

        startTrackerLoop(bot)
    } else {
        startPartyLoop(bot, partyLeader)
    }

    startPontyLoop(bot)
    startSellLoop(bot)

    if (bot.ctype !== "merchant") {
        startSendStuffDenylistLoop(bot, merchant)
    }

    startUpdateLoop(bot)
    startUpgradeLoop(bot)
}

async function startRanger(bot: AL.Ranger) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            const targets: AL.Entity[] = []
            for (const [, entity] of bot.entities) {
                if (entity.type !== "stoneworm") continue // Not a stoneworm
                if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent

                targets.push(entity)
            }

            if (targets.length >= 3 && bot.canUse("3shot")) {
                if (!bot.s.energized) {
                    if (mage1.socket.connected && mage1.canUse("energize")) {
                        mage1.energize(bot.id)
                    } else if (mage2.socket.connected && mage2.canUse("energize")) {
                        mage2.energize(bot.id)
                    }
                }

                // If it's a guaranteed kill, remove it from the everyone's entity list so we don't attack it
                for (let i = 0; i < 3; i++) {
                    const target = targets[i]
                    if (AL.Tools.calculateDamageRange(bot, target)[0] * bot.G.skills["3shot"].damage_multiplier >= target.hp) {
                        for (const friend of [ranger, mage1, mage2]) {
                            friend.entities.delete(targets[i].id)
                        }
                    }
                }

                await bot.threeShot(targets[0].id, targets[1].id, targets[2].id)
            } else if (targets.length && bot.canUse("attack")) {
                if (!bot.s.energized) {
                    if (mage1.socket.connected && mage1.canUse("energize")) {
                        mage1.energize(bot.id)
                    } else if (mage2.socket.connected && mage2.canUse("energize")) {
                        mage2.energize(bot.id)
                    }
                }

                // If it's a guaranteed kill, remove it from the everyone's entity list so we don't attack it
                const target = targets[0]
                if (AL.Tools.calculateDamageRange(bot, target)[0] * bot.G.skills["3shot"].damage_multiplier >= target.hp) {
                    for (const friend of [ranger, mage1, mage2]) {
                        friend.entities.delete(targets[0].id)
                    }
                }

                await bot.basicAttack(targets[0].id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { moveLoop() }, 10)
                return
            }

            await bot.smartMove(rangerLocation)
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, LOOP_MS)
    }
    moveLoop()

    async function supershotLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { supershotLoop() }, 10)
                return
            }

            // Find the furthest away target that we can supershot, and supershot it.
            let ssTarget: AL.Entity
            let ssDistance = Number.MAX_VALUE
            for (const [, entity] of bot.entities) {
                if (entity.type !== "stoneworm") continue // Not a stoneworm
                if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                const distance = AL.Tools.distance(bot, entity)
                if (distance > bot.range * bot.G.skills.supershot.range_multiplier) continue // Too far
                if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent

                if (distance < ssDistance) {
                    ssTarget = entity
                    ssDistance = distance
                }
            }

            if (bot.canUse("supershot")) {
                // If it's a guaranteed kill, remove it from the everyone's entity list so we don't attack it
                if (AL.Tools.calculateDamageRange(bot, ssTarget)[0] * bot.G.skills["supershot"].damage_multiplier >= ssTarget.hp) {
                    for (const friend of [ranger, mage1, mage2]) {
                        friend.entities.delete(ssTarget.id)
                    }
                }

                await bot.superShot(ssTarget.id)
            }
        } catch (e) {
            console.error(e)
        }
    }
    supershotLoop()
}

async function startMage(bot: AL.Mage) {
    async function attackLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            for (const [, entity] of bot.entities) {
                if (entity.type !== "stoneworm") continue // Not a stoneworm
                if (entity.target && !entity.isAttackingPartyMember(bot)) continue // Won't get credit for kill
                if (AL.Tools.distance(bot, entity) > bot.range) continue // Too far
                if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // Death is imminent

                if (bot.canUse("attack")) {
                    await bot.basicAttack(entity.id)
                }
                break
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { attackLoop() }, Math.max(10, bot.getCooldown("attack")))
    }
    attackLoop()

    async function moveLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { moveLoop() }, 10)
                return
            }

            if (bot.id == mage1Name) {
                await bot.smartMove(mage1Location)
            } else {
                await bot.smartMove(mage2Location)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, LOOP_MS)
    }
    moveLoop()
}

async function startMerchant(bot: AL.Merchant) {
    startMluckLoop(bot)

    let lastBankVisit = Number.MIN_VALUE
    async function moveLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { moveLoop() }, 10)
                return
            }

            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            // If we are full, let's go to the bank
            if (bot.isFull() || lastBankVisit < Date.now() - 120000 || bot.hasPvPMarkedItem()) {
                await bot.closeMerchantStand()
                await bot.smartMove("items1")

                lastBankVisit = Date.now()

                // Deposit excess gold
                const excessGold = bot.gold - MERCHANT_GOLD_TO_HOLD
                if (excessGold > 0) {
                    await bot.depositGold(excessGold)
                } else if (excessGold < 0) {
                    await bot.withdrawGold(-excessGold)
                }

                // Deposit items
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue
                    if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name) /* We don't want to hold on to it */
                        || item.v) /* Item is PvP marked */ {
                        // Deposit it in the bank
                        try {
                            await bot.depositItem(i)
                        } catch (e) {
                            console.error(e)
                        }
                    }
                }

                // Store information about everything in our bank to use it later to find upgradable stuff
                const bankItems: AL.ItemData[] = []
                for (let i = 0; i <= 7; i++) {
                    const bankPack = `items${i}` as Exclude<AL.BankPackName, "gold">
                    for (const item of bot.bank[bankPack]) {
                        bankItems.push(item)
                    }
                }
                let freeSpaces = bot.esize
                const duplicates = bot.locateDuplicateItems(bankItems)

                // Withdraw compoundable & upgradable things
                for (const iN in duplicates) {
                    const itemName = iN as AL.ItemName
                    const d = duplicates[itemName]
                    const gInfo = bot.G.items[itemName]
                    if (gInfo.upgrade) {
                        // Withdraw upgradable items
                        if (freeSpaces < 3) break // Not enough space in inventory

                        const pack1 = `items${Math.floor((d[0]) / 42)}` as Exclude<AL.BankPackName, "gold">
                        const slot1 = d[0] % 42
                        let withdrew = false
                        for (let i = 1; i < d.length && freeSpaces > 2; i++) {
                            const pack2 = `items${Math.floor((d[i]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot2 = d[i] % 42
                            const item2 = bot.bank[pack2][slot2]
                            const level0Grade = gInfo.grades.lastIndexOf(0) + 1

                            if (item2.level >= 9 - level0Grade) continue // We don't want to upgrade high level items automatically

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
                        if (freeSpaces < 5) break // Not enough space in inventory
                        if (d.length < 3) continue // Not enough to compound

                        for (let i = 0; i < d.length - 2 && freeSpaces > 4; i++) {
                            const pack1 = `items${Math.floor((d[i]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot1 = d[i] % 42
                            const item1 = bot.bank[pack1][slot1]
                            const pack2 = `items${Math.floor((d[i + 1]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot2 = d[i + 1] % 42
                            const item2 = bot.bank[pack2][slot2]
                            const pack3 = `items${Math.floor((d[i + 2]) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const slot3 = d[i + 2] % 42
                            const item3 = bot.bank[pack3][slot3]

                            const level0Grade = gInfo.grades.lastIndexOf(0) + 1
                            if (item1.level >= 4 - level0Grade) continue // We don't want to comopound high level items automaticaclly
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

                // Withdraw exchangable items
                for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
                    const item = bankItems[i]
                    if (!item) continue // No item

                    if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Not exchangable

                    const gInfo = bot.G.items[item.name]
                    if (item.q < gInfo.e) continue // Not enough to exchange

                    // Withdraw the item
                    const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
                    const slot = i % 42
                    await bot.withdrawItem(pack, slot)
                    freeSpaces--
                }

                // Withdraw things we want to hold
                // TODO: improve to stack items that are stackable
                for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
                    const item = bankItems[i]
                    if (!item) continue // No item

                    if (!MERCHANT_ITEMS_TO_HOLD.includes(item.name)) continue // We don't want to hold this item
                    if (bot.hasItem(item.name)) continue // We are already holding one of these items

                    const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
                    const slot = i % 42
                    bot.withdrawItem(pack, slot)
                    freeSpaces--
                }

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // MLuck people if there is a server info target
            for (const mN in bot.S) {
                const type = mN as AL.MonsterName
                if (!bot.S[type].live) continue
                if (!(bot.S[type] as AL.ServerInfoDataLive).target) continue

                if (AL.Tools.distance(merchant, (bot.S[type] as AL.ServerInfoDataLive)) > 100) {
                    await bot.closeMerchantStand()
                    await bot.smartMove((bot.S[type] as AL.ServerInfoDataLive), { getWithin: 100 })
                }

                setTimeout(async () => { moveLoop() }, 250)
                return
            }

            // mluck our friends
            if (bot.canUse("mluck")) {
                for (const friend of [ranger, mage1, mage2]) {
                    if (!friend) continue
                    if (!friend.s.mluck || !friend.s.mluck.strong || friend.s.mluck.ms < 120000) {
                        // Move to them, and we'll automatically mluck them
                        if (AL.Tools.distance(merchant, friend) > bot.G.skills.mluck.range) {
                            await bot.closeMerchantStand()
                            console.log(`[merchant] We are moving to ${friend.name} to mluck them!`)
                            await bot.smartMove(friend, { getWithin: bot.G.skills.mluck.range / 2 })
                        }

                        setTimeout(async () => { moveLoop() }, 250)
                        return
                    }
                }
            }

            // Go fishing if we can
            if (bot.getCooldown("fishing") == 0 /* Fishing is available */
                && (bot.hasItem("rod") || bot.isEquipped("rod")) /* We have a rod */) {
                let wasEquippedMainhand = bot.slots.mainhand
                let wasEquippedOffhand = bot.slots.offhand
                if (wasEquippedOffhand) await bot.unequip("offhand") // rod is a 2-handed weapon, so we need to unequip our offhand if we have something equipped
                else if (bot.hasItem("wbook1")) wasEquippedOffhand = { name: "wbook1" } // We want to equip a wbook1 by default if we have one after we go fishing
                if (wasEquippedMainhand) {
                    if (wasEquippedMainhand.name !== "rod") {
                        // We didn't have a rod equipped before, let's equip one now
                        await bot.unequip("mainhand")
                        await bot.equip(bot.locateItem("rod"))
                    }
                } else {
                    // We didn't have anything equipped before
                    if (bot.hasItem("dartgun")) wasEquippedMainhand = { name: "dartgun" } // We want to equip a dartgun by default if we have one after we go fishing
                    await bot.equip(bot.locateItem("rod")) // Equip the rod
                }
                bot.closeMerchantStand()
                await bot.smartMove({ map: "main", x: -1368, y: 0 }) // Move to fishing sppot
                await bot.fish()
                if (wasEquippedMainhand) await bot.equip(bot.locateItem(wasEquippedMainhand.name))
                if (wasEquippedOffhand) await bot.equip(bot.locateItem(wasEquippedOffhand.name))
            }

            // Go mining if we can
            if (bot.getCooldown("mining") == 0 /* Mining is available */
                && (bot.hasItem("pickaxe") || bot.isEquipped("pickaxe")) /* We have a pickaxe */) {
                let wasEquippedMainhand = bot.slots.mainhand
                let wasEquippedOffhand = bot.slots.offhand
                if (wasEquippedOffhand) await bot.unequip("offhand") // pickaxe is a 2-handed weapon, so we need to unequip our offhand if we have something equipped
                else if (bot.hasItem("wbook1")) wasEquippedOffhand = { name: "wbook1" } // We want to equip a wbook1 by default if we have one after we go mining
                if (wasEquippedMainhand) {
                    if (wasEquippedMainhand.name !== "pickaxe") {
                        // We didn't have a pickaxe equipped before, let's equip one now
                        await bot.unequip("mainhand")
                        await bot.equip(bot.locateItem("pickaxe"))
                    }
                } else {
                    // We didn't have anything equipped before
                    if (bot.hasItem("dartgun")) wasEquippedMainhand = { name: "dartgun" } // We want to equip a dartgun by default if we have one after we go mining
                    await bot.equip(bot.locateItem("pickaxe")) // Equip the pickaxe
                }
                bot.closeMerchantStand()
                await bot.smartMove({ map: "tunnel", x: -280, y: -10 }) // Move to mining sppot
                await bot.mine()
                if (wasEquippedMainhand) await bot.equip(bot.locateItem(wasEquippedMainhand.name))
                if (wasEquippedOffhand) await bot.equip(bot.locateItem(wasEquippedOffhand.name))
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
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")
    const merchantP = AL.Game.startMerchant(merchantName, region, identifier)
    const rangerP = AL.Game.startRanger(rangerName, region, identifier)
    const mage1P = AL.Game.startMage(mage1Name, region, identifier)
    const mage2P = AL.Game.startMage(mage2Name, region, identifier)
    merchant = await merchantP
    ranger = await rangerP
    mage1 = await mage1P
    // rogue = await rogueP
    mage2 = await mage2P

    // Start the characters
    startShared(merchant)
    startMerchant(merchant)

    startShared(ranger)
    startRanger(ranger)

    startShared(mage1)
    startMage(mage1)

    startShared(mage2)
    startMage(mage2)
}
run()