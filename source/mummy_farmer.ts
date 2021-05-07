/* eslint-disable @typescript-eslint/no-empty-function */
import AL from "alclient"
import { startBuyLoop, startCompoundLoop, startElixirLoop, startHealLoop, startLootLoop, startPartyLoop, startSellLoop, startSendStuffDenylistLoop, startUpgradeLoop } from "./loops_general"
import { startMluckLoop } from "./loops_merchant"
import { startPartyHealLoop } from "./loops_priest"

/** Config */
const merchantName = "earthMer"
const rangerName = "earthiverse"
const warriorName = "earthWar"
const priestName = "earthPri"
const region: AL.ServerRegion = "US"
const identifier: AL.ServerIdentifier = "II"

/** Variables */
const ITEMS_TO_EXCHANGE: AL.ItemName[] = [
    // General exchangables
    "5bucks", "gem0", "gem1", "gemfragment",
    // Seashells for potions
    "seashell",
    // Leather for capes
    "leather",
    // Christmas
    "candycane", "mistletoe", "ornament",
    // Halloween
    "candy0", "candy1",
    // Chinese New Year's
    "redenvelopev3",
    // Easter
    "basketofeggs",
    // Boxes
    "armorbox", "bugbountybox", "gift0", "gift1", "mysterybox", "weaponbox", "xbox"
]

const ITEMS_TO_BUY: AL.ItemName[] = [
    // Exchangeables
    ...ITEMS_TO_EXCHANGE,
    // Belts
    "dexbelt", "intbelt", "strbelt",
    // Rings
    "ctristone", "dexring", "intring", "ringofluck", "strring", "suckerpunch", "tristone",
    // Earrings
    "dexearring", "intearring", "lostearring", "strearring",
    // Amulets
    "amuletofm", "dexamulet", "intamulet", "snring", "stramulet", "t2dexamulet", "t2intamulet", "t2stramulet",
    // Orbs
    "charmer", "ftrinket", "jacko", "orbg", "orbofdex", "orbofint", "orbofsc", "orbofstr", "rabbitsfoot", "talkingskull",
    // Shields
    "t2quiver", "lantern", "mshield", /*"quiver",*/ "sshield", "xshield",
    // Capes
    "angelwings", "bcape", "cape", "ecape", "stealthcape",
    // Shoes
    "eslippers", "hboots", "mrnboots", "mwboots", "shoes1", "wingedboots", /*"wshoes",*/ "xboots",
    // Pants
    "hpants", "mrnpants", "mwpants", "pants1", "starkillers", /*"wbreeches",*/ "xpants",
    // Armor
    "cdragon", "coat1", "harmor", "mcape", "mrnarmor", "mwarmor", "tshirt0", "tshirt1", "tshirt2", "tshirt3", "tshirt4", "tshirt6", "tshirt7", "tshirt8", "tshirt88", "tshirt9", "warpvest", /*"wattire",*/ "xarmor",
    // Helmets
    "eears", "fury", "helmet1", "hhelmet", "mrnhat", "mwhelmet", "partyhat", "rednose", /*"wcap",*/ "xhelmet",
    // Gloves
    "gloves1", "goldenpowerglove", "handofmidas", "hgloves", "mrngloves", "mwgloves", "poker", "powerglove", /*"wgloves",*/ "xgloves",
    // Good weapons
    "basher", "bataxe", "bowofthedead", "candycanesword", "carrotsword", "crossbow", "dartgun", "firebow", "frostbow", "froststaff", "gbow", "harbringer", "heartwood", "hbow", "merry", "oozingterror", "ornamentstaff", "pmace", "t2bow", "t3bow", "wblade",
    // Things we can exchange / craft with
    "ascale", "bfur", "cscale", "electronics", "feather0", "fireblade", "goldenegg", "goldingot", "goldnugget", "leather", /*"networkcard",*/ "platinumingot", "platinumnugget", "pleather", "snakefang",
    // Things to make xbox
    "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8",
    // Things to make easter basket
    "egg0", "egg1", "egg2", "egg3", "egg4", "egg5", "egg6", "egg7", "egg8",
    // Essences
    "essenceofether", "essenceoffire", "essenceoffrost", "essenceoflife", "essenceofnature",
    // Potions & consumables
    "bunnyelixir", "candypop", "elixirdex0", "elixirdex1", "elixirdex2", "elixirint0", "elixirint1", "elixirint2", "elixirluck", "elixirstr0", "elixirstr1", "elixirstr2", "greenbomb", "hotchocolate",
    // High level scrolls
    "cscroll3", "scroll3", "scroll4", "forscroll", "luckscroll", "manastealscroll",
    // Misc. Things
    "bottleofxp", "bugbountybox", "computer", "cxjar", "monstertoken", "poison", "snakeoil"
]

