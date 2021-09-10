import AL from "alclient"
import FastPriorityQueue from "fastpriorityqueue"

const CBURST_WHEN_HP_LESS_THAN = 200

export async function attackTheseTypesMage(bot: AL.Mage, types: AL.MonsterName[], friends: AL.Character[] = [], options: {
    cburstWhenHPLessThan?: number
    disableEnergize?: boolean
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting
    if (bot.canUse("attack")) {
        const attackPriority = (a: AL.Entity, b: AL.Entity): boolean => {
            // Order in array
            const a_index = types.indexOf(a.type)
            const b_index = types.indexOf(b.type)
            if (a_index < b_index) return true
            else if (a_index > b_index) return false

            // Has a target -> higher priority
            if (a.target && !b.target) return true
            else if (!a.target && b.target) return false

            // Could die -> lower priority
            const a_couldDie = a.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)
            const b_couldDie = b.couldDieToProjectiles(bot.projectiles, bot.players, bot.entities)
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

        const targets = new FastPriorityQueue<AL.Entity>(attackPriority)
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            targets.add(entity)
        }

        const target = targets.peek()
        if (!target) return // No target

        if (bot.canKillInOneShot(target)) {
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
        }

        // Use our friends to energize for the attack speed boost
        if (!bot.s.energized && !options.disableEnergize) {
            for (const friend of friends) {
                if (!friend) continue // Friend is missing
                if (friend.socket.disconnected) continue // Friend is disconnected
                if (friend.id == bot.id) continue // Can't energize ourselves
                if (AL.Tools.distance(bot, friend) > bot.G.skills.energize.range) continue // Too far away
                if (!friend.canUse("energize")) continue // Friend can't use energize

                // Energize!
                (friend as AL.Mage).energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp)))
                break
            }
        }
        await bot.basicAttack(target.id)
    }

    if (bot.canUse("cburst")) {
        // Cburst low HP monsters
        const targets: [string, number][] = []
        let mpNeeded = bot.G.skills.cburst.mp + bot.mp_cost
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (options.cburstWhenHPLessThan) {
                if (entity.hp >= options.cburstWhenHPLessThan) continue
            } else if (entity.hp >= CBURST_WHEN_HP_LESS_THAN) continue // Lots of HP
            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't cburst special monsters
            const extraMP = entity.hp / bot.G.skills.cburst.ratio
            if (mpNeeded + extraMP > bot.mp) break // We can't cburst anything more
            targets.push([entity.id, extraMP])
            mpNeeded += extraMP
        }

        if (targets.length && bot.mp >= mpNeeded) {
            // Remove them from our friends' entities list, since we're going to kill them
            for (const [id] of targets) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    friend.deleteEntity(id)
                }
            }

            await bot.cburst(targets)
        }
    }
}