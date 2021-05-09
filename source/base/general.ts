import AL from "alclient-mongo"
import { ItemLevelInfo } from "../definitions/bot"

export const LOOP_MS = 100
export const CHECK_PONTY_EVERY_MS = 10_000 /** 10 seconds */
export const CHECK_TRACKER_EVERY_MS = 600_000 /** 10 minutes */

export const GOLD_TO_HOLD = 5_000_000

export const ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0", "xptome",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1"
]

export const ITEMS_TO_EXCHANGE: AL.ItemName[] = [
    // General exchangables
    "5bucks", "gem0", "gem1",
    // Gem Fragments for t2 amulets
    "gemfragment",
    // Seashells for potions
    "seashell",
    // Leather for capes
    "leather",
    // Christmas
    "candycane", "mistletoe", "ornament",
    // Halloween
    "candy0", "candy1",
    // Lunar New Year's
    "greenenvelope", "redenvelope", "redenvelopev2", "redenvelopev3",
    // Easter
    "basketofeggs",
    // Boxes
    "armorbox", "bugbountybox", "gift0", "gift1", "mysterybox", "weaponbox", "xbox"
]
export const ITEMS_TO_BUY: AL.ItemName[] = [
    // Exchangeables
    ...ITEMS_TO_EXCHANGE,
    // Belts
    "dexbelt", "intbelt", "strbelt",
    // Rings
    "cring", "ctristone", "dexring", "goldring", "intring", "ringofluck", "strring", "suckerpunch", "trigger", "tristone", "vring",
    // Earrings
    "cearring", "dexearring", "intearring", "lostearring", "strearring",
    // Amulets
    "amuletofm", "dexamulet", "intamulet", "snring", "stramulet", "t2dexamulet", "t2intamulet", "t2stramulet",
    // Orbs
    "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull",
    // Shields
    "t2quiver", "lantern", "mshield", "quiver", "sshield", "xshield",
    // Capes
    "angelwings", "bcape", "cape", "ecape", "stealthcape", "vcape",
    // Shoes
    "eslippers", "hboots", "mrnboots", "mwboots", "shoes1", "vboots", "wingedboots", "wshoes", "xboots",
    // Pants
    "frankypants", "hpants", "mrnpants", "mwpants", "pants1", "starkillers", "wbreeches", "xpants",
    // Armor
    "cdragon", "coat1", "harmor", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "vattire", "warpvest", "wattire", "xarmor",
    // Helmets
    "cyber", "eears", "fury", "helmet1", "hhelmet", "mchat", "mmhat", "mphat", "mrnhat", "mwhelmet", "oxhelmet", "partyhat", "rednose", "wcap", "xhelmet",
    // Gloves
    "gloves1", "goldenpowerglove", "handofmidas", "hgloves", "mpxgloves", "mrngloves", "mwgloves", "poker", "powerglove", "vgloves", "wgloves", "xgloves",
    // Good weapons
    "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "firebow", "frostbow", "froststaff", "gbow", "harbringer", "heartwood", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow", "t3bow", "wblade",
    // Things we can exchange / craft with
    "ascale", "bfur", "cscale", "electronics", "feather0", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", /*"networkcard",*/ "platinumingot", "platinumnugget", "pleather", "snakefang",
    // Things to make xbox
    "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
    // Things to make easter basket
    "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
    // Essences
    "essenceofether", "essenceoffire", "essenceoffrost", "essenceofgreed", "essenceoflife", "essenceofnature",
    // Potions & consumables
    "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate", "vblood",
    // High level scrolls
    "cscroll3", "scroll3", "scroll4", "forscroll", "luckscroll", "manastealscroll",
    // Misc. Things
    "bottleofxp", "bugbountybox", "computer", "cxjar", "monstertoken", "poison", "snakeoil"
]

export const ITEMS_TO_SELL: ItemLevelInfo = {
    // Default clothing
    "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
}

/**
 * These are cooperative entities that don't spawn very often.
 * We only want to do them when others are attacking them, too.
 * 
 * @param bot 
 * @returns 
 */
export async function getPriority1Entities(bot: AL.Character): Promise<AL.IEntity[]> {
    // NOTE: This list is ordered higher -> lower priority
    const coop: AL.MonsterName[] = [
        // Event-based
        "dragold", "grinch", "mrgreen", "mrpumpkin",
        // Year-round
        "franky", "icegolem"]
    return await AL.EntityModel.aggregate([
        {
            $match: {
                type: { $in: coop },
                target: { $ne: undefined }, // We only want to do these if others are doing them, too.
                serverRegion: bot.server.region,
                serverIdentifier: bot.server.name,
                lastSeen: { $gt: Date.now() - 120000 }
            }
        },
        { $addFields: { __order: { $indexOfArray: [coop, "$type"] } } },
        { $sort: { "__order": 1 } }]).exec()
}

/**
 * These are non-cooperative entities that don't spawn very often.
 * @param bot 
 * @returns 
 */
