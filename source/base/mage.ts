import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"

const CBURST_WHEN_HP_LESS_THAN = 200

export async function attackTheseTypesMage(bot: AL.Mage, types: AL.MonsterName[], friends: AL.Character[], options?: {
    targetingPlayer?: string
}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting
    if (bot.canUse("attack")) {
        // Use our friends to energize
        if (!bot.s.energized) {
            for (const friend of friends) {
                if (friend.socket.disconnected) continue // Friend is disconnected
                if (friend.id == bot.id) continue // Can't energize ourselves
                if (AL.Tools.distance(bot, friend) > bot.G.skills.energize.range) continue // Too far away
                if (!friend.canUse("energize")) continue // Friend can't use energize

                // Energize!
                (friend as AL.Mage).energize(bot.id)
                break
            }
        }

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

    if (bot.canUse("cburst")) {
        // Cburst low HP monsters
        const targets: [string, number][] = []
        let mpNeeded = bot.G.skills.cburst.mp
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPlayer: options?.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (entity.hp >= CBURST_WHEN_HP_LESS_THAN) continue // Lots of HP
            targets.push([entity.id, entity.hp / bot.G.skills.cburst.ratio])
            mpNeeded += entity.hp / bot.G.skills.cburst.ratio
        }
        if (targets.length && bot.mp >= mpNeeded) {
            // Remove them from our friends' entities list, since we're going to kill them
            for (const [id] of targets) {
                for (const friend of friends) friend.entities.delete(id)
            }

            await bot.cburst(targets)
        }
    }
}