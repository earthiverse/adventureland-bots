import AL, { Character, Entity, Mage, MonsterName, Paladin } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"

export async function attackTheseTypesPaladin(bot: Paladin, types: MonsterName[], friends: Character[] = [], options: {
    disableZapper?: boolean
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting

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

    if (bot.canUse("attack")) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of bot.getEntities({
            canDamage: true,
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
                (friend as Mage).energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp))).catch(e => console.error(e))
                break
            }
        }

        await bot.basicAttack(target.id)
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const target of bot.getEntities({
            canDamage: true,
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.G.skills.zapperzap.range
        })) {
            if (target.immune) continue // You can't zap immune targets
            // Zap if we can kill it in one shot, or we have a lot of mp
            if (bot.canKillInOneShot(target, "zapperzap") || bot.mp >= bot.max_mp - 500) targets.add(target)
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