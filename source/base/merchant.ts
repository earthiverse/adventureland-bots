import AL from "alclient-mongo"
import { ITEMS_TO_HOLD, ITEMS_TO_SELL, LOOP_MS } from "./general.js"

export const MERCHANT_GOLD_TO_HOLD = 100_000_000
export const MERCHANT_ITEMS_TO_HOLD: AL.ItemName[] = [
    ...ITEMS_TO_HOLD,
    // Merchant Stand
    "stand0",
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll",
    // Fishing Rod and Pickaxe
    "pickaxe", "rod",
    // Main Items
    "dartgun", "wbook1"
]

// TODO: INCOMPLETE
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
            if (itemsToHold.includes(item.name)) continue // We want to hold it
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

    // Withdraw things we want to hold
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

    // TODO: improve to stack items that are stackable
}

export function startMluckLoop(bot: AL.Merchant): void {
    async function mluckLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { mluckLoop() }, 10)
                return
            }

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

        setTimeout(async () => { mluckLoop() }, LOOP_MS)
    }
    mluckLoop()
}