import AL from "alclient"
import { ItemLevelInfo } from "./definitions/bot"

const LOOP_MS = 100

export function startBuyLoop(bot: AL.Character, itemsToBuy: AL.ItemName[] = [], items: [AL.ItemName, number][] = [["hpot1", 1000], ["mpot1", 1000], ["xptome", 1]],): void {
    async function buyLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { buyLoop() }, 10)
                return
            }

            for (const [item, amount] of items) {
                if (bot.canBuy(item)) {
                    const num = bot.countItem(item)
                    if (num < amount) await bot.buy(item, amount - num)
                }
            }

            // Look for buyable things on merchants
            for (const [, player] of bot.players) {
                if (!player.stand) continue // Not selling anything
                if (AL.Tools.distance(bot, player) > AL.Constants.NPC_INTERACTION_DISTANCE) continue // Too far away

                for (const s in player.slots) {
                    const slot = s as AL.TradeSlotType
                    const item = player.slots[slot]
                    if (!item) continue // Nothing in the slot
                    if (!item.rid) continue // Not a trade item
                    if (item.b) continue // They are buying, not selling

                    const q = item.q === undefined ? 1 : item.q

                    // Join new giveaways
                    if (item.giveaway && bot.ctype == "merchant" && (!item.list || !item.list.includes(bot.id))) {
                        // TODO: Move this to a function
                        bot.socket.emit("join_giveaway", { slot: slot, id: player.id, rid: item.rid })
                        continue
                    }

                    // Buy if we can resell to NPC for more money
                    const cost = bot.calculateItemCost(item)
                    if ((item.price < cost * 0.6) // Item is lower price than G, which means we could sell it to an NPC straight away and make a profit...
                        || itemsToBuy.includes(item.name) && item.price <= cost // Item is the same, or lower price than the NPC would sell for, and we want it.
                    ) {
                        await bot.buyFromMerchant(player.id, slot, item.rid, q)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { buyLoop() }, LOOP_MS)
    }
    buyLoop()
}

export function startCompoundLoop(bot: AL.Character, itemsToSell: ItemLevelInfo): void {
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
                setTimeout(async () => { compoundLoop() }, LOOP_MS)
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
                if (itemsToSell[itemName] && !itemInfo.p && itemInfo.level < itemsToSell[itemName]) continue // Don't compound items we want to sell unless they're special

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

        setTimeout(async () => { compoundLoop() }, LOOP_MS)
    }
    compoundLoop()
}

export function startConnectLoop(bot: AL.Character): void {
    async function connectLoop() {
        if (bot.socket.disconnected) {
            console.log(`${bot.id} is disconnected. Reconnecting!`)
            bot.socket.connect()
            setTimeout(async () => { connectLoop() }, 60000)
            return
        }

        setTimeout(async () => { connectLoop() }, LOOP_MS)
    }
    connectLoop()
}

export function startElixirLoop(bot: AL.Character, elixir: AL.ItemName): void {
    async function elixirLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { elixirLoop() }, 10)
                return
            }

            if (!bot.slots.elixir) {
                let drinkThis = bot.locateItem(elixir)
                if (drinkThis == undefined && bot.canBuy(elixir)) drinkThis = await bot.buy(elixir)
                if (drinkThis !== undefined) await bot.equip(drinkThis)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { elixirLoop() }, LOOP_MS)
    }
    elixirLoop()
}

export function startHealLoop(bot: AL.Character): void {
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
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { healLoop() }, Math.max(LOOP_MS, bot.getCooldown("use_hp")))
    }
    healLoop()
}

export function startLootLoop(bot: AL.Character): void {
    async function lootLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { lootLoop() }, 10)
                return
            }

            let looted = 0
            for (const [, chest] of bot.chests) {
                if (AL.Tools.distance(bot, chest) > 800) continue
                await bot.openChest(chest.id)
                if (looted++ >= 5) break
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, LOOP_MS)
    }
    lootLoop()
}

export function startPartyLoop(bot: AL.Character, leader: string): void {
    async function partyLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { partyLoop() }, 10)
                return
            }

            if (!bot.party) {
                bot.sendPartyRequest(leader)
            } else if (bot.partyData?.list.includes(leader)) {
                bot.leaveParty()
                bot.sendPartyRequest(leader)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyLoop() }, 10000)
    }
    partyLoop()
}

export function startPontyLoop(bot: AL.Character, itemsToBuy: AL.ItemName[]): void {
    async function pontyLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { pontyLoop() }, 10000)
                return
            }

            const ponty = bot.locateNPC("secondhands")[0]
            if (AL.Tools.distance(bot, ponty) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const pontyData = await bot.getPontyItems()
                for (const item of pontyData) {
                    if (itemsToBuy.includes(item.name)) {
                        await bot.buyFromPonty(item)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { pontyLoop() }, 10000)
    }
    pontyLoop()
}

export function startSellLoop(bot: AL.Character, itemsToSell: ItemLevelInfo): void {
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
                    if (itemsToSell[item.name] == undefined) continue // We don't want to sell this item
                    if (itemsToSell[item.name] <= item.level) continue // Keep this item, it's a high enough level that we want to keep it

                    const q = bot.items[i].q !== undefined ? bot.items[i].q : 1

                    await bot.sell(i, q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sellLoop() }, LOOP_MS)
    }
    sellLoop()
}

/**
 * Only send the items in `itemsToSend`.
 * @param bot 
 * @param sendTo 
 * @param itemsToSend 
 * @param goldToHold 
 */
export function startSendStuffAllowlistLoop(bot: AL.Character, sendTo: AL.Character, itemsToSend: AL.ItemName[] = [], goldToHold = 1_000_000): void {
    async function sendStuffLoop() {
        try {
            if (sendTo.isFull()) {
                setTimeout(async () => { sendStuffLoop() }, LOOP_MS)
                return
            }

            if (AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - goldToHold
                if (extraGold > 0) await bot.sendGold(sendTo.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || !itemsToSend.includes(item.name)) continue // Only send items in our list

                    await bot.sendItem(sendTo.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendStuffLoop() }, LOOP_MS)
    }
    sendStuffLoop()
}

/**
 * Send all items except for those in `itemsToHold`
 * @param bot 
 * @param sendTo 
 * @param itemsToHold 
 * @param goldToHold 
 */
export function startSendStuffDenylistLoop(bot: AL.Character, sendTo: AL.Character, itemsToHold: AL.ItemName[] = [], goldToHold = 1_000_000): void {
    async function sendStuffLoop() {
        try {
            if (sendTo.isFull()) {
                setTimeout(async () => { sendStuffLoop() }, 10000)
                return
            }

            if (AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - goldToHold
                if (extraGold > 0) await bot.sendGold(sendTo.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || itemsToHold.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(sendTo.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendStuffLoop() }, LOOP_MS)
    }
    sendStuffLoop()
}

export function startUpgradeLoop(bot: AL.Character, itemsToSell: ItemLevelInfo): void {
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
                setTimeout(async () => { upgradeLoop() }, LOOP_MS)
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
                if (itemsToSell[itemName] && !itemInfo.p && itemInfo.level < itemsToSell[itemName]) continue // Don't upgrade items we want to sell unless it's special

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

        setTimeout(async () => { upgradeLoop() }, LOOP_MS)
    }
    upgradeLoop()
}

export function startUpdateLoop(bot: AL.Character): void {
    async function updateLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { updateLoop() }, 30000)
                return
            }

            await bot.requestEntitiesData()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { updateLoop() }, 30000)
    }
    updateLoop()
}