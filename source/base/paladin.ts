import AL, { Character, Entity, Mage, MonsterName, Paladin } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sortPriority } from "./sort.js"

export async function attackTheseTypesPaladin(bot: Paladin, types: MonsterName[], friends: Character[] = [], options: {
    disableCreditCheck?: boolean
    disableZapper?: boolean
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting
    if (bot.isOnCooldown("scare")) return

    // Adjust options
    if (options.targetingPlayer && options.targetingPlayer == bot.id) options.targetingPlayer = undefined
    if (bot.map == "goobrawl") options.disableCreditCheck = true // Goo brawl is cooperative

    const priority = sortPriority(bot, types)

    if (bot.canUse("attack")) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: options.disableCreditCheck ?? true,
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
            couldGiveCredit: options.disableCreditCheck ?? true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.G.skills.zapperzap.range
        })) {
            if (!bot.G.skills.zapperzap.pierces_immunity && target.immune) continue
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
                    if (zapper !== undefined) bot.equip(zapper, "ring1")

                    // Zap
                    const promises: Promise<unknown>[] = []
                    promises.push(bot.zapperZap(target.id).catch(e => console.error(e)))

                    // Re-equip ring
                    if (zapper !== undefined) promises.push(bot.equip(zapper, "ring1"))
                    await Promise.all(promises)
                    break
                }
            }
        }
    }
}