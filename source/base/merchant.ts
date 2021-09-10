import AL from "alclient"
import { ITEMS_TO_EXCHANGE, ITEMS_TO_HOLD, ITEMS_TO_SELL, LOOP_MS } from "./general.js"

export const MERCHANT_GOLD_TO_HOLD = 100_000_000
export const MERCHANT_ITEMS_TO_HOLD: Set<AL.ItemName> = new Set([
    ...ITEMS_TO_HOLD,
    // Merchant Stand
    "stand0",
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll",
    // Prims
    "offering", "offeringp",
    // Fishing Rod and Pickaxe
    "pickaxe", "rod",
    // Main Items
    "dartgun", "wbook1"
])

export async function attackTheseTypesMerchant(bot: AL.Merchant, types: AL.MonsterName[], friends: AL.Character[] = []): Promise<void> {
    if (!bot.canUse("attack")) return // We can't attack
    if (bot.c.town) return // Don't attack if teleporting

    const targets: AL.Entity[] = []
    for (const entity of bot.getEntities({
        couldGiveCredit: true,
        typeList: types,
        willDieToProjectiles: false,
        withinRange: bot.range
    })) {
        targets.push(entity)
    }
    if (targets.length == 0) return // No targets

    const entity = targets[0]

    // Remove them from our friends' entities list if we're going to kill it
    if (bot.canKillInOneShot(entity)) {
        for (const friend of friends) {
            if (!friend) continue // No friend
            if (friend.id == bot.id) continue // Don't delete it from our own list
            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't delete special monsters
            friend.deleteEntity(entity.id)
        }
    }

    await bot.basicAttack(entity.id)
}

