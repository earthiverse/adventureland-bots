import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"

export async function attackTheseTypesRanger(bot: AL.Ranger, types: AL.MonsterName[], friends: AL.Character[], options?: {
    targetingPlayer?: string
}): Promise<void> {
    if (!bot.canUse("attack")) return // We can't attack

    const priority = (a: AL.Entity, b: AL.Entity): boolean => {
        // Order in array
        if (types.indexOf(a.type) < types.indexOf(b.type)) return true
        else if (types.indexOf(a.type) > types.indexOf(b.type)) return false

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

    // Calculate how much courage we have left to spare
    let numPhysicalTargetingMe = 0
    let numPureTargetingMe = 0
    let numMagicalTargetingMe = 0
    for (const entity of bot.getEntities({
        targetingMe: true
    })) {
        switch (entity.damage_type) {
        case "magical":
            numMagicalTargetingMe += 1
            break
        case "physical":
            numPhysicalTargetingMe += 1
            break
        case "pure":
            numPureTargetingMe += 1
            break
        }
    }
    if ((numPhysicalTargetingMe + numPureTargetingMe + numMagicalTargetingMe) < bot.targets) {
        // Something else is targeting us, assume they're the same type
        const difference = bot.targets - (numPhysicalTargetingMe + numPureTargetingMe + numMagicalTargetingMe)
        numPhysicalTargetingMe += difference
        numPureTargetingMe += difference
        numMagicalTargetingMe += difference
    }

    const targets = new FastPriorityQueue<AL.Entity>(priority)
    const threeShotTargets = new FastPriorityQueue<AL.Entity>(priority)
    const fiveShotTargets = new FastPriorityQueue<AL.Entity>(priority)
    for (const entity of bot.getEntities({
        couldGiveCredit: true,
        targetingPlayer: options?.targetingPlayer,
        typeList: types,
        willDieToProjectiles: false,
        withinRange: bot.range
    })) {
        targets.add(entity)

        if (entity.immune) continue // Can't attack it with 3shot or 5shot

        if (entity.target) {
            // It has a target, we can attack it without gaining additional fear
            threeShotTargets.add(entity)
            fiveShotTargets.add(entity)
            continue
        }

        let addedToThreeShotTargets = false

        // Check if we can kill it in one hit without gaining additional fear
        if (entity.hp <= bot.calculateDamageRange(bot, "5shot")[0]) {
            fiveShotTargets.add(entity)
            threeShotTargets.add(entity)
            continue
        } else if (entity.hp <= bot.calculateDamageRange(bot, "3shot")[0]) {
            threeShotTargets.add(entity)
            addedToThreeShotTargets = true
        }

        switch (entity.damage_type) {
        case "magical":
            if (bot.mcourage > numMagicalTargetingMe) {
                // We can tank one more magical monster
                if (!addedToThreeShotTargets) threeShotTargets.add(entity)
                fiveShotTargets.add(entity)
                numMagicalTargetingMe += 1
                continue
            }
            break
        case "physical":
            if (bot.courage > numPhysicalTargetingMe) {
                // We can tank one more physical monster
                if (!addedToThreeShotTargets)threeShotTargets.add(entity)
                fiveShotTargets.add(entity)
                numPhysicalTargetingMe += 1
                continue
            }
            break
        case "pure":
            if (bot.pcourage > numPureTargetingMe) {
                // We can tank one more pure monster
                if (!addedToThreeShotTargets)threeShotTargets.add(entity)
                fiveShotTargets.add(entity)
                numPureTargetingMe += 1
                continue
            }
            break
        }
    }

    // Apply huntersmark if we can't kill it in one shot and we have enough MP
    const target = targets.peek()
    if (!target) return // No targets
    if (bot.canUse("huntersmark") && bot.mp > (bot.mp_cost + bot.G.skills.huntersmark.mp) && !bot.canKillInOneShot(target)) {
        bot.huntersMark(target.id).catch((e) => { console.error(e) })
    }

    if (bot.canUse("5shot") && fiveShotTargets.size >= 5) {
        const entities: AL.Entity[] = []
        while (entities.length < 5) entities.push(fiveShotTargets.poll())

        // Remove them from our friends' entities list if we're going to kill it
        for (const entity of entities) {
            if (bot.canKillInOneShot(entity, "5shot")) {
                for (const friend of friends) friend.entities.delete(entity.id)
            }
        }

        await bot.fiveShot(entities[0].id, entities[1].id, entities[2].id, entities[3].id, entities[4].id)
    } else if (bot.canUse("3shot") && threeShotTargets.size >= 3) {
        const entities: AL.Entity[] = []
        while (entities.length < 3) entities.push(threeShotTargets.poll())

        // Remove them from our friends' entities list if we're going to kill it
        for (const entity of entities) {
            if (bot.canKillInOneShot(entity, "3shot")) {
                for (const friend of friends) friend.entities.delete(entity.id)
            }
        }

        await bot.threeShot(entities[0].id, entities[1].id, entities[2].id)
    } else {
        const entity = targets.poll()

        // Remove them from our friends' entities list if we're going to kill it
        if (bot.canKillInOneShot(entity)) {
            for (const friend of friends) friend.entities.delete(entity.id)
        }

        // TODO: Check if it makes sense to do a piercing shot, and do so if it does.

        await bot.basicAttack(entity.id)
    }

    if (!bot.canUse("supershot")) return

    const supershotTargets = new FastPriorityQueue<AL.Entity>(priority)
    for (const entity of bot.getEntities({
        couldGiveCredit: true,
        targetingPlayer: options?.targetingPlayer,
        typeList: types,
        willDieToProjectiles: false,
        withinRange: bot.range * bot.G.skills.supershot.range_multiplier
    })) {
        if (entity.immune) continue // Can't attack it with supershot

        // If we can kill something guaranteed, break early
        if (bot.canKillInOneShot(entity, "supershot")) {
            for (const friend of friends) friend.entities.delete(entity.id)
            await bot.superShot(entity.id)
            return
        }

        supershotTargets.add(entity)
    }

    if (supershotTargets.size > 0) await bot.superShot(supershotTargets.peek().id)
}