import AL, { Character, Entity, Mage, MonsterName, Warrior } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { LOOP_MS } from "./general.js"

export async function attackTheseTypesWarrior(bot: Warrior, types: MonsterName[], friends: Character[] = [], options: {
    targetingPartyMember?: boolean
    targetingPlayer?: string
    disableAgitate?: boolean
    disableCleave?: boolean
    disableStomp?: boolean
    disableZapper?: boolean
    maximumTargets?: number
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting

    // Adjust options
    if (options.targetingPlayer && options.targetingPlayer == bot.id) options.targetingPlayer = undefined
    if (options.targetingPlayer || options.targetingPartyMember) options.disableAgitate = true

    if (!options.disableCleave
    && bot.mp > bot.G.skills.cleave.mp + bot.mp_cost
    && bot.canUse("cleave", { ignoreEquipped: true })
    && (bot.hasItem("bataxe") || bot.hasItem("scythe") || bot.isEquipped("bataxe") || bot.isEquipped("scythe")) // We have something to cleave with
    ) {
        // Calculate how much courage we have left to spare
        const targetingMe = bot.calculateTargets()

        const cleaveTargets: Entity[] = []
        let couldCleaveNearby = false
        let avoidCleave = false
        if (bot.isPVP()) {
            for (const [, player] of bot.players) {
                if (bot.party && player.party == bot.party) continue // Same party, won't do damage
                if (AL.Tools.distance(bot, player) > bot.G.skills.agitate.range + bot.xrange) continue // Out of range, won't do damage

                avoidCleave = true
                break
            }
        }
        for (const entity of bot.getEntities({
            withinRange: bot.G.skills.cleave.range + bot.xrange,
        })) {
            if (options.targetingPlayer && !entity.target) {
                // We don't want to aggro things
                avoidCleave = true
                break
            }
            if (entity.target == bot.id) {
                couldCleaveNearby = true
                continue // Already targeting me
            }
            if (!entity.isTauntable(bot)) continue // Already has a target
            if (!types.includes(entity.type) || avoidCleave) {
                // A monster we don't want to attack is here, don't cleave
                avoidCleave = true
                break
            }

            switch (entity.damage_type) {
                case "magical":
                    if (bot.mcourage > targetingMe.magical) targetingMe.magical += 1 // We can tank one more magical monster
                    else {
                    // We can't tank any more, don't cleave
                        avoidCleave = true
                        continue
                    }
                    break
                case "physical":
                    if (bot.courage > targetingMe.physical) targetingMe.physical += 1 // We can tank one more physical monster
                    else {
                    // We can't tank any more, don't cleave
                        avoidCleave = true
                        continue
                    }
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) targetingMe.pure += 1 // We can tank one more pure monster
                    else {
                    // We can't tank any more, don't cleave
                        avoidCleave = true
                        continue
                    }
                    break
            }

            cleaveTargets.push(entity)
        }
        if (options.maximumTargets && cleaveTargets.length + bot.targets > options.maximumTargets) avoidCleave = true
        if (!avoidCleave && (cleaveTargets.length > 1 || couldCleaveNearby)) {
            bot.mp -= bot.G.skills.cleave.mp

            // If we're going to kill the target, remove it from our friends
            for (const target of cleaveTargets) {
                if (bot.canKillInOneShot(target, "cleave")) {
                    for (const friend of friends) {
                        if (!friend) continue // No friend
                        if (friend.id == bot.id) continue // Don't delete it from our own list
                        if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
                        friend.deleteEntity(target.id)
                    }
                }
            }

            // Equip to cleave if we don't have it already equipped
            const mainhand = bot.slots.mainhand?.name
            let mainhandSlot: number
            const offhand = bot.slots.offhand?.name
            let offhandSlot: number
            if (!bot.isEquipped("bataxe") && !bot.isEquipped("scythe") && bot.esize > 0) {
                const promises: Promise<unknown>[] = []
                if (offhand) promises.push(bot.unequip("offhand").then((i) => { offhandSlot = i }))
                mainhandSlot = bot.locateItem("scythe", bot.items, { locked: true })
                if (mainhandSlot == undefined) mainhandSlot = bot.locateItem("bataxe", bot.items, { locked: true })
                promises.push(bot.equip(mainhandSlot))
                await Promise.all(promises)
            }

            // We'll wait, there's a chance cleave could do a lot of damage and kill the entity, so we don't want to waste the attack
            if (bot.canUse("cleave")) await bot.cleave()

            // Re-equip if we changed weapons
            const promises: Promise<unknown>[] = []
            if (bot.slots.mainhand?.name !== mainhand) {
                if (mainhandSlot !== undefined) promises.push(bot.equip(mainhandSlot, "mainhand"))
            }
            if (bot.slots.offhand?.name !== offhand) {
                if (offhandSlot !== undefined) promises.push(bot.equip(offhandSlot, "offhand"))
            }
            await Promise.all(promises)
        }
    }

    if (!options.disableAgitate) {
        // Calculate how much courage we have left to spare
        const targetingMe = bot.calculateTargets()

        const agitateTargets: Entity[] = []
        let avoidAgitate = false
        for (const entity of bot.getEntities({
            canDamage: true,
            targetingMe: false,
            withinRange: bot.G.skills.agitate.range,
        })) {
            if (!entity.isTauntable(bot)) continue // Not tauntable
            if (!types.includes(entity.type) || avoidAgitate) {
                // A monster we don't want to attack is here, don't agitate
                avoidAgitate = true
                continue // Don't break, we could still taunt what we want to kill
            }

            switch (entity.damage_type) {
                case "magical":
                    if (bot.mcourage > targetingMe.magical) targetingMe.magical += 1 // We can tank one more magical monster
                    else {
                        // We can't tank any more, don't agitate
                        avoidAgitate = true
                        continue
                    }
                    break
                case "physical":
                    if (bot.courage > targetingMe.physical) targetingMe.physical += 1 // We can tank one more physical monster
                    else {
                        // We can't tank any more, don't agitate
                        avoidAgitate = true
                        continue
                    }
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) targetingMe.pure += 1 // We can tank one more pure monster
                    else {
                        // We can't tank any more, don't agitate
                        avoidAgitate = true
                        continue
                    }
                    break
            }

            agitateTargets.push(entity)
        }

        // If agitating would push us over our maximum targets setting, don't agitate
        if (options.maximumTargets && bot.targets + agitateTargets.length > options.maximumTargets) avoidAgitate = true

        if (!avoidAgitate && agitateTargets.length > 2 && bot.canUse("agitate")) {
            // Agitate all nearby monsters
            bot.agitate().catch(e => console.error(e))
            bot.mp -= bot.G.skills.agitate.mp
        } else if (!(options.maximumTargets && bot.targets + 1 > options.maximumTargets)) {
            let numNewTargets = 0
            if (bot.canUse("taunt") && agitateTargets.length) {
                for (let i = 0; i < agitateTargets.length; i++) {
                    const target = agitateTargets[i]
                    if (AL.Tools.distance(bot, target) > bot.G.skills.taunt.range) continue // Too far to taunt
                    bot.taunt(target.id).catch(e => console.error(e))
                    bot.mp -= bot.G.skills.taunt.mp
                    numNewTargets += 1
                    agitateTargets.splice(i, 1) // Remove the entity from the agitate list
                    break
                }
            }

            if (bot.canUse("zapperzap", { ignoreEquipped: true }) && agitateTargets.length && !(options.maximumTargets && bot.targets + numNewTargets + 1 > options.maximumTargets)) {
                for (let i = 0; i < agitateTargets.length; i++) {
                    const target = agitateTargets[i]
                    if (AL.Tools.distance(bot, target) > bot.G.skills.zapperzap.range) continue // Too far to zap

                    const zapper: number = bot.locateItem("zapper", bot.items, { returnHighestLevel: true })
                    if (bot.isEquipped("zapper") || (zapper !== undefined && bot.cc < 100)) {
                        // Equip zapper
                        if (zapper !== undefined) bot.equip(zapper, "ring1")

                        // Zap
                        bot.zapperZap(target.id).catch(e => console.error(e))
                        bot.mp -= bot.G.skills.zapperzap.mp
                        numNewTargets += 1
                        agitateTargets.splice(i, 1) // Remove the entity from the agitate list

                        // Re-equip ring
                        if (zapper !== undefined) bot.equip(zapper, "ring1")
                    }
                    break
                }
            }
        }
    }

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
        const numTargets = bot.calculateTargets()
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (!entity.target && options.maximumTargets
                 && (numTargets.magical + numTargets.physical + numTargets.pure) >= options.maximumTargets) {
                // Attacking this entity will push us over our maximumTargets, so don't attack
                continue
            }

            targets.add(entity)
        }
        if (targets.size) {
            const entity = targets.peek()
            const canKill = bot.canKillInOneShot(entity)

            if (!canKill && !options.disableStomp
            && bot.mp > bot.G.skills.stomp.mp + bot.mp_cost
            && bot.canUse("stomp", { ignoreEquipped: true })
            && (!entity.s.stunned || entity.s.stunned.ms < (Math.min(...bot.pings) * 3))
            && (bot.isEquipped("basher") || bot.isEquipped("wbasher") || bot.hasItem("basher") || bot.hasItem("wbasher"))) {
                let avoidStomp = false
                if (bot.isPVP()) {
                    for (const [, player] of bot.players) {
                        if (bot.party && player.party == bot.party) continue // Same party, won't stun
                        if (AL.Tools.distance(bot, player) > bot.G.skills.stomp.range + bot.xrange) continue // Out of range, won't stun

                        avoidStomp = true
                        break
                    }
                }

                if (!avoidStomp) {
                    // Equip to bash if we don't have it already equipped
                    const mainhand = bot.slots.mainhand?.name
                    let mainhandSlot: number
                    const offhand = bot.slots.offhand?.name
                    let offhandSlot: number
                    if (!bot.isEquipped("basher") && !bot.isEquipped("wbasher") && bot.esize > 0) {
                        const promises: Promise<unknown>[] = []
                        if (offhand) promises.push(bot.unequip("offhand").then((i) => { offhandSlot = i }))
                        mainhandSlot = bot.locateItem("basher", bot.items, { locked: true })
                        if (mainhandSlot == undefined) mainhandSlot = bot.locateItem("wbasher", bot.items, { locked: true })
                        promises.push(bot.equip(mainhandSlot))
                        await Promise.all(promises)
                    }

                    bot.stomp().catch(e => console.error(e))
                    bot.mp -= bot.G.skills.stomp.mp

                    // Re-equip if we changed weapons
                    const promises: Promise<unknown>[] = []
                    if (bot.slots.mainhand?.name !== mainhand) {
                        if (mainhandSlot !== undefined) promises.push(bot.equip(mainhandSlot, "mainhand"))
                    }
                    if (bot.slots.offhand?.name !== offhand) {
                        if (offhandSlot !== undefined) promises.push(bot.equip(offhandSlot, "offhand"))
                    }
                    await Promise.all(promises)
                }
            }

            // Remove them from our friends' entities list if we're going to kill it
            if (canKill) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.id == bot.id) continue // Don't delete it from our own list
                    if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't delete special monsters
                    friend.deleteEntity(entity.id)
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

            await bot.basicAttack(entity.id)
        }
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of bot.getEntities({
            canDamage: true,
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

export function startChargeLoop(bot: Warrior): void {
    async function chargeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("charge")
                && !bot.s.hardshell) { // Don't charge if we have hardshell active, because it sets the speed
                await bot.charge()
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("chargeLoop", setTimeout(async () => { chargeLoop() }, Math.max(LOOP_MS, bot.getCooldown("charge"))))
    }
    chargeLoop()
}

export function startHardshellLoop(bot: Warrior): void {
    async function hardshellLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.hp < bot.max_hp * 0.75
                && bot.canUse("hardshell")) {
                let isBeingAttackedByPhysicalMonster = false
                for (const [, entity] of bot.entities) {
                    if (entity.target !== bot.id) continue // Not targeting us
                    if (entity.damage_type !== "physical") continue // Not physical

                    isBeingAttackedByPhysicalMonster = true
                    break
                }

                if (isBeingAttackedByPhysicalMonster) await bot.hardshell()
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("hardshellLoop", setTimeout(async () => { hardshellLoop() }, Math.max(LOOP_MS, bot.getCooldown("hardshell"))))
    }
    hardshellLoop()
}

export function startWarcryLoop(bot: Warrior): void {
    async function warcryLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.warcry && bot.canUse("warcry")) await bot.warcry()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("warcryLoop", setTimeout(async () => { warcryLoop() }, Math.max(LOOP_MS, bot.getCooldown("warcry"))))
    }
    warcryLoop()
}