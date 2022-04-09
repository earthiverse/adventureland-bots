import AL, { Character, Entity, Mage, MonsterName, Ranger } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"

export async function attackTheseTypesRanger(bot: Ranger, types: MonsterName[], friends: Character[] = [], options: {
    disableHuntersMark?: boolean
    disableMultiShot?: boolean
    disableSupershot?: boolean
    disableZapper?: boolean
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting

    // Adjust options
    if (options.targetingPlayer && options.targetingPlayer == bot.id) options.targetingPlayer = undefined

    const priority = (a: Entity, b: Entity): boolean => {
        // Order in array
        const a_index = types.indexOf(a.type)
        const b_index = types.indexOf(b.type)
        if (a_index < b_index) return true
        else if (a_index > b_index) return false

        // Has a target -> higher priority
        if (a.target && !b.target) return true
        else if (!a.target && b.target) return false

        // Could die -> lower priority
        const a_couldDie = a.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        const b_couldDie = b.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        if (!a_couldDie && b_couldDie) return true
        else if (a_couldDie && !b_couldDie) return false

        // Will burn to death -> lower priority
        const a_willBurn = a.willBurnToDeath()
        const b_willBurn = b.willBurnToDeath()
        if (!a_willBurn && b_willBurn) return true
        else if (a_willBurn && !b_willBurn) return false

        // Lower HP -> higher priority
        if (a.hp < b.hp) return true
        else if (a.hp > b.hp) return false

        // Closer -> higher priority
        return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
    }

    // Calculate how much courage we have left to spare
    const targetingMe = bot.calculateTargets()

    const targets = new FastPriorityQueue<Entity>(priority)
    const threeShotTargets = new FastPriorityQueue<Entity>(priority)
    const fiveShotTargets = new FastPriorityQueue<Entity>(priority)
    for (const target of bot.getEntities({
        canDamage: true,
        couldGiveCredit: true,
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

        let addedToThreeShotTargets = false

        // Check if we can kill it in one hit without gaining additional fear
        if (target.hp <= bot.calculateDamageRange(bot, "5shot")[0]) {
            fiveShotTargets.add(target)
            threeShotTargets.add(target)
            continue
        } else if (target.hp <= bot.calculateDamageRange(bot, "3shot")[0]) {
            threeShotTargets.add(target)
            addedToThreeShotTargets = true
        }

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
            bot.huntersMark(target.id).catch(e => console.error(e))
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
                (friend as Mage).energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp))).catch(e => console.error(e))
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

        // Remove them from our friends' entities list if we're going to kill it
        if (bot.canKillInOneShot(target)) {
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
        }

        // TODO: Check if it makes sense to do a piercing shot, and do so if it does.

        await bot.basicAttack(target.id)
    }

    if (!options.disableSupershot && bot.canUse("supershot")) {
        const supershotTargets = new FastPriorityQueue<Entity>(priority)
        for (const target of bot.getEntities({
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range * bot.G.skills.supershot.range_multiplier
        })) {
            // If we can kill something guaranteed, break early
            if (bot.canKillInOneShot(target, "supershot")) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                    friend.deleteEntity(target.id)
                }
                await bot.superShot(target.id)
                supershotTargets
                break
            }

            supershotTargets.add(target)
        }

        if (bot.canUse("supershot") && supershotTargets.size > 0) await bot.superShot(supershotTargets.peek().id)
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const target of bot.getEntities({
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.G.skills.zapperzap.range
        })) {
            if (!bot.canKillInOneShot(target, "zapperzap")) continue
            targets.add(target)
        }

        if (targets.size) {
            const target = targets.peek()

            const zapper: number = bot.locateItem("zapper", bot.items, { returnHighestLevel: true })
            if (bot.isEquipped("zapper") || (zapper !== undefined)) {
                // Equip zapper
                if (zapper !== undefined) bot.equip(zapper, "ring1")

                // Zap
                const promises: Promise<unknown>[] = []
                promises.push(bot.zapperZap(target.id).catch(e => console.error(e)))

                // Re-equip ring
                if (zapper !== undefined) promises.push(bot.equip(zapper, "ring1"))
                await Promise.all(promises)
            }
        }
    }
}