/* eslint-disable @typescript-eslint/no-empty-function */
import AL from "alclient"
import { Entity } from "alclient/build/Entity"

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
    "5bucks", "gem0", "gem1",
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
    sorting = (a: Entity, b: Entity) => {
        // Prioritize targets that won't burn to death
        if (!a.willBurnToDeath() && b.willBurnToDeath()) return 1

        // Prioritize targets that are attacking us
        if (a.target == bot.id && b.target !== bot.id) return 1

        // Prioritize targets with higher hp
        return b.hp - a.hp
    }

    async function elixirLoop() {
        try {
            if (bot.ctype == "merchant") return // Don't buy or equip an elixir if we're a merchant.

            if (!bot.slots.elixir) {
                let luckElixir = bot.locateItem("elixirluck")
                if (luckElixir == undefined && bot.canBuy("elixirluck")) luckElixir = await bot.buy("elixirluck")
                if (luckElixir !== undefined) await bot.equip(luckElixir)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { elixirLoop() }, 1000)
    }
    elixirLoop()

    async function exchangeLoop() {
        try {
            // TODO: Make bot.canExchange() function and replace the following line with that
            const hasComputer = bot.locateItem("computer") !== undefined

            if (hasComputer
                && bot.gold > 50000000) {
                for (let i = 0; i < bot.items.length; i++) {
                    if (bot.esize <= 1) break // We are full

                    const item = bot.items[i]
                    if (!item) continue
                    if (!ITEMS_TO_EXCHANGE.includes(item.name)) continue // Don't want / can't exchange

                    const gInfo = bot.G.items[item.name]
                    if (gInfo.e !== undefined && item.q < gInfo.e) continue // Don't have enough to exchange

                    await bot.exchange(i)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { exchangeLoop() }, 250)
    }
    exchangeLoop()

    async function healLoop() {
        try {
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
                    if (missingHP >= 400 && hpot1 !== undefined) {
                        await bot.useHPPot(hpot1)
                    } else if (missingHP >= 200 && hpot0 !== undefined) {
                        await bot.useHPPot(hpot0)
                    } else {
                        await bot.regenHP()
                    }
                } else if (mpRatio < hpRatio) {
                    if (missingMP >= 500 && mpot1 !== undefined) {
                        await bot.useMPPot(mpot1)
                    } else if (missingMP >= 300 && mpot0 !== undefined) {
                        await bot.useMPPot(mpot0)
                    } else {
                        await bot.regenMP()
                    }
                } else if (hpRatio < 1) {
                    if (missingHP >= 400 && hpot1 !== undefined) {
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

        setTimeout(async () => { healLoop() }, Math.max(bot.getCooldown("use_hp"), 10))
    }
    healLoop()

    async function lootLoop() {
        try {
            for (const [, chest] of bot.chests) {
                if (AL.Tools.distance(bot, chest) > 800) continue
                await bot.openChest(chest.id)
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 250)
    }
    lootLoop()

    async function partyLoop() {
        try {
            if (!bot.party) {
                bot.sendPartyRequest(merchant.id)
            } else if (bot.party !== merchant.id) {
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

    async function upgradeLoop() {
        try {
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
                const itemPos = duplicates[itemName][0]
                const itemInfo = bot.items[itemPos]
                if (itemInfo.level >= 8) continue // We don't want to upgrade past level 8 automatically.
                if (ITEMS_TO_SELL[itemName] && !itemInfo.p && itemInfo.level < ITEMS_TO_SELL[itemName]) continue // Don't upgrade items we want to sell unless it's special

                // Figure out the scroll we need to upgrade
                const grade = bot.calculateItemGrade(itemInfo)
                const scrollName = `scroll${grade}` as AL.ItemName
                let scrollPos = bot.locateItem(scrollName)
                try {
                    if (scrollPos == undefined && !bot.canBuy(scrollName)) continue // We can't buy a scroll for whatever reason :(
                    else if (scrollPos == undefined) scrollPos = await bot.buy(scrollName)

                    // Upgrade!
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

async function startRanger(bot: AL.Ranger) {
    baseLoops(bot)

    async function attackLoop() {
        try {
            let targets: Entity[] = []
            let newTargetsAmount
            const getTargets = () => {
                newTargetsAmount = bot.targets
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles)) continue // It will die to incoming projectiles

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
                    if (entity.willDieToProjectiles(bot.projectiles)) continue // It will die to incoming projectiles

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

            if (!AL.Pathfinder.canWalk(bot, mummySafe)) {
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
            bot.move(mummySafe.x - 20, mummySafe.y).then(() => { })
            // }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (!merchant || merchant.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(merchant.id)
            if (sendTo && AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || RANGER_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(merchant.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function startWarrior(bot: AL.Warrior) {
    baseLoops(bot)

    async function attackLoop() {
        try {
            let targets: Entity[] = []
            const getTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles)) continue // It will die to incoming projectiles

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
                    if (entity.willDieToProjectiles(bot.projectiles)) continue // It will die to incoming projectiles

                    targets.push(entity)
                }
            }
            const getTauntTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (entity.target !== undefined) continue // We're only interested in entities without a current target
                    if (AL.Tools.distance(bot, entity) > bot.G.skills.taunt.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles)) continue // It will die to incoming projectiles

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

            if (!AL.Pathfinder.canWalk(bot, mummySafe)) {
                await bot.smartMove(mummySafe)
            }

            let nearbyMummyLevel = 0
            for (const [, entity] of bot.entities) {
                if (entity.type !== "mummy") continue

                nearbyMummyLevel = Math.max(nearbyMummyLevel, entity.level)
            }

            if (nearbyMummyLevel == 1) {
                // All mummies are probably level 1.
                bot.move(mummyUnsafe.x, mummyUnsafe.y).then(() => { })
            } else {
                // We need to delevel mummies safely
                bot.move(mummySafe.x, mummySafe.y).then(() => { })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function sendItemLoop() {
        try {
            if (!merchant || merchant.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(merchant.id)
            if (sendTo && AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || WARRIOR_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(merchant.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()
}

async function startPriest(bot: AL.Priest) {
    baseLoops(bot)

    async function attackLoop() {
        try {
            let targets: Entity[] = []
            const getTargets = () => {
                targets = []
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue // We're only interested in mummies
                    if (AL.Tools.distance(bot, entity) > bot.range) continue // It's too far away to attack
                    if (entity.willDieToProjectiles(bot.projectiles)) continue // It will die to incoming projectiles

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

            if (!AL.Pathfinder.canWalk(bot, mummySafe)) {
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
            bot.move(mummySafe.x + 20, mummySafe.y).then(() => { })
            // }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 250)
    }
    moveLoop()

    async function partyHealLoop() {
        try {
            if (bot.c.town) {
                setTimeout(async () => { partyHealLoop() }, bot.c.town.ms)
                return
            }

            if (bot.canUse("partyheal")) {
                for (const friend of [priest, ranger, warrior, merchant]) {
                    if (friend.party !== bot.party) continue // Our priest isn't in the same party!?
                    if (friend.rip) continue // Party member is already dead
                    if (friend.hp < friend.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await priest.partyHeal()
                        break
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { partyHealLoop() }, Math.max(bot.getCooldown("partyheal"), 10))
    }
    partyHealLoop()

    async function sendItemLoop() {
        try {
            if (!merchant || merchant.isFull()) {
                setTimeout(async () => { sendItemLoop() }, 10000)
                return
            }

            const sendTo = bot.players.get(merchant.id)
            if (sendTo && AL.Tools.distance(bot, sendTo) < AL.Constants.NPC_INTERACTION_DISTANCE) {
                const extraGold = bot.gold - 1000000
                if (extraGold > 0) await bot.sendGold(merchant.id, extraGold)
                for (let i = 0; i < bot.items.length; i++) {
                    const item = bot.items[i]
                    if (!item || PRIEST_ITEMS_TO_HOLD.includes(item.name)) continue // Don't send important items

                    await bot.sendItem(merchant.id, i, item.q)
                }
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { sendItemLoop() }, 1000)
    }
    sendItemLoop()

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

    async function mluckLoop() {
        try {
            if (bot.canUse("mluck")) {
                if (!bot.s.mluck || bot.s.mluck.f !== bot.id) await bot.mluck(bot.id) // mluck ourself

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

        setTimeout(async () => { mluckLoop() }, 250)
    }
    mluckLoop()

    async function moveLoop() {
        try {
            // If we are dead, respawn
            if (bot.rip) {
                await bot.respawn()
                setTimeout(async () => { moveLoop() }, 1000)
                return
            }

            await bot.smartMove({ map: mummySafe.map, x: mummySafe.x, y: mummySafe.y + 20 })
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
    const rangerP = AL.Game.startRanger(rangerName, region, identifier)
    const warriorP = AL.Game.startWarrior(warriorName, region, identifier)
    const priestP = AL.Game.startPriest(priestName, region, identifier)
    merchant = await merchantP
    ranger = await rangerP
    warrior = await warriorP
    priest = await priestP

    // Set up functionality to reconnect if we disconnect
    // TODO: Add a delay
    const reconnect = async (bot: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${bot.id}...`)
        try {
            await bot.disconnect()
            await new Promise(resolve => setTimeout(resolve, 5000))
            await bot.connect()
        } catch (e) {
            console.error(e)
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