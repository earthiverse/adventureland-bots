import AL from "alclient"
import { ItemLevelInfo } from "../definitions/bot.js"
import { offsetPositionParty } from "./locations.js"

export const LOOP_MS = 100
export const CHECK_PONTY_EVERY_MS = 10_000 /** 10 seconds */
export const CHECK_TRACKER_EVERY_MS = 600_000 /** 10 minutes */

export const GOLD_TO_HOLD = 5_000_000

export const FRIENDLY_ROGUES = ["copper", "Bjarna", "RisingVanir"]

export const MY_CHARACTERS = ["earthiverse", "earthMag", "earthMag2", "earthMag3", "earthMer", "earthMer2", "earthMer3", "earthMer4", "earthPal", "earthPri", "earthPri2", "earthRan2", "earthRan3", "earthRog", "earthRog2", "earthWar", "earthWar2", "earthWar3"]
export const ANNOUNCEMENT_CHARACTERS = ["announcement", "battleworthy", "charmingness", "decisiveness", "enlightening", "facilitating", "gratuitously", "hypothesized", "illumination", "journalistic"]
export const KOUIN_CHARACTERS = ["bataxedude", "cclair", "fathergreen", "kakaka", "kekeke", "kouin", "kukuku", "mule0", "mule1", "mule2", "mule3", "mule5", "mule6", "mule7", "mule8", "mule9", "mule10", "piredude"]
export const LOLWUTPEAR_CHARACTERS = ["fgsfds", "fsjal", "funny", "lolwutpear", "orlyowl", "over9000", "rickroll", "rule34", "shoopdawhoop", "ytmnd"]

export const ITEMS_TO_HOLD: Set<AL.ItemName> = new Set([
    // Things we keep on ourselves
    "computer", "tracker", "xptome",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1"
])

// NOTE: Level 2 lostearrings will also be exchanged in exchangeLoop
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

export const ITEMS_TO_CRAFT: Set<AL.ItemName> = new Set([
    "firestars", "resistancering", "wingedboots"
])

export const ITEMS_TO_BUY: Set<AL.ItemName> = new Set([
    // Exchangeables
    ...ITEMS_TO_EXCHANGE,
    // Belts
    "dexbelt", "intbelt", "strbelt",
    // Rings
    "cring", "ctristone", /*"dexring",*/ "goldring", /*"intring",*/ "ringofluck", "strring", "suckerpunch", "trigger", "tristone", "vring",
    // Earrings
    "cearring", "dexearring", /*"intearring",*/ "lostearring", /*"strearring",*/
    // Amulets
    "amuletofm", "dexamulet", "intamulet", "mpxamulet", "northstar", "snring", /*"stramulet",*/ "t2dexamulet", "t2intamulet", "t2stramulet",
    // Orbs
    "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull", "vorb",
    // Offhands
    "exoarm", "wbook0", "wbook1",
    // Shields
    "t2quiver", "lantern", "mshield", /*"quiver",*/ "sshield", "xshield",
    // Capes
    "angelwings", "bcape", /*"cape",*/ "ecape", "fcape", "stealthcape", "vcape",
    // Shoes
    "eslippers", "hboots", "mrnboots", "mwboots", /*"shoes1",*/ "vboots", "wingedboots", "wshoes", "xboots",
    // Pants
    /*"frankypants",*/ "hpants", "mrnpants", "mwpants", /*"pants1",*/ "starkillers", "wbreeches", "xpants",
    // Armor
    "cdragon", /*"coat1",*/ "harmor", "luckyt", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "vattire", "warpvest", "wattire", "xarmor",
    // Helmets
    "cyber", "eears", "fury", /*"helmet1",*/ "hhelmet", "mchat", "mmhat", "mphat", "mrnhat", "mwhelmet", "oxhelmet", "partyhat", "rednose", "wcap", "xhelmet",
    // Gloves
    /*"gloves1",*/ "goldenpowerglove", "handofmidas", "hgloves", "mpxgloves", "mrngloves", "mwgloves", "poker", "powerglove", "vgloves", "wgloves", "xgloves",
    // Good weapons
    "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "fireblade", "firebow", "firestaff", "firestars", "frostbow", "froststaff", "gbow", "gstaff", "harbringer", "heartwood", "hbow", "hdagger", "merry", "oozingterror", "ornamentstaff", "pinkie", "pmace", "scythe", "snowflakes", "t2bow", "t3bow", "vdagger", "vhammer", "vstaff", "vsword", "wblade",
    // Things we can exchange / craft with
    "ascale", "bfur", "cscale", "electronics", "feather0", "frogt", "goldenegg", "goldingot", "goldnugget", "ink", "leather", "lotusf", "platinumingot", "platinumnugget", "pleather", "snakefang",
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
    "bottleofxp", "bugbountybox", "computer", "confetti", "cxjar", "emotionjar", "monstertoken", "poison", "puppyer", "shadowstone", "snakeoil"
])

