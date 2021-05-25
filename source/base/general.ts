import AL from "alclient-mongo"
import { ItemLevelInfo } from "../definitions/bot"

export const LOOP_MS = 100
export const CHECK_PONTY_EVERY_MS = 10_000 /** 10 seconds */
export const CHECK_TRACKER_EVERY_MS = 600_000 /** 10 minutes */

export const GOLD_TO_HOLD = 5_000_000

export const ITEMS_TO_HOLD: Set<AL.ItemName> = new Set([
    // Things we keep on ourselves
    "computer", "tracker", "xptome",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1"
])

export const ITEMS_TO_EXCHANGE: Set<AL.ItemName> = new Set([
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
])
export const ITEMS_TO_BUY: Set<AL.ItemName> = new Set([
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
    "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull", "vorb",
    // Offhands
    "exoarm", "wbook0", "wbook1",
    // Shields
    "t2quiver", "lantern", "mshield", "quiver", "sshield", "xshield",
    // Capes
    "angelwings", "bcape", "cape", "ecape", "fcape", "stealthcape", "vcape",
    // Shoes
    "eslippers", "hboots", "mrnboots", "mwboots", "shoes1", "vboots", "wingedboots", "wshoes", "xboots",
    // Pants
    "frankypants", "hpants", "mrnpants", "mwpants", "pants1", "starkillers", "wbreeches", "xpants",
    // Armor
    "cdragon", "coat1", "harmor", "luckyt", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "vattire", "warpvest", "wattire", "xarmor",
    // Helmets
    "cyber", "eears", "fury", "helmet1", "hhelmet", "mchat", "mmhat", "mphat", "mrnhat", "mwhelmet", "oxhelmet", "partyhat", "rednose", "wcap", "xhelmet",
    // Gloves
    "gloves1", "goldenpowerglove", "handofmidas", "hgloves", "mpxgloves", "mrngloves", "mwgloves", "poker", "powerglove", "vgloves", "wgloves", "xgloves",
    // Good weapons
    "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "fireblade", "firebow", "firestaff", "firestars", "frostbow", "froststaff", "gbow", "gstaff", "harbringer", "heartwood", "hbow", "hdagger", "merry", "oozingterror", "ornamentstaff", "pinkie", "pmace", "scythe", "t2bow", "t3bow", "vdagger", "vhammer", "vstaff", "vsword", "wblade",
    // Things we can exchange / craft with
    "ascale", "bfur", "cscale", "electronics", "feather0", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", "platinumingot", "platinumnugget", "pleather", "snakefang",
    // Things to make xbox
    "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
    // Things to make easter basket
    "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
    // Essences
    "essenceofether", "essenceoffire", "essenceoffrost", "essenceofgreed", "essenceoflife", "essenceofnature", "offering", "offeringp", "offeringx",
    // Potions & consumables
    "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate", "vblood",
    // High level scrolls
    "cscroll3", "scroll3", "scroll4", "forscroll", "luckscroll", "manastealscroll",
    // Merchant Tools
    "pickaxe", "rod",
    // Misc. Things
    "bottleofxp", "bugbountybox", "computer", "confetti", "cxjar", "emotionjar", "monstertoken", "poison", "puppyer", "snakeoil"
])