const ITEMS_TO_SELL: {
    /** Items this level and under will be sold */
    [T in AL.ItemName]?: number
} = {
    // Default clothing
    "shoes": 2, "pants": 2, "coat": 2, "helmet": 2, "gloves": 2,
    // Halloween
    "gphelmet": 2, "phelmet": 2
}

const MERCHANT_ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // MH Tokens
    "monstertoken",
    // Scrolls
    "cscroll0", "cscroll1", "cscroll2", "cscroll3", "scroll0", "scroll1", "scroll2", "scroll3", "scroll4", "strscroll", "intscroll", "dexscroll"
]

const PRIEST_ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // Weapons
    "firestaff", "pmace",
    // Shields
    "lantern", "shield", "sshield",
    // Orbs
    "orbg", "orbofint", "test_orb", "wbook1"
]

const RANGER_ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // Weapons
    "bow", "bowofthedead", "crossbow", "firebow", "hbow", "merry", "orbg",
    // Quivers
    "quiver", "t2quiver",
    // Orbs
    "orbg", "orbofdex", "test_orb"
]

const WARRIOR_ITEMS_TO_HOLD: AL.ItemName[] = [
    // Things we keep on ourselves
    "computer", "tracker", "stand0",
    // Boosters
    "luckbooster", "goldbooster", "xpbooster",
    // Potions
    "hpot0", "hpot1", "mpot0", "mpot1",
    // Jacko
    "jacko",
    // Weapons
    "basher", "bataxe", "candycanesword", "carrotsword", "fireblade", "heartwood", "swordofthedead", "woodensword",
    // Shields
    "lantern", "shield", "sshield",
    // Orbs
    "orbg", "orbofstr", "test_orb"
]

const mummySafe: AL.IPosition = { map: "spookytown", x: 255.5, y: -1129 }
const mummyUnsafe: AL.IPosition = { map: "spookytown", x: 255.5, y: -1131 }
let sorting

let merchant: AL.Merchant
let ranger: AL.Ranger
let warrior: AL.Warrior
let priest: AL.Priest

async function baseLoops(bot: AL.PingCompensatedCharacter) {
    sorting = (a: AL.Entity, b: AL.Entity) => {
        // Prioritize targets that won't burn to death
        if (!a.willBurnToDeath() && b.willBurnToDeath()) return 1

        // Prioritize targets that are attacking us
        if (a.target == bot.id && b.target !== bot.id) return 1

        // Prioritize targets with higher hp
        return b.hp - a.hp
    }

    startBuyLoop(bot, ITEMS_TO_BUY)
    startCompoundLoop(bot, ITEMS_TO_SELL)
    startElixirLoop(bot, "elixirluck")

    // async function exchangeLoop() {
    //     try {
    //         // TODO: Make bot.canExchange() function and replace the following line with that
    //         const hasComputer = bot.locateItem("computer") !== undefined

    //         if (hasComputer
    //             && bot.gold > 50000000) {
    //             for (let i = 0; i < bot.items.length; i++) {
    //                 if (bot.esize <= 1) break // We are full

    //                 const item = bot.items[i]
    //                 if (!item) continue
    //                 if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Don't want / can't exchange

    //                 const gInfo = bot.G.items[item.name]
    //                 if (gInfo.e !== undefined && item.q < gInfo.e) continue // Don't have enough to exchange

    //                 await bot.exchange(i)
    //             }
    //         }
    //     } catch (e) {
    //         console.error(e)
    //     }

    //     setTimeout(async () => { exchangeLoop() }, 250)
    // }
    // exchangeLoop()

    startHealLoop(bot)
    startLootLoop(bot)
    startPartyLoop(bot, merchant.id)
    startSellLoop(bot, ITEMS_TO_SELL)
    startUpgradeLoop(bot, ITEMS_TO_SELL)
}

