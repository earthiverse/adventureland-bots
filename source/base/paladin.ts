import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"

export async function attackTheseTypesPaladin(bot: AL.Paladin, types: AL.MonsterName[], friends: AL.Character[] = [], options: {
    disableMentalBurst?: boolean
    disableQuickPunch?: boolean
    disableQuickStab?: boolean
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting
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

    if (bot.canUse("attack")) {
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
        if (!bot.s.energized) {
            for (const friend of friends) {
                if (!friend) continue // No friend
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
}