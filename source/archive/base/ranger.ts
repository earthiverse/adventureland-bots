import AL, { Character, Entity, Mage, MonsterName, Ranger } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sortPriority } from "../../base/sort.js"

export async function attackTheseTypesRanger(bot: Ranger, types: MonsterName[], friends: Character[] = [], options: {
    disableCreditCheck?: boolean
    disableHuntersMark?: boolean
    disableMultiShot?: boolean
    disableSupershot?: boolean
    disableZapper?: boolean
    maximumTargets?: number
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting
    if (bot.isOnCooldown("scare")) return

    // Adjust options
    if (options.targetingPlayer && options.targetingPlayer == bot.id) options.targetingPlayer = undefined
    if (bot.map == "goobrawl") options.disableCreditCheck = true // Goo brawl is cooperative

    const priority = sortPriority(bot, types)

    // Calculate how much courage we have left to spare
    const targetingMe = bot.calculateTargets()

    const targets = new FastPriorityQueue<Entity>(priority)
    const threeShotTargets = new FastPriorityQueue<Entity>(priority)
    const fiveShotTargets = new FastPriorityQueue<Entity>(priority)
    for (const target of bot.getEntities({
        canDamage: true,
        couldGiveCredit: options.disableCreditCheck ? undefined : true,
        targetingPartyMember: options.targetingPartyMember,
        targetingPlayer: options.targetingPlayer,
        typeList: types,
        willDieToProjectiles: false,
        withinRange: bot.range
    })) {
        targets.add(target)

        if (target.target) {
            // It has a target, we can attack it without gaining additional fear
            threeShotTargets.add(target)
            fiveShotTargets.add(target)
            continue
        }

        // Check if we can kill it in one hit without gaining additional fear
        let addedToThreeShotTargets = false
        if (target.hp <= bot.calculateDamageRange(bot, "5shot")[0]) {
            fiveShotTargets.add(target)
            threeShotTargets.add(target)
            continue
        } else if (target.hp <= bot.calculateDamageRange(bot, "3shot")[0]) {
            threeShotTargets.add(target)
            addedToThreeShotTargets = true
        }

        if (options.maximumTargets <= targetingMe.magical + targetingMe.physical + targetingMe.pure) continue // We want to limit our number of targets
        switch (target.damage_type) {
            case "magical":
                if (bot.mcourage > targetingMe.magical) {
                    // We can tank one more magical monster
                    if (!addedToThreeShotTargets) threeShotTargets.add(target)
                    fiveShotTargets.add(target)
                    targetingMe.magical += 1
                    continue
                }
                break
            case "physical":
                if (bot.courage > targetingMe.physical) {
                    // We can tank one more physical monster
                    if (!addedToThreeShotTargets)threeShotTargets.add(target)
                    fiveShotTargets.add(target)
                    targetingMe.physical += 1
                    continue
                }
                break
            case "pure":
                if (bot.pcourage > targetingMe.pure) {
                    // We can tank one more pure monster
                    if (!addedToThreeShotTargets)threeShotTargets.add(target)
                    fiveShotTargets.add(target)
                    targetingMe.pure += 1
                    continue
                }
                break
        }
    }

    const target = targets.peek()
    if (target) {
        // Apply huntersmark if we can't kill it in one shot and we have enough MP
        if (bot.canUse("huntersmark")
        && !options.disableHuntersMark
        && !target.immune
        && bot.mp > (bot.mp_cost + bot.G.skills.huntersmark.mp)
        && !bot.canKillInOneShot(target)) {
            bot.huntersMark(target.id).catch(console.error)
        }

        // Use our friends to energize for the attack speed boost
        if (!bot.s.energized) {
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.socket.disconnected) continue // Friend is disconnected
                if (friend.id == bot.id) continue // Can't energize ourselves
                if (AL.Tools.distance(bot, friend) > bot.G.skills.energize.range) continue // Too far away
                if (!friend.canUse("energize")) continue // Friend can't use energize

                // Energize!
                (friend as Mage).energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp))).catch(console.error)
                break
            }
        }
    }

    if (!options.disableMultiShot && bot.canUse("5shot") && fiveShotTargets.size >= 5) {
        const targets: Entity[] = []
        while (targets.length < 5) targets.push(fiveShotTargets.poll())

        // Remove them from our friends' entities list if we're going to kill it
        for (const target of targets) {
            if (bot.canKillInOneShot(target, "5shot")) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                    friend.deleteEntity(target.id)
                }
            }
        }

        await bot.fiveShot(targets[0].id, targets[1].id, targets[2].id, targets[3].id, targets[4].id)
    } else if (!options.disableMultiShot && bot.canUse("3shot") && threeShotTargets.size >= 3) {
        const targets: Entity[] = []
        while (targets.length < 3) targets.push(threeShotTargets.poll())

        // Remove them from our friends' entities list if we're going to kill it
        for (const target of targets) {
            if (bot.canKillInOneShot(target, "3shot")) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                    friend.deleteEntity(target.id)
                }
            }
        }

        await bot.threeShot(targets[0].id, targets[1].id, targets[2].id)
    } else if (bot.canUse("attack") && targets.size > 0) {
        const target = targets.poll()
        const damage = bot.calculateDamageRange(target)
        const piercingDamage = bot.canUse("piercingshot") ? bot.calculateDamageRange(target, "piercingshot") : [0, 0]

        const canKillPiercing = bot.canKillInOneShot(target, "piercingshot")
        if (piercingDamage[0] > damage[0] && (options.maximumTargets > bot.targets || canKillPiercing)) {
            // Piercing shot will do more damage

            // Remove them from our friends' entities list if we're going to kill it
            if (canKillPiercing) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                    friend.deleteEntity(target.id)
                }
            }

            await bot.piercingShot(target.id)
        } else {
            // Normal attack will do the same, or more damage
            const canKill = bot.canKillInOneShot(target)

            // Remove them from our friends' entities list if we're going to kill it
            if (canKill) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                    friend.deleteEntity(target.id)
                }
            }
            await bot.basicAttack(target.id)
        }
    }

    if (!options.disableSupershot && bot.canUse("supershot")) {
        const supershotTargets = new FastPriorityQueue<Entity>(priority)
        for (const target of bot.getEntities({
            canDamage: "supershot",
            couldGiveCredit: options.disableCreditCheck ? undefined : true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range * bot.G.skills.supershot.range_multiplier
        })) {
            if (target.target == undefined && options.maximumTargets <= bot.targets) continue // Don't aggro more than our maximum

            // If we can kill something guaranteed, break early
            if (bot.canKillInOneShot(target, "supershot")) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                    friend.deleteEntity(target.id)
                }
                await bot.superShot(target.id)
                break
            }

            supershotTargets.add(target)
        }

        if (bot.canUse("supershot") && supershotTargets.size > 0) await bot.superShot(supershotTargets.peek().id)
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const target of bot.getEntities({
            couldGiveCredit: options.disableCreditCheck ? undefined : true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.G.skills.zapperzap.range
        })) {
            if (!bot.G.skills.zapperzap.pierces_immunity && target.immune) continue
            if (target.target == undefined && options.maximumTargets <= bot.targets) continue // Don't aggro more than our maximum

            // Zap if we can kill it in one shot, or we have a lot of mp
            if (bot.canKillInOneShot(target, "zapperzap") || bot.mp >= bot.max_mp - 500) targets.add(target)
        }

        if (targets.size) {
            const target = targets.peek()

            const zapper: number = bot.locateItem("zapper", bot.items, { returnHighestLevel: true })
            if (bot.isEquipped("zapper") || (zapper !== undefined)) {
                // Equip zapper
                if (zapper !== undefined) bot.equip(zapper, "ring1").catch(console.error)

                // Zap
                const promises: Promise<unknown>[] = []
                promises.push(bot.zapperZap(target.id).catch(console.error))

                // Re-equip ring
                if (zapper !== undefined) promises.push(bot.equip(zapper, "ring1"))
                await Promise.all(promises)
            }
        }
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        let strangerNearby = false
        for (const [, player] of bot.players) {
            if (player.isFriendly(bot)) continue // They are friendly

            const distance = AL.Tools.distance(bot, player)
            if (distance > bot.range + player.range + 100) continue // They are far away

            strangerNearby = true
            break
        }
        if (strangerNearby) {
            // Zap monsters to kill steal
            for (const target of bot.getEntities({
                canDamage: true,
                couldGiveCredit: true,
                willDieToProjectiles: true,
                withinRange: bot.range
            })) {
                if (target.immune) continue // Entity won't take damage from zap
                if (target.target) continue // Already has a target
                if (target.xp < 0) continue // Don't try to kill steal pets

                const zapper: number = bot.locateItem("zapper", bot.items, { returnHighestLevel: true })
                if (bot.isEquipped("zapper") || (zapper !== undefined)) {
                // Equip zapper
                    if (zapper !== undefined) bot.equip(zapper, "ring1").catch(console.error)

                    // Zap
                    const promises: Promise<unknown>[] = []
                    promises.push(bot.zapperZap(target.id).catch(console.error))

                    // Re-equip ring
                    if (zapper !== undefined) promises.push(bot.equip(zapper, "ring1"))
                    await Promise.all(promises)
                    break
                }
            }
        }
    }
}