export async function doBanking(bot: AL.Merchant, goldToHold = MERCHANT_GOLD_TO_HOLD, itemsToHold = MERCHANT_ITEMS_TO_HOLD, itemsToSell = ITEMS_TO_SELL): Promise<void> {
    await bot.closeMerchantStand()
    await bot.smartMove("items1")

    // Deposit extra gold, or get more gold
    const excessGold = bot.gold - goldToHold
    if (excessGold > 0) {
        await bot.depositGold(excessGold)
    } else if (excessGold < 0 && bot.bank.gold > 0) {
        await bot.withdrawGold(Math.min(bot.bank.gold, -excessGold))
    }

    // Deposit items
    for (let i = 0; i < bot.items.length; i++) {
        const item = bot.items[i]
        if (!item) continue
        if (item.v == undefined) {
            if (itemsToHold.has(item.name)) continue // We want to hold it
            if (item.l == "l") continue // We want to hold it
            if (itemsToSell[item.name]) {
                if (item.level !== undefined && item.level <= itemsToSell[item.name]) continue // We want to sell it
                else if (item.level == undefined) continue // We want to sell it
            }
        }
        try {
            // Deposit it in the bank
            await bot.depositItem(i)
        } catch (e) {
            console.error(e)
        }
    }

    // Store information about everything in our bank to use it later to find upgradable stuff
    const bankItems: AL.ItemData[] = []
    for (let i = 0; i <= 7; i++) {
        const bankPack = `items${i}` as Exclude<AL.BankPackName, "gold">
        if (!bot?.bank[bankPack]) continue // This bank slot isn't available
        for (const item of bot.bank[bankPack]) {
            bankItems.push(item)
        }
    }
    let freeSpaces = bot.esize

    // Withdraw things we want to hold
    for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
        const item = bankItems[i]
        if (!item) continue // No item

        if (!itemsToHold.has(item.name)) continue // We don't want to hold this item
        if (bot.hasItem(item.name)) {
            const gInfo = bot.G.items[item.name]
            if (!gInfo.s) continue // Not stackable
            if (bot.countItem(item.name) + item.q > gInfo.s) continue // We can't stack them in one spot

            const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
            const slot = i % 42
            bot.withdrawItem(pack, slot)
            continue
        }

        const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
        const slot = i % 42
        bot.withdrawItem(pack, slot)
        freeSpaces--
    }

    // Withdraw compoundable & upgradable things
    const itemsByLevel = bot.locateItemsByLevel(bankItems, { excludeSpecialItems: true })
    for (const dName in itemsByLevel) {
        const itemName = dName as AL.ItemName
        const gInfo = bot.G.items[itemName]
        if (gInfo.grades == undefined) continue
        const level0Grade = gInfo.grades.lastIndexOf(0) + 1

        if (gInfo.upgrade && freeSpaces > 3) {
            // Item is upgradable, withdraw lower level items to upgrade
            let firstItemSlot: number
            let firstItemWithdrawn = false
            for (let dLevel = 12; dLevel >= 0 && freeSpaces > 3; dLevel--) {
                const items = itemsByLevel[itemName][dLevel]
                if (items == undefined) continue // No items of this type at this level
                if (dLevel >= 9 - level0Grade) {
                    // Don't withdraw items higher than this for the purpose of upgrading them
                    if (!firstItemSlot) firstItemSlot = items[0]
                } else {
                    for (let i = 0; i < items.length && freeSpaces > 2; i++) {
                        const slot = items[i]
                        if (firstItemSlot == undefined) {
                            firstItemSlot = slot
                            continue
                        }
                        if (!firstItemWithdrawn) {
                            // Withdraw the first item, because our other upgrade logic will only upgrade if we have two items of the same type in our inventory
                            const realPack = `items${Math.floor((firstItemSlot) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const realSlot = firstItemSlot % 42
                            await bot.withdrawItem(realPack, realSlot)
                            freeSpaces--
                            firstItemWithdrawn = true
                        }
                        // Withdraw the item to upgrade
                        const realPack = `items${Math.floor((slot) / 42)}` as Exclude<AL.BankPackName, "gold">
                        const realSlot = slot % 42
                        await bot.withdrawItem(realPack, realSlot)
                        freeSpaces--
                    }
                }
            }
        } else if (gInfo.compound && freeSpaces > 5) {
            // Item is compoundable, withdraw lower level items to compound
            let firstItemSlot: number
            let firstItemWithdrawn = false
            for (let dLevel = 7; dLevel >= 0 && freeSpaces > 5; dLevel--) {
                const items = itemsByLevel[itemName][dLevel]
                if (items == undefined) continue // No items of this type at this level
                if (dLevel >= 4 - level0Grade) {
                    // Don't withdraw items higher than this for the purpose of compounding them
                    if (!firstItemSlot) firstItemSlot = items[0]
                } else {
                    if (firstItemSlot !== undefined && items.length < 3) continue // Not enough to compound
                    else if (firstItemSlot == undefined && items.length < 4) {
                        firstItemSlot = items[0]
                        continue // Not enough to compound
                    }
                    for (let i = 0; i < items.length && freeSpaces > 5; i++) {
                        const slot1 = items[i]
                        if (firstItemSlot == undefined) {
                            firstItemSlot = slot1
                            continue
                        }
                        if (!firstItemWithdrawn) {
                            // Withdraw the first item, because our other upgrade logic will only upgrade if we have two items of the same type in our inventory
                            const realPack = `items${Math.floor((firstItemSlot) / 42)}` as Exclude<AL.BankPackName, "gold">
                            const realSlot = firstItemSlot % 42
                            await bot.withdrawItem(realPack, realSlot)
                            freeSpaces--
                            firstItemWithdrawn = true
                        }
                        // Withdraw the item to upgrade
                        const realPack1 = `items${Math.floor((slot1) / 42)}` as Exclude<AL.BankPackName, "gold">
                        const realSlot1 = slot1 % 42
                        await bot.withdrawItem(realPack1, realSlot1)
                        freeSpaces--
                        const slot2 = items[i + 1]
                        const realPack2 = `items${Math.floor((slot2) / 42)}` as Exclude<AL.BankPackName, "gold">
                        const realSlot2 = slot2 % 42
                        await bot.withdrawItem(realPack2, realSlot2)
                        freeSpaces--
                        const slot3 = items[i + 2]
                        const realPack3 = `items${Math.floor((slot3) / 42)}` as Exclude<AL.BankPackName, "gold">
                        const realSlot3 = slot3 % 42
                        await bot.withdrawItem(realPack3, realSlot3)
                        freeSpaces--
                        i += 2
                    }
                }
            }
        } else {
            // Item is not upgradable or compoundable
            continue
        }
    }

    // Withdraw exchangable items
    for (let i = 0; i < bankItems.length && freeSpaces > 2; i++) {
        const item = bankItems[i]
        if (!item) continue // No item

        if (!ITEMS_TO_EXCHANGE.has(item.name)) continue // Not exchangable

        const gInfo = bot.G.items[item.name]
        if (item.q < gInfo.e) continue // Not enough to exchange

        // Withdraw the item
        const pack = `items${Math.floor(i / 42)}` as Exclude<AL.BankPackName, "gold">
        const slot = i % 42
        await bot.withdrawItem(pack, slot)
        freeSpaces--
    }
}

export async function goFishing(bot: AL.Merchant): Promise<void> {
    if (bot.getCooldown("fishing") > 0) return // Fishing is on cooldown
    if (!bot.hasItem("rod") && !bot.isEquipped("rod")) return // We don't have a rod

    // TODO: Improve item equipping and unequipping

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

export async function goMining(bot: AL.Merchant): Promise<void> {
    if (bot.getCooldown("mining") > 0) return // Mining is on cooldown
    if (!bot.hasItem("pickaxe") && !bot.isEquipped("pickaxe")) return // We don't have a pickaxe

    // TODO: Improve item equipping and unequipping

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

export function startMluckLoop(bot: AL.Merchant): void {
    async function mluckLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("mluck")) {
                if (!bot.s.mluck || bot.s.mluck.f !== bot.id) await bot.mluck(bot.id) // mluck ourselves

                for (const [, player] of bot.players) {
                    if (AL.Tools.distance(bot, player) > bot.G.skills.mluck.range) continue // Too far away to mluck
                    if (player.npc) continue // It's an NPC, we can't mluck NPCs.

                    if (!player.s.mluck) {
                        await bot.mluck(player.id) // Give the mluck
                    } else if (!player.s.mluck.strong && player.s.mluck.f !== bot.id) {
                        await bot.mluck(player.id) // Steal the mluck
                    } else if ((!player.s.mluck.strong && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))
                        || (player.s.mluck.strong && player.s.mluck.f == bot.id && player.s.mluck.ms < (bot.G.conditions.mluck.duration - 60000))) {
                        await bot.mluck(player.id) // Extend the mluck
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("mluckloop", setTimeout(async () => { mluckLoop() }, LOOP_MS))
    }
    mluckLoop()
}