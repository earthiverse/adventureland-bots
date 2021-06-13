import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"

export async function attackTheseTypesRogue(bot: AL.Rogue, types: AL.MonsterName[], friends: AL.Character[], options?: {
    disableQuickPunch?: boolean
    disableQuickStab?: boolean
    targetingPlayer?: string
}): Promise<void> {
    const attackPriority = (a: AL.Entity, b: AL.Entity): boolean => {
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
    if (bot.canUse("attack")) {
        const targets = new FastPriorityQueue<AL.Entity>(attackPriority)
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPlayer: options?.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            targets.add(entity)
        }

        const target = targets.peek()
        if (!target) return // No target

        if (bot.canKillInOneShot(target)) {
            for (const friend of friends) friend.entities.delete(target.id)
        }

        if (target) await bot.basicAttack(target.id)
    }

    if (!options?.disableQuickPunch && bot.canUse("quickpunch")) {
        const targets = new FastPriorityQueue<AL.Entity>(attackPriority)
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPlayer: options?.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            targets.add(entity)
        }

        const target = targets.peek()
        if (!target) return // No target

        if (bot.canKillInOneShot(target, "quickpunch")) {
            for (const friend of friends) friend.entities.delete(target.id)
        }

        if (target) await bot.quickPunch(target.id)
    }

    if (!options?.disableQuickStab && bot.canUse("quickstab")) {
        const targets = new FastPriorityQueue<AL.Entity>(attackPriority)
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPlayer: options?.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            targets.add(entity)
        }

        const target = targets.peek()
        if (!target) return // No target

        if (bot.canKillInOneShot(target, "quickstab")) {
            for (const friend of friends) friend.entities.delete(target.id)
        }

        if (target) await bot.quickStab(target.id)
    }
}