export const ITEMS_TO_SELL: ItemLevelInfo = {
    // Things that accumulate
    "crabclaw": 2, "frankypants": 2, "hpamulet": 2, "hpbelt": 2, "quiver": 2, "ringsj": 2, "slimestaff": 2, "stinger": 2, "throwingstars": 2, "vitearring": 2,
    // Default clothing
    "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
    // Things that are now obsolete
    "dexring": 2, "intring": 2, "intearring": 2, "strearring": 2, "stramulet": 2,
    // Field generators
    "fieldgen0": 999,
    // Snowballs
    "snowball": 999
}

// Sanity check
for (const itemName in ITEMS_TO_SELL) {
    if (ITEMS_TO_BUY.has(itemName as AL.ItemName)) {
        console.warn(`Removing ${itemName} from ITEMS_TO_BUY because it's in ITEMS_TO_SELL.`)
        delete ITEMS_TO_SELL[itemName]
    }
}

export const ITEMS_TO_PRIMLING: ItemLevelInfo = {
    "cyber": 1, "exoarm": 1, "fury": 1, "gstaff": 1, "starkillers": 1, "suckerpunch": 1, "t3bow": 1
}

export const UPGRADE_COMPOUND_LIMIT: ItemLevelInfo = {
    "lostearring": 2, // Level 2 is the best for exchanging
    "test_orb": 0, // No advantages for leveling this item
    // "throwingstars": 0, // We're going to craft them in to firey throwing stars
    "vitring": 2, // Level 2 vitrings are useful for crafting
    "vorb": 0 // No advantages for leveling this item
}

export const REPLENISHABLES_TO_BUY: [AL.ItemName, number][] = [
    ["hpot1", 1000],
    ["mpot1", 1000],
    ["xptome", 1]
]

export function getFirstEmptyInventorySlot(items: AL.ItemData[]): number {
    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item) return i
    }
    return undefined
}

/**
 * These are cooperative entities that don't spawn very often.
 * We only want to do them when others are attacking them, too.
 *
 * @param bot
 * @returns
 */
