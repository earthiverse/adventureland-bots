import AL, { Character, Entity, Mage, MonsterName, Warrior } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { LOOP_MS } from "./general.js"
import { sortPriority } from "./sort.js"

export async function attackTheseTypesWarrior(bot: Warrior, types: MonsterName[], friends: Character[] = [], options: {
    disableAgitate?: boolean
    disableCleave?: boolean
    disableCreditCheck?: boolean
    disableStomp?: boolean
    disableZapper?: boolean
    maximumTargets?: number
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (bot.c.town) return // Don't attack if teleporting

    if (bot.isOnCooldown("scare")) return

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
        for (const target of bot.getEntities({
            withinRange: bot.G.skills.cleave.range + bot.xrange,
        })) {
            if (options.targetingPlayer && !target.target) {
                // We don't want to aggro things
                avoidCleave = true
                break
            }
            if (target.target == bot.id) {
                couldCleaveNearby = true
                continue // Already targeting me
            }
            if (!target.isTauntable(bot)) continue // Already has a target
            if (!types.includes(target.type) || avoidCleave) {
                // A monster we don't want to attack is here, don't cleave
                avoidCleave = true
                break
            }

            switch (target.damage_type) {
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

            cleaveTargets.push(target)
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
        for (const target of bot.getEntities({
            canDamage: true,
            couldGiveCredit: options.disableCreditCheck ?? true,
            targetingMe: false,
            withinRange: bot.G.skills.agitate.range,
        })) {
            if (!target.isTauntable(bot)) continue // Not tauntable
            if (!types.includes(target.type)) {
                // A monster we don't want to attack is here, don't agitate
                avoidAgitate = true
                continue // Don't break, we could still taunt what we want to kill
            }

            switch (target.damage_type) {
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

            agitateTargets.push(target)
        }

        // If agitating would push us over our maximum targets setting, don't agitate
        if (options.maximumTargets && bot.targets + agitateTargets.length > options.maximumTargets) avoidAgitate = true

        if (!avoidAgitate && agitateTargets.length > 2 && bot.canUse("agitate")) {
            // Agitate all nearby monsters
            bot.agitate().catch(e => console.error(e))
            bot.mp -= bot.G.skills.agitate.mp
        } else if (!(options.maximumTargets && bot.targets + 1 > options.maximumTargets)) {
            let numNewTargets = 0
            if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && agitateTargets.length) {
                for (let i = 0; i < agitateTargets.length; i++) {
                    const target = agitateTargets[i]
                    if (AL.Tools.distance(bot, target) > bot.G.skills.zapperzap.range) continue // Too far to zap
                    if (target.target) continue // Don't zap if they have a target, we can't take aggro with a zapper

                    const zapper: number = bot.locateItem("zapper", bot.items, { returnHighestLevel: true })
                    if ((bot.isEquipped("zapper") || (zapper !== undefined) && bot.cc < 100)) {
                        // Equip zapper
                        if (zapper !== undefined) bot.equip(zapper, "ring1")

                        // Zap
                        bot.zapperZap(target.id).catch(e => console.error(e))
                        bot.mp -= bot.G.skills.zapperzap.mp
                        target.target = bot.id
                        numNewTargets += 1
                        agitateTargets.splice(i, 1) // Remove the entity from the agitate list

                        // Re-equip ring
                        if (zapper !== undefined) bot.equip(zapper, "ring1")
                    }
                    break
                }
            }

            if (bot.canUse("taunt") && agitateTargets.length && !(options.maximumTargets && bot.targets + numNewTargets + 1 > options.maximumTargets)) {
                for (let i = 0; i < agitateTargets.length; i++) {
                    const target = agitateTargets[i]
                    if (AL.Tools.distance(bot, target) > bot.G.skills.taunt.range) continue // Too far to taunt
                    if (target.target == bot.id) continue // They're targeting us already
                    bot.taunt(target.id).catch(e => console.error(e))
                    bot.mp -= bot.G.skills.taunt.mp
                    numNewTargets += 1
                    agitateTargets.splice(i, 1) // Remove the entity from the agitate list
                    break
                }
            }
        }
    }

    const priority = sortPriority(bot, types)

    if (bot.canUse("attack")) {
        const targets = new FastPriorityQueue<Entity>(priority)
        const numTargets = bot.calculateTargets()
        for (const target of bot.getEntities({
            canDamage: true,
            couldGiveCredit: options.disableCreditCheck ?? true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (!target.target && options.maximumTargets
                 && (numTargets.magical + numTargets.physical + numTargets.pure) >= options.maximumTargets) {
                // Attacking this entity will push us over our maximumTargets, so don't attack
                continue
            }

            targets.add(target)
        }
        if (targets.size) {
            const target = targets.peek()
            const canKill = bot.canKillInOneShot(target)

            if (!canKill && !options.disableStomp
            && bot.mp > bot.G.skills.stomp.mp + bot.mp_cost
            && bot.canUse("stomp", { ignoreEquipped: true })
            && (!target.s.stunned || target.s.stunned.ms < (Math.min(...bot.pings) * 3))
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

        bot.timeouts.set("chargeLoop", setTimeout(chargeLoop, Math.max(LOOP_MS, bot.getCooldown("charge"))))
    }
    chargeLoop()
}

export function startHardshellLoop(bot: Warrior): void {
    async function hardshellLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.hp < bot.max_hp * 0.75
                && bot.canUse("hardshell")) {
                if (bot.calculateTargets().physical > 0) await bot.hardshell()
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("hardshellLoop", setTimeout(hardshellLoop, Math.max(LOOP_MS, bot.getCooldown("hardshell"))))
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

        bot.timeouts.set("warcryLoop", setTimeout(warcryLoop, Math.max(LOOP_MS, bot.getCooldown("warcry"))))
    }
    warcryLoop()
}