export const ITEMS_TO_SELL: ItemLevelInfo = {
    // Default clothing
    "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
    // Field generators
    "fieldgen0": 999,
    // Snowballs
    "snowball": 999
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

/**
 * Go to the potion seller NPC if we're low on potions so we can buy some
 * 
 * NOTE: If you don't startBuyLoop() with a potion amount higher than minHpPots and minMpPots, we might get stuck!
 * NOTE: If you don't have enough gold, we might get stuck!
 * @param bot 
 * @param minHpPots 
 * @param minMpPots 
 * @returns 
 */
export async function goToPoitonSellerIfLow(bot: AL.Character, minHpPots = 100, minMpPots = 100): Promise<void> {
    if (bot.hasItem("computer")) return // Don't need to move if we have a computer

    const currentHpPots = bot.countItem("hpot1")
    const currentMpPots = bot.countItem("mpot1")

    if (currentHpPots >= minHpPots && currentMpPots >= minMpPots) return // We don't need any more.

    // We're under the minimum, go buy potions
    await bot.smartMove("fancypots", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
    await sleep(1000)
}

/**
 * Go near an NPC so we can sell our unwanted items.
 * 
 * NOTE: If you don't startSellItemLoop(), we might get stuck!
 * @param bot 
 * @param itemsToSell 
 * @returns 
 */
export async function goToNPCShopIfFull(bot: AL.Character, itemsToSell = ITEMS_TO_SELL): Promise<void> {
    if (!bot.isFull()) return // Not full
    if (bot.hasItem("computer")) return // We don't need to move if we have a computer

    let hasSellableItem = false
    for (const item of bot.items) {
        if (!item) continue
        if (itemsToSell[item.name]) {
            // We have something we could sell to make room
            hasSellableItem = true
            break
        }
    }
    if (!hasSellableItem) return // We don't have anything to sell

    // TODO: Find the closest shop
    await bot.smartMove("fancypots", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
    await sleep(1000)
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function startAvoidStacking(bot: AL.Character): void {
    bot.socket.on("hit", async (data: AL.HitData) => {
        if (!data.stacked) return
        if (!data.stacked.includes(bot.id)) return // We're not the ones that are stacked

        console.info(`Moving ${bot.id} to avoid stacking!`)

        const x = -25 + Math.round(50 * Math.random())
        const y = -25 + Math.round(50 * Math.random())
        await bot.move(bot.x + x, bot.y + y).catch(() => { /* Suppress errors */ })
    })
}

export function startBuyLoop(bot: AL.Character, itemsToBuy = ITEMS_TO_BUY, itemsToBuy2: [AL.ItemName, number][] = [["hpot1", 1000], ["mpot1", 1000], ["xptome", 1]]): void {
    const pontyLocations = bot.locateNPC("secondhands")
    let lastPonty = 0
    async function buyLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (const [item, amount] of itemsToBuy2) {
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
                            || itemsToBuy.has(item.name) // Buy anything in our buy list
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
                        || (itemsToBuy.has(item.name) && item.price <= cost * AL.Constants.PONTY_MARKUP) // Item is the same, or lower price than Ponty would sell it for, and we want it.
                    ) {
                        await bot.buyFromMerchant(player.id, slot, item.rid, q)
                        continue
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("buyloop", setTimeout(async () => { buyLoop() }, LOOP_MS))
    }
    buyLoop()
}

export function startBuyToUpgradeLoop(bot: AL.Character, item: AL.ItemName, quantity: number): void {
    async function buyToUpgradeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (let i = bot.countItem(item); i < quantity; i++) {
                if (bot.canBuy(item)) await bot.buy(item)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("upgradeloop", setTimeout(async () => { buyToUpgradeLoop() }, LOOP_MS))
    }
    buyToUpgradeLoop()
}

export function startCompoundLoop(bot: AL.Character, itemsToSell: ItemLevelInfo = ITEMS_TO_SELL): void {
    async function compoundLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.q.compound) {
                // We are upgrading, we have to wait
                bot.timeouts.set("compoundloop", setTimeout(async () => { compoundLoop() }, bot.q.compound.ms))
                return
            }
            if (bot.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                bot.timeouts.set("compoundloop", setTimeout(async () => { compoundLoop() }, LOOP_MS))
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

        bot.timeouts.set("compoundloop", setTimeout(async () => { compoundLoop() }, LOOP_MS))
    }
    compoundLoop()
}

export function startElixirLoop(bot: AL.Character, elixir: AL.ItemName): void {
    async function elixirLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.slots.elixir) {
                let drinkThis = bot.locateItem(elixir)
                if (drinkThis == undefined && bot.canBuy(elixir)) drinkThis = await bot.buy(elixir)
                if (drinkThis !== undefined) await bot.equip(drinkThis)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("elixirloop", setTimeout(async () => { elixirLoop() }, LOOP_MS))
    }
    elixirLoop()
}

export function startEventLoop(bot: AL.Character): void {
    const newYearTrees = bot.locateNPC("newyear_tree")
    async function eventLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

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
        bot.timeouts.set("eventloop", setTimeout(async () => { eventLoop() }, LOOP_MS))
    }
    eventLoop()
}

export function startExchangeLoop(bot: AL.Character, itemsToExchange = ITEMS_TO_EXCHANGE): void {
    async function exchangeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.esize > 10 /** Only exchange if we have plenty of space */
                && !(bot.G.maps[bot.map] as AL.GMap).mount /** Don't exchange in the bank */) {
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue
                    if (!itemsToExchange.has(item.name)) continue // Don't want / can't exchange
                    if (!bot.canExchange(item.name)) continue // Can't exchange.

                    await bot.exchange(i)
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("exchangeloop", setTimeout(async () => { exchangeLoop() }, LOOP_MS))
    }
    exchangeLoop()
}

export function startHealLoop(bot: AL.Character): void {
    async function healLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

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

        bot.timeouts.set("healloop", setTimeout(async () => { healLoop() }, Math.max(LOOP_MS, bot.getCooldown("use_hp"))))
    }
    healLoop()
}

export function startLootLoop(bot: AL.Character): void {
    async function lootLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (const [, chest] of bot.chests) {
                if (AL.Tools.distance(bot, chest) > 800) continue
                await bot.openChest(chest.id)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("lootloop", setTimeout(async () => { lootLoop() }, LOOP_MS))
    }
    lootLoop()
}

export function startPartyLoop(bot: AL.Character, leader: string, partyMembers?: Set<string>): void {
    if (bot.id == leader) {
        // Have the leader accept party requests
        bot.socket.on("request", async (data: { name: string }) => {
            if (!partyMembers?.has(data.name)) return // Discard requests from other players

            try {
                await bot.acceptPartyRequest(data.name)
            } catch (e) {
                console.error(e)
            }
        })
        return
    }
    async function partyLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.party) {
                bot.sendPartyRequest(leader)
            } else if (bot.partyData?.list && !bot.partyData.list.includes(leader)) {
                bot.leaveParty()
                bot.sendPartyRequest(leader)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("partyloop", setTimeout(async () => { partyLoop() }, 10000))
    }
    partyLoop()
}

