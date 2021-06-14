import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"
import { LOOP_MS } from "./general.js"

export async function attackTheseTypesWarrior(bot: AL.Warrior, types: AL.MonsterName[], friends: AL.Character[], options?: {
    targetingPlayer?: string
    disableAgitate?: boolean
    disableCleave?: boolean
    disableStomp?: boolean
    maximumTargets?: number
}): Promise<void> {
    if (bot.canUse("cleave") && !options?.disableCleave) {
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

        const cleaveTargets: AL.Entity[] = []
        let avoidCleave = false
        for (const entity of bot.getEntities({
            withinRange: bot.G.skills.cleave.range,
        })) {
            if (entity.target == bot.id) continue // Already targeting me
            if (!entity.isTauntable(bot)) continue // Already has a target
            if (!types.includes(entity.type) || avoidCleave) {
            // A monster we don't want to attack is here, don't cleave
                avoidCleave = true
                break
            }

            switch (entity.damage_type) {
            case "magical":
                if (bot.mcourage > numMagicalTargetingMe) numMagicalTargetingMe += 1 // We can tank one more magical monster
                else {
                    // We can't tank any more, don't cleave
                    avoidCleave = true
                    continue
                }
                break
            case "physical":
                if (bot.courage > numPhysicalTargetingMe) numPhysicalTargetingMe += 1 // We can tank one more physical monster
                else {
                    // We can't tank any more, don't cleave
                    avoidCleave = true
                    continue
                }
                break
            case "pure":
                if (bot.pcourage > numPureTargetingMe) numPureTargetingMe += 1 // We can tank one more pure monster
                else {
                    // We can't tank any more, don't cleave
                    avoidCleave = true
                    continue
                }
                break
            }

            cleaveTargets.push(entity)
        }
        if (options?.maximumTargets && cleaveTargets.length + bot.targets > options?.maximumTargets) avoidCleave = true
        if (!avoidCleave && cleaveTargets.length > 1) {
            bot.mp -= bot.G.skills.cleave.mp

            // If we're going to kill the target, remove it from our friends
            for (const target of cleaveTargets) {
                if (bot.canKillInOneShot(target, "cleave")) {
                    for (const friend of friends) {
                        friend.entities.delete(target.id)
                    }
                }
            }

            // We'll wait, there's a chance cleave could do a lot of damage and kill the entity, so we don't want to waste the attack
            await bot.cleave()
        }
    }

    if (bot.canUse("agitate") && !options?.disableAgitate) {
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

        const agitateTargets: AL.Entity[] = []
        let avoidAgitate = false
        for (const entity of bot.getEntities({
            withinRange: bot.G.skills.agitate.range,
        })) {
            if (entity.target == bot.id) continue // Already targeting me
            if (!entity.isTauntable(bot)) continue // Not tauntable
            if (!types.includes(entity.type) || avoidAgitate) {
            // A monster we don't want to attack is here, don't agitate
                avoidAgitate = true
                break
            }

            switch (entity.damage_type) {
            case "magical":
                if (bot.mcourage > numMagicalTargetingMe) numMagicalTargetingMe += 1 // We can tank one more magical monster
                else {
                // We can't tank any more, don't agitate
                    avoidAgitate = true
                    continue
                }
                break
            case "physical":
                if (bot.courage > numPhysicalTargetingMe) numPhysicalTargetingMe += 1 // We can tank one more physical monster
                else {
                // We can't tank any more, don't agitate
                    avoidAgitate = true
                    continue
                }
                break
            case "pure":
                if (bot.pcourage > numPureTargetingMe) numPureTargetingMe += 1 // We can tank one more pure monster
                else {
                // We can't tank any more, don't agitate
                    avoidAgitate = true
                    continue
                }
                break
            }

            agitateTargets.push(entity)
        }
        if (options?.maximumTargets && bot.targets + agitateTargets.length > options?.maximumTargets) avoidAgitate = true
        if (!avoidAgitate && agitateTargets.length > 1) {
            bot.agitate().catch((e) => { console.error(e) })
            bot.mp -= bot.G.skills.agitate.mp
        } else if (agitateTargets.length == 1 && bot.canUse("taunt") && !(options?.maximumTargets && bot.targets + 1 > options?.maximumTargets)) {
            bot.taunt(agitateTargets[0].id).catch((e) => { console.error(e) })
            bot.mp -= bot.G.skills.taunt.mp
        }
    }

    if (bot.canUse("attack")) {
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

        const targets = new FastPriorityQueue<AL.Entity>(priority)
        for (const entity of bot.getEntities({
            couldGiveCredit: true,
            targetingPlayer: options?.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            targets.add(entity)
        }
        if (targets.size) {
            const entity = targets.peek()
            const canKill = bot.canKillInOneShot(entity)

            if (!canKill && !options?.disableStomp && bot.canUse("stomp") && bot.mp > bot.G.skills.stomp.mp + bot.mp_cost) {
                bot.stomp().catch((e) => { console.error(e) })
                bot.mp -= bot.G.skills.stomp.mp
            }

            // Remove them from our friends' entities list if we're going to kill it
            if (canKill) {
                for (const friend of friends) friend.entities.delete(entity.id)
            }

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

            await bot.basicAttack(entity.id)
        }
    }
}

export function startChargeLoop(bot: AL.Warrior | AL.Warrior): void {
    async function chargeLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.canUse("charge")) await bot.charge()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("chargeloop", setTimeout(async () => { chargeLoop() }, Math.max(LOOP_MS, bot.getCooldown("charge"))))
    }
    chargeLoop()
}

export function startWarcryLoop(bot: AL.Warrior | AL.Warrior): void {
    async function warcryLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.warcry && bot.canUse("warcry")) await bot.warcry()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("warcryloop", setTimeout(async () => { warcryLoop() }, Math.max(LOOP_MS, bot.getCooldown("warcry"))))
    }
    warcryLoop()
}