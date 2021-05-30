import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"

export async function attackTheseTypes(bot: AL.Ranger, types: AL.MonsterName[], friends: AL.Character[], options?: {
    tank: string
}): Promise<void> {
    if (!bot.canUse("attack")) return // We can't attack

    const priority = (a: AL.Entity, b: AL.Entity): boolean => {
        // Has a target -> higher priority
        if (a.target && !b.target) return true
        else if (!a.target && b.target) return false

        // Will burn to death -> lower priority
        if (!a.willBurnToDeath() && b.willBurnToDeath()) return true
        else if (a.willBurnToDeath() && !b.willBurnToDeath()) return false

        // Lower HP -> higher priority
        if (a.hp < b.hp) return true
        else if (a.hp > b.hp) return false

        // Closer -> higher priority
        return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
    }

    const targets = new FastPriorityQueue<AL.Entity>(priority)
    const threeShotTargets = new FastPriorityQueue<AL.Entity>(priority)
    const fiveShotTargets = new FastPriorityQueue<AL.Entity>(priority)
    for (const [, entity] of bot.entities) {
        if (!types.includes(entity.type)) continue // Wrong type
        if (AL.Tools.distance(bot, entity) > entity.range) continue // Too far away
        if (!entity.couldGiveCreditForKill(bot)) continue // Can't get credit for kill
        if (options?.tank && entity.target !== options?.tank) continue // Tank isn't tanking
        if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // About to die

        targets.add(entity)

        if (entity.immune) continue // Can't attack it with 3shot or 5shot
        const minimumDamage = bot.calculateDamageRange(entity)[0]
        if (entity.target) {
            // It has a target, we can attack it without gaining additional fear
            threeShotTargets.add(entity)
            fiveShotTargets.add(entity)
            continue
        }

        // If we can kill it in one hit
        if (entity.hp < minimumDamage * bot.G.skills["3shot"].damage_multiplier) threeShotTargets.add(entity)
        if (entity.hp < minimumDamage * bot.G.skills["5shot"].damage_multiplier) fiveShotTargets.add(entity)
    }

    // TODO: improve by checking our fear level / courage and seeing if we can tank it

    if (bot.canUse("5shot") && fiveShotTargets.size >= 5) {
        const entities: AL.Entity[] = []
        while (entities.length < 5) entities.push(fiveShotTargets.poll())

        if (friends) {
            // Remove them from our friends' entities list if we're going to kill it
            for (const entity of entities) {
                if (bot.canKillInOneShot(entity, "5shot")) {
                    for (const friend of friends) friend.entities.delete(entity.id)
                }
            }
        }

        await bot.fiveShot(entities[0].id, entities[1].id, entities[2].id, entities[3].id, entities[4].id)
    } else if (bot.canUse("3shot") && threeShotTargets.size >= 3) {
        const entities: AL.Entity[] = []
        while (entities.length < 3) entities.push(fiveShotTargets.poll())

        if (friends) {
            // Remove them from our friends' entities list if we're going to kill it
            for (const entity of entities) {
                if (bot.canKillInOneShot(entity, "3shot")) {
                    for (const friend of friends) friend.entities.delete(entity.id)
                }
            }
        }

        await bot.threeShot(entities[0].id, entities[1].id, entities[2].id)
    } else {
        const entity = targets.poll()

        if (friends) {
            // Remove them from our friends' entities list if we're going to kill it
            if (bot.canKillInOneShot(entity)) {
                for (const friend of friends) friend.entities.delete(entity.id)
            }
        }
    }

    if (bot.canUse("supershot")) {
        for (const [, entity] of bot.entities) {
            if (!types.includes(entity.type)) continue // Wrong type
            if (AL.Tools.distance(bot, entity) > entity.range) continue // Too far away
            if (!entity.couldGiveCreditForKill(bot)) continue // Can't get credit for kill
            if (options?.tank && entity.target !== options?.tank) continue // Tank isn't tanking
            if (entity.willDieToProjectiles(bot.projectiles, bot.players, bot.entities)) continue // About to die
            if (entity.immune) continue // Can't attack it with supershot

            await bot.superShot(entity.id)
        }
    }
}