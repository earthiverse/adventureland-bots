import AL from "alclient"

/** Config */
const merchantName = "earthMer"
const mage1Name = "earthMag"
const mage2Name = "earthMag2"
const mage3Name = "earthMag3"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "III"

let merchant: AL.Merchant
let mage1: AL.Mage
let mage2: AL.Mage
let mage3: AL.Mage

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
const ITEMS_TO_SELL: {
    /** Items this level and under will be sold */
    [T in AL.ItemName]?: number
} = {
    // Default clothing
    "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
}

async function startShared(bot: AL.Character) {
    async function buyLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { buyLoop() }, 10)
                return
            }

            if (bot.canBuy("hpot1")) {
                // Buy HP Pots
                const numHpot1 = bot.countItem("hpot1")
                if (numHpot1 < 1000) await bot.buy("hpot1", 1000 - numHpot1)

                // Buy MP Pots
                const numMpot1 = bot.countItem("mpot1")
                if (numMpot1 < 1000) await bot.buy("mpot1", 1000 - numMpot1)
            }

            if (bot.canBuy("xptome")) {
                // Buy XP Tome
                const numXPTome = bot.countItem("xptome")
                if (numXPTome == 0) await bot.buy("xptome", 1)
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, 1000)
    }
    buyLoop()

    async function compoundLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { compoundLoop() }, 10)
                return
            }

            if (bot.q.compound) {
                // We are upgrading, we have to wait
                setTimeout(async () => { compoundLoop() }, bot.q.compound.ms)
                return
            }
            if (bot.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                setTimeout(async () => { compoundLoop() }, 1000)
                return
            }

            const duplicates = bot.locateDuplicateItems()
            for (const iN in duplicates) {
                const itemName = iN as AL.ItemName
                const numDuplicates = duplicates[iN].length

                // Check if there's enough to compound
                if (numDuplicates < 3) {
                    delete duplicates[itemName]
                    continue
                }

                // Check if there's three with the same level. If there is, set the array to those three
                let found = false
                for (let i = 0; i < numDuplicates - 2; i++) {
                    const item1 = bot.items[duplicates[itemName][i]]
                    const item2 = bot.items[duplicates[itemName][i + 1]]
                    const item3 = bot.items[duplicates[itemName][i + 2]]

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
                const itemName = iN as AL.ItemName
                const gInfo = bot.G.items[itemName]
                if (gInfo.compound == undefined) continue // Not compoundable
                const level0Grade = gInfo.grades.lastIndexOf(0) + 1
                const itemPoss = duplicates[itemName]
                const itemInfo = bot.items[itemPoss[0]]
                if (itemInfo.level >= 4 - level0Grade) continue // We don't want to compound higher level items automatically.
                if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't compound items we want to sell unless they're special

                // Figure out the scroll we need to upgrade
                const grade = await bot.calculateItemGrade(itemInfo)
                const cscrollName = `cscroll${grade}` as AL.ItemName
                let cscrollPos = bot.locateItem(cscrollName)
                if (cscrollPos == undefined && !bot.canBuy(cscrollName)) continue // We can't buy a scroll for whatever reason :(
                else if (cscrollPos == undefined) cscrollPos = await bot.buy(cscrollName)

                // Compound!
                if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as AL.Merchant).massProduction()
                await bot.compound(itemPoss[0], itemPoss[1], itemPoss[2], cscrollPos)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { compoundLoop() }, 250)
    }
    compoundLoop()

    async function connectLoop() {
        if (bot.socket.disconnected) {
            console.log(`${bot.id} is disconnected. Reconnecting!`)
            bot.socket.connect()
            setTimeout(async () => { connectLoop() }, 60000)
            return
        }

        setTimeout(async () => { connectLoop() }, 1000)
    }
    connectLoop()

    let elixirLoop: { (): void; (): Promise<void> }
    if (["ranger", "warrior", "rogue"].includes(bot.ctype)) {
        elixirLoop = async () => {
            try {
                if (bot.socket.disconnected) {
                    setTimeout(async () => { elixirLoop() }, 10)
                    return
                }

                if (!bot.slots.elixir) {
                    let pumpkinSpice = bot.locateItem("pumpkinspice")
                    if (pumpkinSpice == undefined && bot.canBuy("pumpkinspice")) pumpkinSpice = await bot.buy("pumpkinspice")
                    if (pumpkinSpice !== undefined) await bot.equip(pumpkinSpice)
                }
            } catch (e) {
                console.error(e)
            }

            setTimeout(async () => { elixirLoop() }, 250)
        }
        elixirLoop()
    }

    async function healLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { healLoop() }, 10)
                return
            }

            if (!bot.rip) {
                const missingHP = bot.max_hp - bot.hp
                const missingMP = bot.max_mp - bot.mp
                const hpRatio = bot.hp / bot.max_hp
                const mpRatio = bot.mp / bot.max_mp
                const hpot1 = bot.locateItem("hpot1")
                const hpot0 = bot.locateItem("hpot0")
                const mpot1 = bot.locateItem("mpot1")
                const mpot0 = bot.locateItem("mpot0")
                if (hpRatio < mpRatio) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingMP >= 500 && mpot1 !== undefined) {
                        await bot.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await bot.useMPPot(mpot0)
                    } else {
                        await bot.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (bot.c.town) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                }
            }

            setTimeout(async () => { healLoop() }, Math.max(10, bot.getCooldown("use_hp")))
        } catch (e) {
            console.error(e)
            setTimeout(async () => { healLoop() }, 10)
        }

    }
    healLoop()

    async function partyLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { partyLoop() }, 10)
                return
            }

            if (!bot.party || !bot.partyData.list) {
                bot.sendPartyRequest(merchant.id)
            } else if (bot.partyData.list[0] !== merchant.id) {
                bot.leaveParty()
                bot.sendPartyRequest(merchant.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()

    async function sellLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { sellLoop() }, 10)
                return
            }

            if (bot.hasItem("computer")) {
                // Sell things
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item in this slot
                    if (item.p) continue // This item is special in some way
                    if (ITEMS_TO_SELL[item.name] == undefined) continue // We don't want to sell this item
                    if (ITEMS_TO_SELL[item.name] <= item.level) continue // Keep this item, it's a high enough level that we want to keep it

                    const q = bot.items[i].q !== undefined ? bot.items[i].q : 1

                    await bot.sell(i, q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellLoop() }, 1000)
    }
    sellLoop()

    let sendItemLoop
    if (bot.ctype !== "merchant") {
        sendItemLoop = async () => {
            try {
                if (bot.socket.disconnected) {
                    setTimeout(async () => { sendItemLoop() }, 10)
                    return
                }

                const sendTo = bot.players.get(merchant.id)
                if (sendTo && AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                    const extraGold = bot.gold - 10_000_000

                    if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
                    const prims = bot.locateItem("offeringp")
                    if (prims !== undefined) await bot.sendItem(merchant.id, prims, bot.items[prims].q)
                }
            } catch (e) {
                console.error(e)
            }

            setTimeout(async () => { sendItemLoop() }, 1000)
        }
        sendItemLoop()
    }

    async function upgradeLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { upgradeLoop() }, 10)
                return
            }

            if (bot.q.upgrade) {
                // We are upgrading, we have to wait
                setTimeout(async () => { upgradeLoop() }, bot.q.upgrade.ms)
                return
            }
            if (bot.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                setTimeout(async () => { upgradeLoop() }, 1000)
                return
            }

            // Find items that we have two (or more) of, and upgrade them if we can
            const duplicates = bot.locateDuplicateItems()
            for (const iN in duplicates) {
                // Check if item is upgradable, or if we want to upgrade it
                const itemName = iN as AL.ItemName
                const gInfo = bot.G.items[itemName]
                if (gInfo.upgrade == undefined) continue // Not upgradable
                const level0Grade = gInfo.grades.lastIndexOf(0) + 1
                const itemPos = duplicates[itemName][0]
                const itemInfo = bot.items[itemPos]
                if (itemInfo.level >= 9 - level0Grade) continue // We don't want to upgrade harder to get items too much.
                if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't upgrade items we want to sell unless it's special

                // Figure out the scroll we need to upgrade
                const grade = await bot.calculateItemGrade(itemInfo)
                const scrollName = `scroll${grade}` as AL.ItemName
                let scrollPos = bot.locateItem(scrollName)
                try {
                    if (scrollPos == undefined && !bot.canBuy(scrollName)) continue // We can't buy a scroll for whatever reason :(
                    else if (scrollPos == undefined) scrollPos = await bot.buy(scrollName)

                    // Upgrade!
                    if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as AL.Merchant).massProduction()
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

async function startMage(mage: AL.Mage) {
    async function attackLoop() {
        try {
            if (mage.socket.disconnected) {
                setTimeout(async () => { attackLoop() }, 10)
                return
            }

            for (const [, entity] of mage.entities) {
                if (AL.Tools.distance(mage, entity) > mage.range) continue // Too far away
                if (entity.cooperative !== true && entity.target && ![mage1?.id, mage2?.id, mage3?.id, merchant?.id].includes(entity.target)) continue // It's targeting someone else
                if (entity.willDieToProjectiles(mage.projectiles, mage.players)) continue // Already gonna die
                if (entity.willBurnToDeath()) continue // Will burn to death shortly

                if (AL.Tools.calculateDamageRange(mage, entity)[0] > entity.hp) {
                    for (const bot of [merchant, mage1, mage2, mage3]) {
                        if (!bot) continue
                        bot.entities.delete(entity.id)
                    }
                }
                await mage.basicAttack(entity.id)
                break
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, Math.max(10, mage.getCooldown("attack")))
    }
    attackLoop()
}

async function startMerchant(merchant: AL.Merchant) {
    // Accept all the party requests!
    merchant.socket.on("request", (data: { name: string }) => {
        merchant.acceptPartyRequest(data.name)
    })

    async function mluckLoop() {
        try {
            if (merchant.socket.disconnected) {
                setTimeout(async () => { mluckLoop() }, 10)
                return
            }

            if (merchant.canUse("mluck")) {
                if (!merchant.s.mluck || merchant.s.mluck.f !== merchant.id) await merchant.mluck(merchant.id) // mluck ourselves

                for (const [, player] of merchant.players) {
                    if (AL.Tools.distance(merchant, player) > merchant.G.skills.mluck.range) continue // Too far away to mluck
                    if (player.npc) continue // It's an NPC, we can't mluck NPCs.

                    if (!player.s.mluck) {
                        await merchant.mluck(player.id) // Give the mluck 
                    } else if (!player.s.mluck.strong && player.s.mluck.f !== merchant.id) {
                        await merchant.mluck(player.id) // Steal the mluck
                    } else if ((!player.s.mluck.strong && player.s.mluck.ms < (merchant.G.conditions.mluck.duration - 60000))
                        || (player.s.mluck.strong && player.s.mluck.f == merchant.id && player.s.mluck.ms < (merchant.G.conditions.mluck.duration - 60000))) {
                        await merchant.mluck(player.id) // Extend the mluck
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
                const bankItems: AL.ItemInfo[] = []
                for (let i = 0; i <= 7; i++) {
                    const bankPack = `items${i}` as Exclude<AL.BankPackName, "gold">
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
                if (!merchant.S[type].live) continue
                if (!merchant.S[type].target) continue

                if (AL.Tools.distance(merchant, merchant.S[type]) > 100) {
                    await merchant.closeMerchantStand()
                    await merchant.smartMove(merchant.S[type], { getWithin: 100 })
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
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Pathfinder.prepare()])

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
    startMage(mage2)
    startShared(mage3)
    startMage(mage3)
}
run()