export async function getPriority1Entities(bot: AL.Character): Promise<AL.Entity[] | AL.IEntity[]> {
    // NOTE: This list is ordered higher -> lower priority
    const coop: AL.MonsterName[] = [
        // Event-based
        "dragold", "grinch", "mrgreen", "mrpumpkin",
        // Year-round
        "franky", "icegolem"]
    const nearby = []
    for (const entity of bot.getEntities({
        typeList: coop
    })) {
        if (entity.target == undefined) continue
        nearby.push(entity)
    }
    if (nearby.length > 0) return nearby
    return await AL.EntityModel.aggregate([
        {
            $match: {
                type: { $in: coop },
                target: { $ne: undefined }, // We only want to do these if others are doing them, too.
                serverRegion: bot.server.region,
                serverIdentifier: bot.server.name
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
export async function getPriority2Entities(bot: AL.Character): Promise<AL.Entity[] | AL.IEntity[]> {
    // NOTE: This list is ordered higher -> lower priority
    const solo: AL.MonsterName[] = [
        "goldenbat",
        // Very Rare Monsters
        "tinyp", "cutebee",
        // Event Monsters
        "pinkgoo", "wabbit",
        // Rare Monsters
        "greenjr", "jr", "skeletor", "mvampire", "fvampire", "snowman", "stompy"
    ]
    const nearby = bot.getEntities({
        couldGiveCredit: true,
        typeList: solo
    })
    if (nearby.length > 0) return nearby
    let partyList = [bot.id]
    if (bot.party) partyList = bot.partyData.list
    return await AL.EntityModel.aggregate([
        {
            $match: {
                type: { $in: solo },
                serverRegion: bot.server.region,
                serverIdentifier: bot.server.name
            }
        },
        {
            $match: {
                $or: [
                    { target: undefined },
                    { target: { $in: partyList } }
                ]
            }
        },
        { $addFields: { __order: { $indexOfArray: [solo, "$type"] } } },
        { $sort: { "__order": 1 } }]).exec()
}

export async function getMonsterHuntTargets(bot: AL.Character, friends: AL.Character[]): Promise<(AL.MonsterName)[]> {
    if (!bot.party) {
        // We have no party, we're doing MHs solo
        if (bot.s.monsterhunt && bot.s.monsterhunt.c > 0) return [bot.s.monsterhunt.id] // We have an active MH
        return [] // We don't have an active MH
    }

    const data: {
        id: AL.MonsterName
        ms: number
    }[] = []

    // Add monster hunts from friends
    const mhIDs = []
    for (const friend of friends) {
        if (!friend) continue
        mhIDs.push(friend.id)

        if (!friend.s.monsterhunt || friend.s.monsterhunt.c == 0) continue
        data.push(friend.s.monsterhunt)
    }

    // Add monster hunts from others in our party
    let lookupOthers = false
    for (const partyMemberID of bot.partyData.list) {
        if (!mhIDs.includes(partyMemberID)) {
            const partyMember = bot.entities.get(partyMemberID)
            if (partyMember) {
                mhIDs.push(partyMemberID)
                if (!partyMember.s.monsterhunt || partyMember.s.monsterhunt.c == 0) continue
                data.push(partyMember.s.monsterhunt)
            } else {
                lookupOthers = true
            }
        }
    }

    if (lookupOthers) {
        for (const player of await AL.PlayerModel.aggregate([
            {
                $match: {
                    $and: [
                        { lastSeen: { $gt: Date.now() - 60000 } },
                        { name: { $nin: mhIDs } },
                        { name: { $in: bot.partyData.list } },
                        { "s.monsterhunt.c": { $gt: 0 } },
                        { "s.monsterhunt.sn": `${bot.server.region} ${bot.server.name}` },
                        { serverIdentifier: bot.serverData.name },
                        { serverRegion: bot.serverData.region }
                    ]
                }
            }, {
                $addFields: {
                    monster: "$s.monsterhunt.id",
                    timeLeft: { $subtract: ["$s.monsterhunt.ms", { $subtract: [Date.now(), "$lastSeen"] }] }
                }
            }, {
                $match: {
                    timeLeft: { $gt: 0 }
                }
            }, {
                $sort: {
                    timeLeft: 1
                }
            }, {
                $project: {
                    monster: 1,
                    timeLeft: 1
                }
            }]
        ).exec()) {
            data.push({
                id: player.monster,
                ms: player.timeLeft
            })
        }
    }

    data.sort((a, b) => {
        return a.ms - b.ms
    })
    const targets: (AL.MonsterName)[] = []
    for (const datum of data) {
        targets.push(datum.id)
    }

    return targets
}

export async function goToAggroMonster(bot: AL.Character, entity: AL.Entity): Promise<unknown> {
    if (entity.target) return // It's already aggro'd

    if (entity.going_x !== undefined && entity.going_y !== undefined) {
        const distanceToTravel = AL.Tools.distance({ x: entity.x, y: entity.y }, { x: entity.going_x, y: entity.going_y })
        const lead = 20 + (LOOP_MS / 1000) * entity.speed
        if (distanceToTravel >= lead) {
            const angle = Math.atan2(entity.going_y - entity.y, entity.going_x - entity.x)
            const destination = { map: entity.map, x: entity.x + Math.cos(angle) * lead, y: entity.y + Math.sin(angle) * lead }
            if (AL.Pathfinder.canWalkPath(bot, destination)) {
                bot.move(destination.x, destination.y).catch(() => { /* Suppress errors */ })
            } else {
                return bot.smartMove(destination)
            }
        } else {
            const destination: AL.IPosition = { map: entity.map, x: entity.going_x, y: entity.going_y }
            if (AL.Pathfinder.canWalkPath(bot, destination)) {
                bot.move(destination.x, destination.y).catch(() => { /* Suppress errors */ })
            } else {
                return bot.smartMove(destination)
            }
        }
    }
}

export async function goToBankIfFull(bot: AL.Character, itemsToHold = ITEMS_TO_HOLD, goldToHold = GOLD_TO_HOLD): Promise<void> {
    if (!bot.isFull()) return // We aren't full

    await bot.smartMove("fancypots", { avoidTownWarps: true }) // Move to potion seller to give the sell loop a chance to sell things
    await bot.smartMove("items0", { avoidTownWarps: true }) // Move to bank teller to give bank time to get ready

    for (let i = 0; i < bot.isize; i++) {
        const item = bot.items[i]
        if (!item) continue // No item in this slot
        if (item.l == "l") continue // Don't send locked items
        if (itemsToHold.has(item.name)) continue

        try {
            await bot.depositItem(i)
        } catch (e) {
            console.error(e)
        }
    }

    if (bot.gold > goldToHold) await bot.depositGold(bot.gold - goldToHold)
}

export function goToKiteMonster(bot: AL.Character, options: {
    kiteDistance?: number
    stayWithinAttackingRange?: boolean
    type?: AL.MonsterName
    typeList?: AL.MonsterName[]
}): void {
    // Find the nearest entity
    let nearest: AL.Entity
    let distance: number = Number.MAX_VALUE
    for (const entity of bot.getEntities(options)) {
        const d = AL.Tools.distance(bot, entity)
        if (d < distance) {
            distance = d
            nearest = entity
        }
    }

    // If we're not near anything, don't move.
    if (!nearest) return

    // Stop smart moving when we can walk to the monster directly
    if (bot.smartMoving && (AL.Pathfinder.canWalkPath(bot, nearest) || distance < bot.range)) {
        bot.stopSmartMove().catch(() => { /* Suppress errors */ })
    }

    let kiteDistance = nearest.range + nearest.speed
    if (options?.kiteDistance) kiteDistance = options.kiteDistance
    if (options?.stayWithinAttackingRange) kiteDistance = Math.min(bot.range, kiteDistance)

    const distanceToMove = distance - kiteDistance
    const angleFromBotToMonster = Math.atan2(nearest.y - bot.y, nearest.x - bot.x)
    let potentialSpot: AL.IPosition = { map: bot.map, x: bot.x + distanceToMove * Math.cos(angleFromBotToMonster), y: bot.y + distanceToMove * Math.sin(angleFromBotToMonster) }
    let angle = 0
    while (!AL.Pathfinder.canStand(potentialSpot) && angle < Math.PI) {
        if (angle > 0) {
            angle = -angle
        } else {
            angle -= Math.PI / 180 // Increase angle by 1 degree
            angle = -angle
        }
        potentialSpot = { map: bot.map, x: bot.x + distanceToMove * Math.cos(angleFromBotToMonster + angle), y: bot.y + distanceToMove * Math.sin(angleFromBotToMonster + angle) }
    }
    if (AL.Pathfinder.canWalkPath(bot, potentialSpot)) {
        bot.move(potentialSpot.x, potentialSpot.y).catch(() => { /* Suppress errors */ })
    } else if (AL.Pathfinder.canStand(potentialSpot) && !bot.smartMoving) {
        bot.smartMove(potentialSpot).catch(() => { /* Suppress errors */ })
    }
}

export async function goToPriestIfHurt(bot: AL.Character, priest: AL.Character): Promise<AL.IPosition> {
    if (bot.hp > bot.max_hp / 2) return // We still have over half our HP
    if (!priest) return // Priest is not available

    return bot.smartMove(priest, { getWithin: priest.range })
}

export async function goToSpecialMonster(bot: AL.Character, type: AL.MonsterName): Promise<unknown> {
    // Look for it nearby
    let nearby = bot.getNearestMonster(type)
    if (nearby) return bot.smartMove(nearby.monster, { getWithin: bot.range - 10 })

    // Look for it in the server data
    if (bot.S && bot.S[type] && bot.S[type].live) {
        const destination = bot.S[type] as AL.ServerInfoDataLive
        if (AL.Tools.distance(bot, destination) > bot.range) return bot.smartMove(destination, { getWithin: bot.range - 10 })
    }

    // Look for it in our database
    const special = await AL.EntityModel.findOne({ serverIdentifier: bot.server.name, serverRegion: bot.server.region, type: type }).lean().exec()
    if (special) return bot.smartMove(special, { getWithin: bot.range - 10 })

    // Look for if there's a spawn for it
    for (const spawn of bot.locateMonster(type)) {
        // Move to the next spawn
        await bot.smartMove(spawn, { getWithin: bot.range - 10 })

        nearby = bot.getNearestMonster(type)
        if (nearby) return bot.smartMove(nearby.monster, { getWithin: bot.range - 10 })
    }
}

/**
 * Go to the potion seller NPC if we're low on potions so we can buy some
 *
 * NOTE: If you don't startBuyLoop() with a potion amount higher than minHpPots and minMpPots, we might get stuck!
 * NOTE: If you don't have enough gold, we might get stuck!
 * @param bot
 * @param minHpPotss
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

    await bot.smartMove("fancypots", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })
    await sleep(1000)
}

export async function goToNearestWalkableToMonster(bot: AL.Character, types: AL.MonsterName[], defaultPosition?: AL.IPosition, getWithin = bot.range): Promise<unknown> {
    let nearest: AL.IPosition
    let distance = Number.MAX_VALUE
    for (const entity of bot.getEntities({
        canWalkTo: true,
        couldGiveCredit: true,
        typeList: types,
        willBurnToDeath: false,
        willDieToProjectiles: false
    })) {
        const d = AL.Tools.distance(bot, entity)
        if (d < distance) {
            nearest = entity
            distance = d
        }
    }

    if (nearest && distance > getWithin) {
        const destination = offsetPositionParty(nearest, bot)
        bot.move(destination.x, destination.y).catch(() => { /* Suppress errors */ })
    } else if (!nearest && defaultPosition) {
        const destination = offsetPositionParty(defaultPosition, bot)
        if (AL.Pathfinder.canWalkPath(bot, destination)) {
            bot.move(destination.x, destination.y).catch(() => { /* Suppress errors */ })
        } else {
            return bot.smartMove(destination)
        }
    }
}

export function kiteInCircle(bot: AL.Character, type: AL.MonsterName, center: AL.IPosition, radius = 100, angle = Math.PI / 2.5): Promise<AL.IPosition> {
    if (AL.Pathfinder.canWalkPath(bot, center)) {
        const nearest = bot.getNearestMonster(type)?.monster
        if (nearest) {
            // There's a monster nearby
            const angleFromCenterToMonsterGoing = Math.atan2(nearest.going_y - center.y, nearest.going_x - center.x)
            const endGoalAngle = angleFromCenterToMonsterGoing + angle
            const endGoal = offsetPositionParty({ x: center.x + radius * Math.cos(endGoalAngle), y: center.y + radius * Math.sin(endGoalAngle) }, bot)
            bot.move(endGoal.x, endGoal.y).catch(e => console.error(e))
        } else {
            // There isn't a monster nearby
            const angleFromSpawnToBot = Math.atan2(bot.y - center.y, bot.x - center.x)
            const endGoal = offsetPositionParty({ x: center.x + radius * Math.cos(angleFromSpawnToBot), y: center.y + radius * Math.sin(angleFromSpawnToBot) }, bot)
            return bot.move(endGoal.x, endGoal.y)
        }
    } else {
        // Move to where we can walk
        return bot.smartMove(center, { getWithin: radius })
    }
}

export function moveInCircle(bot: AL.Character, center: AL.IPosition, radius = 125, angle = Math.PI / 2.5): Promise<AL.IPosition> {
    if (AL.Pathfinder.canWalkPath(bot, center)) {
        const angleFromCenterToCurrent = Math.atan2(bot.y - center.y, bot.x - center.x)
        const endGoalAngle = angleFromCenterToCurrent + angle
        const endGoal = { x: center.x + radius * Math.cos(endGoalAngle), y: center.y + radius * Math.sin(endGoalAngle) }
        return bot.move(endGoal.x, endGoal.y)

    } else {
        // Move to where we can walk
        return bot.smartMove(center, { getWithin: radius })
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function startAvoidStacking(bot: AL.Character): void {
    bot.socket.on("hit", async (data: AL.HitData) => {
        if (data.id !== bot.id) return // Not for us
        if (!data.stacked) return
        if (!data.stacked.includes(bot.id)) return // We're not the ones that are stacked

        console.info(`Moving ${bot.id} to avoid stacking!`)

        const x = -25 + Math.round(50 * Math.random())
        const y = -25 + Math.round(50 * Math.random())
        await bot.move(bot.x + x, bot.y + y).catch(() => { /* Suppress errors */ })
    })
}

export function startBuyLoop(bot: AL.Character, itemsToBuy = ITEMS_TO_BUY, replenishablesToBuy = REPLENISHABLES_TO_BUY): void {
    const pontyLocations = bot.locateNPC("secondhands")
    let lastPonty = 0
    async function buyLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (const [item, amount] of replenishablesToBuy) {
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

                    // Join new giveaways if we're a merchant
                    if (item.giveaway && bot.ctype == "merchant" && (!item.list || !item.list.includes(bot.id))) {
                        await (bot as AL.Merchant).joinGiveaway(slot, player.id, item.rid)
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

export function startBuyFriendsReplenishablesLoop(bot: AL.Character, friends: AL.Character[], replenishablesToBuy = REPLENISHABLES_TO_BUY): void {
    async function buyFriendsReplenishablesLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.hasItem("computer")) return // We can't buy potions anywhere, don't run this loop

            for (let i = 0; i < friends.length; i++) {
                const friend = friends[i]
                if (!friend) continue

                if (bot.esize == 0) break // We are full
                if (friend.hasItem("computer")) continue // They can buy their own potions.
                if (AL.Tools.distance(bot, friend) > AL.Constants.NPC_INTERACTION_DISTANCE) continue // Friend is too far away

                for (const replenishableToBuy of replenishablesToBuy) {
                    const item = replenishableToBuy[0]
                    const holdThisMany = replenishableToBuy[1]
                    const numOnFriend = friend.countItem(item)
                    if (numOnFriend >= holdThisMany) continue // They have enough already
                    if (numOnFriend == 0 && friend.esize == 0) continue // They don't have any space for this item
                    const numOnUs = bot.countItem(item)
                    const sendThisMany = holdThisMany - numOnFriend
                    const buyThisMany = sendThisMany + holdThisMany - numOnUs

                    if (sendThisMany > 0) {
                        let itemPos: number
                        if (buyThisMany > 0) itemPos = await bot.buy(item, buyThisMany)
                        else itemPos = bot.locateItem(item, bot.items, { quantityGreaterThan: sendThisMany - 1 })
                        await bot.sendItem(friend.id, itemPos, sendThisMany)
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("buyfriendspotionsloop", setTimeout(async () => { buyFriendsReplenishablesLoop() }, LOOP_MS))
    }
    buyFriendsReplenishablesLoop()
}

export function startBuyToUpgradeLoop(bot: AL.Character, item: AL.ItemName, quantity: number): void {
    async function buyToUpgradeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (let i = bot.countItem(item); i < quantity && bot.esize > 2; i++) {
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
                // We are compounding, we have to wait
                bot.timeouts.set("compoundloop", setTimeout(async () => { compoundLoop() }, bot.q.compound.ms))
                return
            }
            if (bot.map.startsWith("bank")) {
                // We are in the bank, we have to wait
                bot.timeouts.set("compoundloop", setTimeout(async () => { compoundLoop() }, LOOP_MS))
                return
            }

            const itemsByLevel = bot.locateItemsByLevel(bot.items, { excludeLockedItems: true })
            for (const dName in itemsByLevel) {
                const itemName = dName as AL.ItemName
                const gInfo = bot.G.items[itemName]
                if (gInfo.compound == undefined) continue // Not compoundable
                const level0Grade = gInfo.grades.lastIndexOf(0) + 1
                let foundOne = false
                for (let dLevel = 7; dLevel >= 0; dLevel--) {
                    const items = itemsByLevel[itemName][dLevel]
                    if (items == undefined) continue // No items of this type at this level
                    if (dLevel == UPGRADE_COMPOUND_LIMIT[itemName]) continue // We don't want to compound certain items too much. However, if it's already over that level, compound it.

                    const grade = await bot.calculateItemGrade({ level: dLevel, name: itemName })
                    const cscrollName = `cscroll${grade}` as AL.ItemName

                    if (dLevel >= 4 - level0Grade) {
                        // We don't want to compound high level items automatically
                        if (!foundOne) foundOne = true
                    } else {
                        if (items.length < 3) {
                            foundOne = true
                            continue // Not enough to compound
                        }
                        for (let i = 0; i < items.length; i++) {
                            if (!foundOne) {
                                foundOne = true
                                continue
                            }
                            if (dLevel <= itemsToSell[itemName]) continue // We don't want to compound items we want to sell

                            let cscrollPos = bot.locateItem(cscrollName)
                            const primlingPos = bot.locateItem("offeringp")
                            try {
                                if (cscrollPos == undefined && !bot.canBuy(cscrollName)) continue // We can't buy a scroll for whatever reason :(
                                else if (cscrollPos == undefined) cscrollPos = await bot.buy(cscrollName)

                                if ((ITEMS_TO_PRIMLING[itemName] && dLevel >= ITEMS_TO_PRIMLING[itemName])
                                    || ((level0Grade == 0 && dLevel >= 3) || (level0Grade == 1 && dLevel >= 2) || (level0Grade == 2 && dLevel >= 1))) {
                                    // We want to use a primling to upgrade these
                                    if (primlingPos == undefined) continue // We don't have any primlings
                                    if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as AL.Merchant).massProduction()
                                    await bot.compound(items[0], items[1], items[2], cscrollPos, primlingPos)
                                } else {
                                    // We don't want to use a primling to upgrade these
                                    if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as AL.Merchant).massProduction()
                                    await bot.compound(items[0], items[1], items[2], cscrollPos)
                                }
                                i += 2
                            } catch (e) {
                                console.error(e)
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("compoundloop", setTimeout(async () => { compoundLoop() }, LOOP_MS))
    }
    compoundLoop()
}

export function startCraftLoop(bot: AL.Character, itemsToCraft = ITEMS_TO_CRAFT): void {
    async function craftLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            for (const iName of itemsToCraft) {
                if (bot.canCraft(iName)) {
                    await bot.craft(iName)
                }
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("craftloop", setTimeout(async () => { craftLoop() }, 1000))
    }
    craftLoop()
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

        bot.timeouts.set("elixirloop", setTimeout(async () => { elixirLoop() }, 1000))
    }
    elixirLoop()
}

export function startExchangeLoop(bot: AL.Character, itemsToExchange = ITEMS_TO_EXCHANGE): void {
    async function exchangeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.q.exchange) {
                // We are exchanging, we have to wait
                bot.timeouts.set("exchangeloop", setTimeout(async () => { exchangeLoop() }, bot.q.exchange.ms))
                return
            }

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

            // Exchange level 2 lostearrings
            if (!(bot.G.maps[bot.map] as AL.GMap).mount /** Don't exchange in the bank */
                && bot.canExchange("lostearring")) {
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue
                    if (item.name !== "lostearring" || item.level !== 2) continue // Not a level 2 lost earring

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
                    if (bot.c.town || bot.s.fishing) {
                        await bot.regenHP()
                    } else if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (bot.c.town || bot.s.fishing) {
                        await bot.regenHP()
                    } else if (missingMP >= 500 && mpot1 !== undefined) {
                        await bot.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await bot.useMPPot(mpot0)
                    } else {
                        await bot.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (bot.c.town || bot.s.fishing) {
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

export function startPartyLoop(bot: AL.Character, leader: string, partyMembers?: string[]): void {
    if (bot.id == leader) {
        // Have the leader accept party requests
        bot.socket.on("request", async (data: { name: string }) => {
            try {
                if (partyMembers) {
                    if (!partyMembers.includes(data.name)) return // Discard requests from other players

                    // If there's an incoming request, and we're full, kick the lower priority characters
                    if (bot.partyData && bot.partyData.list.length >= 9) {
                        const requestPriority = partyMembers.length - partyMembers.indexOf(data.name)

                        let toKickMember: string
                        let toKickPriority = requestPriority

                        for (let i = bot.partyData.list.indexOf(bot.id) + 1; i < bot.partyData.list.length; i++) {
                            const memberName = bot.partyData.list[i]
                            if (!partyMembers.includes(memberName)) {
                                // Someone snuck in to our party
                                toKickMember = memberName
                                break
                            }

                            const memberPriority = partyMembers.length - partyMembers.indexOf(memberName)
                            if (memberPriority > toKickPriority) continue // This member has a higher priority
                            toKickPriority = memberPriority
                            toKickMember = memberName
                        }

                        if (toKickMember) {
                            // There's someone with a lower priority that we can kick
                            console.log(`Kicking ${toKickMember} so ${data.name} can join`)
                            await bot.kickPartyMember(toKickMember)
                        } else {
                            // The party is full of higher priority members
                            console.log(`Ignoring ${data.name}'s party request because we are full.`)
                            return
                        }
                    }
                }

                console.log(await bot.acceptPartyRequest(data.name))
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
                await bot.sendPartyRequest(leader)
            } else if (bot.partyData?.list && !bot.partyData.list.includes(leader)) {
                // await bot.leaveParty()
                await bot.sendPartyRequest(leader)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("partyloop", setTimeout(async () => { partyLoop() }, 1000))
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

export function startScareLoop(bot: AL.Character): void {
    async function scareLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            let incomingDamage = 0
            for (const [, entity] of bot.entities) {
                if (entity.target !== bot.id) continue
                if (AL.Tools.distance(bot, entity) > entity.range + Math.min(...bot.pings) / 500 * entity.speed) continue // Too far away from us to attack us
                incomingDamage += entity.calculateDamageRange(bot)[1]
            }

            if (bot.canUse("scare", { ignoreEquipped: true })
                && (bot.hasItem("jacko") || bot.isEquipped("jacko"))
                && (
                    bot.isScared() // We are scared
                    || (bot.s.burned && bot.s.burned.intensity > bot.max_hp / 5) // We are burning pretty badly
                    || (bot.targets > 0 && bot.c.town) // We are teleporting
                    || (bot.targets > 0 && bot.hp < bot.max_hp * 0.25) // We are low on HP
                    || (incomingDamage > bot.hp) // We could literally die with the next attack
                )) {
                // Equip the jacko if we need to
                let inventoryPos: number
                if (!bot.canUse("scare") && bot.hasItem("jacko")) {
                    inventoryPos = bot.locateItem("jacko")
                    bot.equip(inventoryPos)
                }

                // Scare, because we are scared
                bot.scare()

                // Re-equip our orb
                if (inventoryPos !== undefined) bot.equip(inventoryPos)
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("scareloop", setTimeout(async () => { scareLoop() }, Math.max(250, bot.getCooldown("scare"))))
    }

    // If we have too many targets, we can't go through doors.
    bot.socket.on("game_response", (data: AL.GameResponseData) => {
        if (typeof data == "string") {
            if (data == "cant_escape") {
                if (bot.isScared() || bot.targets >= 5) {
                    // Equip the jacko if we need to
                    let inventoryPos: number
                    if (!bot.canUse("scare") && bot.hasItem("jacko")) {
                        inventoryPos = bot.locateItem("jacko")
                        bot.equip(inventoryPos)
                    }

                    // Scare, because we are scared
                    bot.scare()

                    // Re-equip our orb
                    if (inventoryPos !== undefined) bot.equip(inventoryPos)
                }
            }
        }
    })

    scareLoop()
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
export function startSendStuffAllowlistLoop(bot: AL.Character, sendTo: string, itemsToSend: (AL.ItemName)[], goldToHold = GOLD_TO_HOLD): void {
    async function sendStuffLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            const sendToPlayer = bot.players.get(sendTo)

            if (!sendToPlayer) {
                bot.timeouts.set("sendstuffallowlistloop", setTimeout(async () => { sendStuffLoop() }, LOOP_MS))
                return
            }

            if (AL.Tools.distance(bot, sendToPlayer) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - goldToHold
                if (extraGold > 0) await bot.sendGold(sendTo, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item
                    if (!itemsToSend.includes(item.name)) continue // Only send items in our list
                    if (item.l == "l") continue // Don't send locked items

                    try {
                        await bot.sendItem(sendTo, i, item.q)
                    } catch (e) {
                        // They're probably full
                        bot.timeouts.set("sendstuffdenylistloop", setTimeout(async () => { sendStuffLoop() }, 5000))
                        return
                    }
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
export function startSendStuffDenylistLoop(bot: AL.Character, sendTo: string[], itemsToHold = ITEMS_TO_HOLD, goldToHold = 1_000_000): void {
    async function sendStuffLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return
            let sendToPlayer: AL.Player
            for (const sendToName of sendTo) {
                sendToPlayer = bot.players.get(sendToName)
                if (sendToPlayer) break
            }

            if (!sendToPlayer) {
                bot.timeouts.set("sendstuffdenylistloop", setTimeout(async () => { sendStuffLoop() }, 10000))
                return
            }

            if (AL.Tools.distance(bot, sendToPlayer) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - goldToHold
                if (extraGold > 0) await bot.sendGold(sendToPlayer.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item) continue // No item
                    if (item.l == "l") continue // Don't send locked items
                    if (itemsToHold.has(item.name)) continue // Don't send important items

                    try {
                        await bot.sendItem(sendToPlayer.id, i, item.q)
                    } catch (e) {
                        // They're probably full
                        bot.timeouts.set("sendstuffdenylistloop", setTimeout(async () => { sendStuffLoop() }, 5000))
                        return
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("sendstuffdenylistloop", setTimeout(async () => { sendStuffLoop() }, LOOP_MS))
    }
    sendStuffLoop()
}

export function startServerPartyInviteLoop(bot: AL.Character, ignore = [bot.id], sendInviteEveryMS = 300_000): void {
    const lastInvites = new Map<string, number>()
    async function serverPartyInviteLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            const players = await bot.getPlayers()
            for (const player of players) {
                if (player.name == bot.id) continue // It's us!
                if (bot.party && player.party == bot.party) continue // They're already in our party
                if (ignore.includes(player.name)) continue // Ignore
                if (ignore.includes(player.party)) continue // Ignore
                if (bot.partyData?.list?.length >= 9) break // We're full

                const lastInvite = lastInvites.get(player.name)
                if (lastInvite && lastInvite > Date.now() - sendInviteEveryMS) continue // Don't spam invites

                if (bot.party) {
                    // We have a party, let's invite more!
                    await bot.sendPartyInvite(player.name)
                    lastInvites.set(player.name, Date.now())
                } else {
                    // We don't have a party, let's invite more, or request to join theirs!
                    await bot.sendPartyInvite(player.name)
                    if (player.party) await bot.sendPartyRequest(player.name)
                    lastInvites.set(player.name, Date.now())
                }

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

            const itemsByLevel = bot.locateItemsByLevel(bot.items, { excludeLockedItems: true })
            for (const dName in itemsByLevel) {
                const itemName = dName as AL.ItemName
                const gInfo = bot.G.items[itemName]
                if (gInfo.upgrade == undefined) continue // Not upgradable
                const level0Grade = gInfo.grades.lastIndexOf(0) + 1
                let foundOne = false
                for (let dLevel = 12; dLevel >= 0; dLevel--) {
                    const items = itemsByLevel[itemName][dLevel]
                    if (items == undefined) continue // No items of this type at this level
                    if (dLevel == UPGRADE_COMPOUND_LIMIT[itemName]) continue // We don't want to upgrade certain items past certain levels. However, if it's already over that level, upgrade it.

                    const grade = await bot.calculateItemGrade({ level: dLevel, name: itemName })
                    const scrollName = `scroll${grade}` as AL.ItemName

                    if (dLevel >= 9 - level0Grade) {
                        // We don't want to upgrade high level items automatically
                        if (!foundOne) foundOne = true
                    } else {
                        for (let i = 0; i < items.length; i++) {
                            const slot = items[i]
                            if (!foundOne) {
                                foundOne = true
                                continue
                            }
                            const itemInfo = bot.items[slot]
                            if (!itemInfo.p && dLevel <= itemsToSell[itemName]) continue // We don't want to upgrade items we want to sell

                            let scrollPos = bot.locateItem(scrollName)
                            const primlingPos = bot.locateItem("offeringp")
                            try {
                                if (scrollPos == undefined && !bot.canBuy(scrollName)) continue // We can't buy a scroll for whatever reason :(
                                else if (scrollPos == undefined) scrollPos = await bot.buy(scrollName)

                                if ((ITEMS_TO_PRIMLING[itemName] && dLevel >= ITEMS_TO_PRIMLING[itemName])
                                    || ((level0Grade == 0 && dLevel >= 8) || (level0Grade == 1 && dLevel >= 6) || (level0Grade == 2 && dLevel >= 4))) {
                                    // We want to use a primling to upgrade these
                                    if (primlingPos == undefined) continue // We don't have any primlings
                                    if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as AL.Merchant).massProduction()
                                    await bot.upgrade(slot, scrollPos, primlingPos)
                                } else {
                                    // We don't want to use a primling to upgrade these
                                    if (!bot.s.massproduction && bot.canUse("massproduction")) (bot as AL.Merchant).massProduction()
                                    await bot.upgrade(slot, scrollPos)
                                }
                            } catch (e) {
                                console.error(e)
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("upgradeloop", setTimeout(async () => { upgradeLoop() }, LOOP_MS))
    }
    upgradeLoop()
}