async function startRanger(bot: AL.Ranger) {
    baseLoops(bot)

    async function attackLoop() {
        try {
            let targets: AL.Entity[] = []
            let newTargetsAmount
            const getTargets = () => {
                newTargetsAmount = bot.targets
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
                targets.sort(sorting)
            }
            const getSupershotTargets = () => {
                newTargetsAmount = bot.targets
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range * bot.G.skills.supershot.range_multiplier) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
                targets.sort(sorting)
            }

            if ((bot.targets > 2 || bot.hp / bot.max_hp < 0.5)) {
                // Scare away the enemies if we need to
                if (!bot.slots.orb || bot.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.canUse("scare")) await bot.scare()
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            } else {
                // Equip our test orb
                if (!bot.slots.orb || bot.slots.orb.name !== "test_orb") {
                    const i = bot.locateItem("test_orb")
                    if (i) await bot.equip(i)
                }
            }

            getTargets()
            if (targets.length >= 1 && bot.canUse("huntersmark") && !(targets[0]).s.marked) {
                await bot.huntersMark(targets[0].id)
            }

            getTargets()
            if (targets.length >= 5 && bot.canUse("5shot")) {
                // Let's try to 5shot
                for (let i = 0; i < 5; i++) {
                    const target = await targets[i]
                    if (target.target === undefined) newTargetsAmount += 1
                }
                if (newTargetsAmount <= 2) {
                    await bot.fiveShot(await targets[0].id, await targets[1].id, await targets[2].id, await targets[3].id, await targets[4].id)
                }
            }

            getTargets()
            if (targets.length >= 3 && bot.canUse("3shot")) {
                // Let's try to 3shot
                for (let i = 0; i < 3; i++) {
                    const target = targets[i]
                    if (target.target === undefined) newTargetsAmount += 1
                }
                if (newTargetsAmount <= 2) {
                    await bot.threeShot(targets[0].id, targets[1].id, targets[2].id)
                }
            }

            getTargets()
            if (targets.length >= 1 && bot.canUse("attack")) {
                // Let's try to attack
                await bot.basicAttack(targets[0].id)
            }

            getSupershotTargets()
            if (targets.length >= 1 && bot.canUse("supershot")) {
                // Let's try to supershot
                await bot.superShot(targets[0].id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
    }
    attackLoop()

    async function moveLoop() {
        try {
            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            if (!AL.Pathfinder.canWalkPath(bot, mummySafe)) {
                await bot.smartMove(mummySafe)
            }

            let nearbyMummyLevel = 0
            for (const [, entity] of bot.entities) {
                if (entity.type !== "mummy") continue

                nearbyMummyLevel = Math.max(nearbyMummyLevel, entity.level)
            }

            // if (nearbyMummyLevel <= 1) {
            //     // All mummies are probably level 1.
            //     bot.move(mummyUnsafe.x - 20, mummyUnsafe.y).then(() => { })
            // } else {
            // We need to delevel mummies safely
            bot.move(mummySafe.x - 20, mummySafe.y).catch(() => { }).then(() => { })
            // }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    startSendStuffDenylistLoop(bot, merchant, RANGER_ITEMS_TO_HOLD, 1_000_000)
}

async function startWarrior(bot: AL.Warrior) {
    baseLoops(bot)

    async function attackLoop() {
        try {
            let targets: AL.Entity[] = []
            const getTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
                targets.sort(sorting)
            }
            const shouldAgitate = () => {
                let should = false
                for (const [, entity] of bot.entities) {
                    if (AL.Tools.distance(bot, entity) < bot.G.skills.agitate.range) continue // Out of range, won't be agitated
                    if (entity.type !== "mummy") return false
                    if (entity.target !== bot.target) should = true
                }
                return should
            }
            const getCleaveTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.G.skills.cleave.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
            }
            const getTauntTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (entity.target !== undefined) continue // We're only interested in entities without a current target
                    if (AL.Tools.distance(bot, entity) > bot.G.skills.taunt.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
            }

            if ((bot.hp / bot.max_hp < 0.5)) {
                // Scare away the enemies if we need to
                if (!bot.slots.orb || bot.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.canUse("scare")) await bot.scare()
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            } else {
                // Equip our test orb
                if (!bot.slots.orb || bot.slots.orb.name !== "test_orb") {
                    const i = bot.locateItem("test_orb")
                    if (i) await bot.equip(i)
                }
            }

            if (shouldAgitate() && bot.canUse("agitate")) {
                await bot.agitate()
            }

            getTauntTargets()
            if (targets.length >= 1 && bot.canUse("taunt") && bot.targets <= 4) {
                await bot.taunt(targets[0].id)
            }

            getCleaveTargets()
            if (targets.length >= 2 && bot.canUse("cleave")) {
                await bot.cleave()
            }

            getTargets()
            if (targets.length >= 1 && bot.canUse("attack")) {
                // Let's try to attack
                await bot.basicAttack(targets[0].id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
    }
    attackLoop()

    async function moveLoop() {
        try {
            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            if (!AL.Pathfinder.canWalkPath(bot, mummySafe)) {
                await bot.smartMove(mummySafe)
            }

            let nearbyMummyLevel = 0
            for (const [, entity] of bot.entities) {
                if (entity.type !== "mummy") continue

                nearbyMummyLevel = Math.max(nearbyMummyLevel, entity.level)
            }

            if (nearbyMummyLevel == 1) {
                // All mummies are probably level 1.
                bot.move(mummyUnsafe.x, mummyUnsafe.y).catch(() => { }).then(() => { })
            } else {
                // We need to delevel mummies safely
                bot.move(mummySafe.x, mummySafe.y).catch(() => { }).then(() => { })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    startSendStuffDenylistLoop(bot, merchant, WARRIOR_ITEMS_TO_HOLD, 1_000_000)
}

async function startPriest(bot: AL.Priest) {
    baseLoops(bot)

    async function attackLoop() {
        try {
            let targets: AL.Entity[] = []
            const getTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
                targets.sort((a, b) => {
                    // Prioritize targets that won't burn to death
                    if (!a.willBurnToDeath() && b.willBurnToDeath()) return 1

                    // Prioritize targets that are attacking us
                    if (a.target == warrior.id && b.target !== warrior.id) return 1

                    // Prioritize targets with lower hp
                    return a.hp - b.hp
                })
            }

            let friendToHeal: AL.PingCompensatedCharacter
            let friendHpRatio = 1
            for (const friend of [bot, ranger, warrior, merchant]) {
                if (AL.Tools.distance(bot, friend) > bot.range) continue // Our friend is too far away to be healed
                const hpRatio = friend.hp / friend.max_hp
                if (hpRatio > 0.8) continue // Our friend has enough HP
                if (hpRatio < friendHpRatio) {
                    // Let's heal the friend with the lowest HP
                    friendToHeal = friend
                    friendHpRatio = hpRatio
                }
            }
            if (friendToHeal && bot.canUse("heal")) {
                await bot.heal(friendToHeal.id)
            }

            if ((bot.targets > 2 || bot.hp / bot.max_hp < 0.5)) {
                // Scare away the enemies if we need to
                if (!bot.slots.orb || bot.slots.orb.name !== "jacko") {
                    const i = bot.locateItem("jacko")
                    if (i) await bot.equip(i)
                }
                if (bot.canUse("scare")) await bot.scare()
                setTimeout(async () => { attackLoop() }, bot.getCooldown("scare"))
                return
            } else {
                // Equip our test orb
                if (!bot.slots.orb || bot.slots.orb.name !== "test_orb") {
                    const i = bot.locateItem("test_orb")
                    if (i) await bot.equip(i)
                }
            }

            getTargets()
            if (targets.length >= 1 && bot.canUse("curse") && !targets[0].s.cursed) {
                await bot.curse(await targets[0].id)
            }

            getTargets()
            if (targets.length >= 1 && bot.canUse("attack")) {
                // Let's try to attack
                await bot.basicAttack(targets[0].id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { attackLoop() }, bot.getCooldown("attack"))
    }
    attackLoop()

    async function moveLoop() {
        try {
            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            if (!AL.Pathfinder.canWalkPath(bot, mummySafe)) {
                await bot.smartMove(mummySafe)
            }

            let nearbyMummyLevel = 0
            for (const [, entity] of bot.entities) {
                if (entity.type !== "mummy") continue

                nearbyMummyLevel = Math.max(nearbyMummyLevel, entity.level)
            }

            // if (nearbyMummyLevel == 1) {
            //     // All mummies are probably level 1.
            //     bot.move(mummyUnsafe.x + 20, mummySafe.y).then(() => { })
            // } else {
            // We need to delevel mummies safely
            bot.move(mummySafe.x + 20, mummySafe.y).catch(() => { }).then(() => { })
            // }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    startPartyHealLoop(bot, [priest, ranger, warrior, merchant])
    startSendStuffDenylistLoop(bot, merchant, PRIEST_ITEMS_TO_HOLD, 1_000_000)
}

async function startMerchant(bot: AL.Merchant) {
    baseLoops(bot)

    bot.socket.on("request", (data: { name: string }) => {
        bot.acceptPartyRequest(data.name)
    })

    async function craftLoop() {
        try {
            // Prevent the bank filling up with a lot of smokes
            if (bot.gold > 25000000 && bot.canCraft("pouchbow")) {
                await bot.craft("pouchbow")
            } else if (bot.gold > 25000000 && bot.hasItem("smoke")) {
                if (!bot.isFull() && !bot.hasItem("bow", bot.items, { level: 0 })) {
                    await bot.buy("bow")
                    await bot.craft("pouchbow")
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { craftLoop() }, 250)
    }
    craftLoop()

    startMluckLoop(bot)

    async function moveLoop() {
        try {
            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            await bot.smartMove({ map: mummySafe.map, x: mummySafe.x, y: mummySafe.y + 20 })
            bot.openMerchantStand()
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
    const warriorP = AL.Game.startWarrior(warriorName, region, identifier)
    const priestP = AL.Game.startPriest(priestName, region, identifier)
    merchant = await merchantP
    ranger = await rangerP
    warrior = await warriorP
    priest = await priestP

    // Set up functionality to reconnect if we disconnect
    const reconnect = async (bot: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${bot.id}...`)
        try {
            await bot.disconnect()
            await new Promise(resolve => setTimeout(resolve, 5000))
            await bot.connect()
            bot.socket.on("disconnect", async () => { await reconnect(bot) })
        } catch (e) {
            console.error(e)
            await new Promise(resolve => setTimeout(resolve, 5000))
            reconnect(bot)
        }
    }
    merchant.socket.on("disconnect", async () => { await reconnect(merchant) })
    ranger.socket.on("disconnect", async () => { await reconnect(ranger) })
    warrior.socket.on("disconnect", async () => { await reconnect(warrior) })
    priest.socket.on("disconnect", async () => { await reconnect(priest) })

    // Start the characters
    startMerchant(merchant)
    startRanger(ranger)
    startWarrior(warrior)
    startPriest(priest)
}
run()