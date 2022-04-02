import AL, { Character, Entity, Mage, MonsterName, Rogue } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { LOOP_MS } from "./general.js"

export async function attackTheseTypesRogue(bot: Rogue, types: MonsterName[], friends: Character[] = [], options: {
    disableMentalBurst?: boolean
    disableQuickPunch?: boolean
    disableQuickStab?: boolean
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

    // Use mentalburst if we can kill it in one shot to get extra MP
    if (bot.canUse("mentalburst")) {
        const targets: Entity[] = []
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: (bot.range * bot.G.skills.mentalburst.range_multiplier) + bot.G.skills.mentalburst.range_bonus
        })) {
            if (entity.immune) continue // Entity won't take damage from mentalburst
            if (!bot.canKillInOneShot(entity, "mentalburst")) continue
            targets.push(entity)
        }

        if (targets.length) {
            const target = targets[0]
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
            await bot.mentalBurst(target.id)
        }
    }

    // See if we can kill it using a combo to regen MP
    const canUseQuickPunch = bot.canUse("quickpunch")
    const canUseQuickStab = bot.canUse("quickstab")
    if (bot.canUse("mentalburst")
        && ((canUseQuickPunch && bot.mp >= bot.G.skills.mentalburst.mp + bot.G.skills.quickpunch.mp)
         || (canUseQuickStab && bot.mp >= bot.G.skills.mentalburst.mp + bot.G.skills.quickstab.mp))) {
        const targets: Entity[] = []
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (entity.immune) continue // Entity won't take damage from our combo

            // If it can heal, don't try to combo
            if (entity.lifesteal) continue
            if (entity.abilities?.self_healing) continue

            // If it can avoid our combo, don't try
            if (entity.avoidance || entity.reflection || entity.evasion) continue

            if (!bot.canKillInOneShot(entity, "mentalburst")) continue

            const mentalBurstMinDamage = this.calculateDamageRange(entity, "mentalburst")[0]
            const quickPunchMinDamage = canUseQuickPunch ? this.calculateDamageRange(entity, "quickpunch")[0] : 0
            const quickStabMinDamage = canUseQuickStab ? this.calculateDamageRange(entity, "quickstab")[0] : 0

            if (entity.hp < quickPunchMinDamage + quickStabMinDamage) continue // We'd kill it in one hit and not regain MP

            if (mentalBurstMinDamage + quickPunchMinDamage + quickStabMinDamage < entity.hp) continue // We can't do enough damage to kill it with a combo

            targets.push(entity)
        }

        if (targets.length) {
            const target = targets[0]
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
            if (canUseQuickPunch) bot.quickPunch(target.id)
            if (canUseQuickStab) bot.quickStab(target.id)
            await bot.mentalBurst(target.id)
        }
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

    if (bot.canUse("mentalburst")) {
        const targets: Entity[] = []
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: (bot.range * bot.G.skills.mentalburst.range_multiplier) + bot.G.skills.mentalburst.range_bonus
        })) {
            if (entity.immune) continue // Entity won't take damage from mentalburst
            if (!bot.canKillInOneShot(entity, "mentalburst")) continue
            targets.push(entity)
        }

        if (targets.length) {
            const target = targets[0]
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
            await bot.mentalBurst(target.id)
        }
    }

    if (!options.disableQuickPunch && bot.canUse("quickpunch")) {
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
            if (entity.immune) continue // Entity won't take damage from quickpunch
            targets.add(entity)
        }

        const target = targets.peek()
        if (!target) return // No target

        if (bot.canKillInOneShot(target, "quickpunch")) {
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
        }

        if (target) await bot.quickPunch(target.id)
    }

    if (!options.disableQuickStab && bot.canUse("quickstab")) {
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
            if (entity.immune) continue // Entity won't take damage from quickstab
            targets.add(entity)
        }

        const target = targets.peek()
        if (!target) return // No target

        if (bot.canKillInOneShot(target, "quickstab")) {
            for (const friend of friends) {
                if (!friend) continue // No friend
                if (friend.id == bot.id) continue // Don't delete it from our own list
                if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                friend.deleteEntity(target.id)
            }
        }

        if (target) await bot.quickStab(target.id)
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.G.skills.zapperzap.range
        })) {
            if (!bot.canKillInOneShot(entity, "zapperzap")) continue
            targets.add(entity)
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

export function startRSpeedLoop(bot: Rogue, options: {
    disableGiveToFriends?: boolean,
    enableGiveToStrangers?: boolean,
    giveToThesePlayers?: string[]
} = {}): void {
    async function rspeedLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.rspeed && bot.canUse("rspeed")) await bot.rspeed(bot.id)

            // Give rogue speed to friends
            if (!options.disableGiveToFriends && bot.canUse("rspeed")) {
                for (const [, player] of bot.players) {
                    if (player.isNPC()) continue
                    if (player.s.rspeed?.ms > 300_000) continue // Already has rogue speed
                    if (bot.party !== player.party && bot.owner !== player.owner) continue // Not a friend
                    if (AL.Tools.distance(bot, player) > bot.G.skills.rspeed.range) continue // Too far away

                    await bot.rspeed(player.id)
                    break
                }
            }

            // Give rogue speed to random players
            if (options.enableGiveToStrangers && bot.canUse("rspeed")) {
                for (const [, player] of bot.players) {
                    if (player.isNPC()) continue
                    if (player.s.rspeed?.ms > 300_000) continue // Already has rogue speed
                    if (AL.Tools.distance(bot, player) > bot.G.skills.rspeed.range) continue // Too far away

                    await bot.rspeed(player.id)
                    break
                }
            }

            // Give rogue speed to specific players
            if (options.giveToThesePlayers && bot.canUse("rspeed")) {
                for (const [, player] of bot.players) {
                    if (player.isNPC()) continue
                    if (!options.giveToThesePlayers.includes(player.id)) continue // Not in the list
                    if (player.s.rspeed?.ms > 300_000) continue // Already has rogue speed
                    if (AL.Tools.distance(bot, player) > bot.G.skills.rspeed.range) continue // Too far away

                    await bot.rspeed(player.id)
                    break
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("rspeedLoop", setTimeout(async () => { rspeedLoop() }, Math.max(LOOP_MS, bot.getCooldown("rspeed"))))
    }
    rspeedLoop()
}