export async function getPriority2Entities(bot: AL.Character): Promise<AL.IEntity[]> {
    // NOTE: This list is ordered higher -> lower priority
    const solo: AL.MonsterName[] = [
        "goldenbat",
        // Very Rare Monsters
        "tinyp", "cutebee",
        // Event Monsters
        "pinkgoo", "wabbit",
        // Rare Monsters
        "greenjr", "jr", "skeletor", "mvampire", "fvampire", "stompy", "snowman"
    ]
    return await AL.EntityModel.aggregate([
        {
            $match: {
                type: { $in: solo },
                serverRegion: bot.server.region,
                serverIdentifier: bot.server.name,
                lastSeen: { $gt: Date.now() - 120000 }
            }
        },
        { $addFields: { __order: { $indexOfArray: [solo, "$type"] } } },
        { $sort: { "__order": 1 } }]).exec()
}

export function startBuyLoop(bot: AL.Character, itemsToBuy: AL.ItemName[] = ITEMS_TO_BUY, items: [AL.ItemName, number][] = [["hpot1", 1000], ["mpot1", 1000], ["xptome", 1]],): void {
    const pontyLocations = bot.locateNPC("secondhands")
    let lastPonty = 0
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

            // Buy things from Ponty
            if (Date.now() - CHECK_PONTY_EVERY_MS > lastPonty) {
                for (const ponty of pontyLocations) {
                    if (AL.Tools.distance(bot, ponty) > AL.Constants.NPC_INTERACTION_DISTANCE) continue
                    const pontyItems = await bot.getPontyItems()
                    lastPonty = Date.now()
                    for (const item of pontyItems) {
                        if (!item) continue

                        if (
                            item.p // Buy all shiny/glitched/etc. items
                            || itemsToBuy.includes(item.name) // Buy anything in our buy list
                        ) {
                            await bot.buyFromPonty(item)
                            continue
                        }
                    }
                }
            }

            // Buy things from other merchants
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
                        || (itemsToBuy.includes(item.name) && item.price <= cost * AL.Constants.PONTY_MARKUP) // Item is the same, or lower price than Ponty would sell it for, and we want it.
                    ) {
                        await bot.buyFromMerchant(player.id, slot, item.rid, q)
                        continue
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

export function startCompoundLoop(bot: AL.Character, itemsToSell: ItemLevelInfo = ITEMS_TO_SELL): void {
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

export function startEventLoop(bot: AL.Character): void {
    const newYearTrees = bot.locateNPC("newyear_tree")
    async function eventLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { eventLoop() }, 10)
                return
            }

            // Winter event stuff
            if (bot.S && bot.S.holidayseason && !bot.s?.holidayspirit) {
                // Get the holiday buff
                for (const tree of newYearTrees) {
                    if (AL.Tools.distance(bot, tree) > AL.Constants.NPC_INTERACTION_DISTANCE) continue
                    bot.socket.emit("interaction", { type: "newyear_tree" })
                }
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { eventLoop() }, LOOP_MS)
    }
    eventLoop()
}

export function startExchangeLoop(bot: AL.Character, itemsToExchange: AL.ItemName[]): void {
    async function exchangeLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { exchangeLoop() }, 10)
                return
            }

            if (bot.esize > 10) {
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue
                    if (!itemsToExchange.includes(item.name)) continue // Don't want / can't exchange
                    if (!bot.canExchange(item.name)) continue // Can't exchange.

                    await bot.exchange(i)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { exchangeLoop() }, LOOP_MS)
    }
    exchangeLoop()
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

            for (const [, chest] of bot.chests) {
                if (AL.Tools.distance(bot, chest) > 800) continue
                await bot.openChest(chest.id)
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
            } else if (bot?.partyData?.list && !bot.partyData.list.includes(leader)) {
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

export function startPontyLoop(bot: AL.Character, itemsToBuy: AL.ItemName[] = ITEMS_TO_BUY): void {
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

export function startSellLoop(bot: AL.Character, itemsToSell: ItemLevelInfo = ITEMS_TO_SELL): void {
    async function sellLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { sellLoop() }, 10)
                return
            }

            if (bot.canSell()) {
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
export function startSendStuffAllowlistLoop(bot: AL.Character, sendTo: AL.Character, itemsToSend: AL.ItemName[] = [], goldToHold = GOLD_TO_HOLD): void {
    async function sendStuffLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { sendStuffLoop() }, 10)
                return
            }

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
export function startSendStuffDenylistLoop(bot: AL.Character, sendTo: AL.Character, itemsToHold: AL.ItemName[] = ITEMS_TO_HOLD, goldToHold = 1_000_000): void {
    async function sendStuffLoop() {
        try {
            if (bot.socket.disconnected) {
                setTimeout(async () => { sendStuffLoop() }, 10)
                return
            }

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

export function startTrackerLoop(bot: AL.Character): void {
    async function trackerLoop() {
        if (bot.socket.disconnected) {
            setTimeout(async () => { trackerLoop() }, 10)
            return
        }

        try {
            await bot.getTrackerData()
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { trackerLoop(), CHECK_TRACKER_EVERY_MS })
    }
    // Delay startup
    setTimeout(async () => { trackerLoop(), 10000 })
}

export function startUpgradeLoop(bot: AL.Character, itemsToSell: ItemLevelInfo = ITEMS_TO_SELL): void {
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