export function startPartyInviteLoop(bot: AL.Character, player: string): void {
    async function partyInviteLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.partyData?.list && !bot.partyData.list.includes(player) /** Only invite if they're missing */
                && bot.partyData.list.length < 9 /** Don't invite if we're at capacity */) {
                bot.sendPartyInvite(player)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("partyinviteloop", setTimeout(async () => { partyInviteLoop() }, 10000))
    }
    partyInviteLoop()
}

export function startPontyLoop(bot: AL.Character, itemsToBuy = ITEMS_TO_BUY): void {
    const ponty = bot.locateNPC("secondhands")[0]
    async function pontyLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (AL.Tools.distance(bot, ponty) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const pontyData = await bot.getPontyItems()
                for (const item of pontyData) {
                    if (itemsToBuy.has(item.name)) {
                        await bot.buyFromPonty(item)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("pontyloop", setTimeout(async () => { pontyLoop() }, 10000))
    }
    pontyLoop()
}

export function startSellLoop(bot: AL.Character, itemsToSell: ItemLevelInfo = ITEMS_TO_SELL): void {
    async function sellLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canSell()) {
                // Sell things
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item in this slot
                    if (item.p) continue // This item is special in some way
                    if (itemsToSell[item.name] == undefined) continue // We don't want to sell this item
                    if (item.level && itemsToSell[item.name] <= item.level) continue // Keep this item, it's a high enough level that we want to keep it

                    const q = bot.items[i].q !== undefined ? bot.items[i].q : 1

                    await bot.sell(i, q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("sellloop", setTimeout(async () => { sellLoop() }, LOOP_MS))
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
export function startSendStuffAllowlistLoop(bot: AL.Character, sendTo: AL.Character, itemsToSend: AL.ItemName[], goldToHold = GOLD_TO_HOLD): void {
    async function sendStuffLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (sendTo.isFull()) {
                bot.timeouts.set("sendstuffallowlistloop", setTimeout(async () => { sendStuffLoop() }, LOOP_MS))
                return
            }

            if (AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - goldToHold
                if (extraGold > 0) await bot.sendGold(sendTo.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || !itemsToSend.includes(item.name)) continue // Only send items in our list
                    if (item.l == "l") continue // Don't send locked items

                    await bot.sendItem(sendTo.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("sendstuffallowlistloop", setTimeout(async () => { sendStuffLoop() }, LOOP_MS))
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
export function startSendStuffDenylistLoop(bot: AL.Character, sendTo: AL.Character, itemsToHold = ITEMS_TO_HOLD, goldToHold = 1_000_000): void {
    async function sendStuffLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!sendTo || sendTo.isFull()) {
                bot.timeouts.set("sendstuffdenylistloop", setTimeout(async () => { sendStuffLoop() }, 10000))
                return
            }

            if (AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - goldToHold
                if (extraGold > 0) await bot.sendGold(sendTo.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || itemsToHold.has(item.name)) continue // Don't send important items
                    if (item.l == "l") continue // Don't send locked items

                    await bot.sendItem(sendTo.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("sendstuffdenylistloop", setTimeout(async () => { sendStuffLoop() }, LOOP_MS))
    }
    sendStuffLoop()
}

export function startServerPartyInviteLoop(bot: AL.Character, ignore = [bot.id]): void {
    async function serverPartyInviteLoop() {
        try {
            const players = await bot.getPlayers()
            for (const player of players) {
                if (player.party == bot.id) continue // They're already in our party
                if (player.type == "merchant") continue // We don't want any merchants
                if (ignore.includes(player.name)) continue // Ignore
                if (bot.partyData?.list?.length >= 9) break // We're full

                await bot.sendPartyInvite(player.name)
                await sleep(1000)
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("serverpartyinviteloop", setTimeout(async () => { serverPartyInviteLoop() }, 1000))
    }
    serverPartyInviteLoop()
}

export function startTrackerLoop(bot: AL.Character): void {
    async function trackerLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.hasItem("tracker")) {
                await bot.getTrackerData()
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("trackerloop", setTimeout(async () => { trackerLoop() }, CHECK_TRACKER_EVERY_MS))
    }
    trackerLoop()
}

export function startUpgradeLoop(bot: AL.Character, itemsToSell: ItemLevelInfo = ITEMS_TO_SELL): void {
    async function upgradeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.q.upgrade) {
                // We are upgrading, we have to wait
                bot.timeouts.set("upgradeloop", setTimeout(async () => { upgradeLoop() }, bot.q.upgrade.ms))
                return
            }
            if (bot.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                bot.timeouts.set("upgradeloop", setTimeout(async () => { upgradeLoop() }, LOOP_MS))
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

        bot.timeouts.set("upgradeloop", setTimeout(async () => { upgradeLoop() }, LOOP_MS))
    }
    upgradeLoop()
}