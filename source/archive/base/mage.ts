import AL, { Character, Entity, Mage, MonsterName, Pathfinder, SlotType, TradeItemInfo, TradeSlotType } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { Information } from "../../definitions/bot"
import { sortPriority } from "../../base/sort.js"

const CBURST_WHEN_HP_LESS_THAN = 200

export async function attackTheseTypesMage(bot: Mage, types: MonsterName[], friends: Character[] = [], options: {
    cburstWhenHPLessThan?: number
    disableCburst?: boolean
    disableCreditCheck?: boolean
    disableEnergize?: boolean
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

    if (bot.canUse("cburst") && !options.disableCburst) {
        const targets = new Map<string, number>()

        // Cburst low HP monsters
        let mpNeeded = bot.G.skills.cburst.mp + bot.mp_cost
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: options.disableCreditCheck ? undefined : true,
            targetingPartyMember: options.targetingPartyMember,
            targetingPlayer: options.targetingPlayer,
            typeList: types,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (entity.immune) continue // Entity won't take damage from cburst
            if (options.cburstWhenHPLessThan && entity.hp >= options.cburstWhenHPLessThan) continue
            else if (entity.hp >= CBURST_WHEN_HP_LESS_THAN) continue // Lots of HP
            if (AL.Constants.SPECIAL_MONSTERS.includes(entity.type)) continue // Don't cburst special monsters
            const extraMP = entity.hp / bot.G.skills.cburst.ratio
            if (mpNeeded + extraMP > bot.mp) continue // We can't cburst anything more
            targets.set(entity.id, extraMP)
            mpNeeded += extraMP
        }

        // Cburst humanoids for the chance to regain mp.
        let humanoidRestorability = 0
        for (const slotName in bot.slots) {
            const slot = bot.slots[slotName as SlotType | TradeSlotType]
            if (!slot || (slot as TradeItemInfo).price != undefined) continue
            const gItem = bot.G.items[slot.name]
            if (gItem.ability == "restore_mp") {
                humanoidRestorability += gItem.attr0 * 5
            }
        }
        if (humanoidRestorability > 100 / 3) {
            for (const entity of bot.getEntities({
                couldGiveCredit: options.disableCreditCheck ? undefined : true,
                typeList: types,
                willDieToProjectiles: false,
                withinRange: bot.range
            })) {
                if (entity.immune) continue // Entity won't take damage from cburst
                if (!entity.humanoid) continue // Entity isn't a humanoid
                if (targets.has(entity.id)) continue // It's low HP (from previous for loop), we're already going to kill it

                const extraMP = 100
                if (mpNeeded + extraMP > bot.mp) break // We can't cburst anything more
                targets.set(entity.id, extraMP)
                mpNeeded += extraMP
            }
        }

        let strangerNearby = false
        for (const [, player] of bot.players) {
            if (player.isFriendly(bot)) continue // They are friendly

            const distance = AL.Tools.distance(bot, player)
            if (distance > bot.range + player.range + 100) continue // They are far away

            strangerNearby = true
            break
        }
        if (strangerNearby) {
            // Cburst monsters to kill steal
            for (const entity of bot.getEntities({
                canDamage: true,
                couldGiveCredit: options.disableCreditCheck ? undefined : true,
                willDieToProjectiles: true,
                withinRange: bot.range
            })) {
                if (entity.immune) continue // Entity won't take damage from cburst
                if (entity.target) continue // Already has a target
                if (entity.xp < 0) continue // Don't try to kill steal pets
                const extraMP = 1 / bot.G.skills.cburst.ratio
                if (mpNeeded + extraMP > bot.mp) break // We can't cburst anything more
                targets.set(entity.id, extraMP)
                mpNeeded += extraMP
            }

            if (targets.size && bot.mp >= mpNeeded) {
                // Remove them from our friends' entities list, since we're going to kill them
                for (const [id] of targets) {
                    for (const friend of friends) {
                        if (!friend) continue // No friend
                        if (friend.id == bot.id) continue // Don't delete it from our own list
                        friend.deleteEntity(id)
                    }
                }

                const cburstTargets: [string, number][] = []
                for (const cburstData of targets) {
                    cburstTargets.push(cburstData)
                }

                await bot.cburst(cburstTargets)
            }
        }
    }

    if (bot.canUse("attack")) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of bot.getEntities({
            canDamage: true,
            couldGiveCredit: options.disableCreditCheck ? undefined : true,
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
                (friend as Mage).energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp))).catch(console.error)
                break
            }
        }
        await bot.basicAttack(target.id)
    }

    // Cburst when we have a lot of mp
    if (bot.canUse("cburst") && !options.disableCburst && bot.mp > bot.max_mp - 500) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of bot.getEntities({
            couldGiveCredit: options.disableCreditCheck ? undefined : true,
            typeList: types,
            willBurnToDeath: false,
            willDieToProjectiles: false,
            withinRange: bot.range
        })) {
            if (entity.immune) continue // Entity won't take damage from cburst
            targets.add(entity)
        }

        const target = targets.peek()
        if (target) await bot.cburst([[target.id, Math.min(target.hp * 2, bot.mp - 500)]])
    }

    if (!options.disableZapper && bot.canUse("zapperzap", { ignoreEquipped: true }) && bot.cc < 100) {
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const target of bot.getEntities({
            canDamage: true,
            couldGiveCredit: options.disableCreditCheck ? undefined : true,
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
                promises.push(bot.zapperZap(target.id).catch(console.error))

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
                if (target.immune) continue // Entity won't take damage from cburst
                if (target.target) continue // Already has a target
                if (target.xp < 0) continue // Don't try to kill steal pets

                const zapper: number = bot.locateItem("zapper", bot.items, { returnHighestLevel: true })
                if (bot.isEquipped("zapper") || (zapper !== undefined)) {
                // Equip zapper
                    if (zapper !== undefined) bot.equip(zapper, "ring1")

                    // Zap
                    const promises: Promise<unknown>[] = []
                    promises.push(bot.zapperZap(target.id).catch(console.error))

                    // Re-equip ring
                    if (zapper !== undefined) promises.push(bot.equip(zapper, "ring1"))
                    await Promise.all(promises)
                    break
                }
            }
        }
    }
}

const lastMagiport = new Map<string, number>()
export async function magiportFriendsIfNotNearby(bot: Mage, information: Information, distance = AL.Constants.MAX_VISIBLE_RANGE): Promise<void> {
    if (!bot.canUse("magiport")) return // Can't use magiport

    const offerMagiport = async (friend: Character) => {
        if (friend.id == bot.id) return // It's us!
        if (lastMagiport.get(friend.id) > Date.now() - 5000) return // Recently offered a magiport
        if (AL.Tools.distance(bot, friend) <= distance) return // Already nearby

        if (bot.canUse("magiport")) {
            bot.magiport(friend.id).catch(console.error)
            lastMagiport.set(friend.id, Date.now())
        }
    }

    let myTarget: string
    if (information.bot1.name == bot.id) myTarget = information.bot1.target
    else if (information.bot2.name == bot.id) myTarget = information.bot2.target
    else if (information.bot3.name == bot.id) myTarget = information.bot3.target

    if (information.bot1.name !== bot.id && myTarget == information.bot1.target) offerMagiport(information.bot1.bot)
    if (information.bot2.name !== bot.id && myTarget == information.bot2.target) offerMagiport(information.bot2.bot)
    if (information.bot3.name !== bot.id && myTarget == information.bot3.target) offerMagiport(information.bot3.bot)
}

export function magiportStrangerIfNotNearby(bot: Mage, id: string): void {
    if (!bot.canUse("magiport")) return // Can't use magiport
    if (lastMagiport.get(id) > Date.now() - 5000) return // Recently offered a magiport
    if (id == bot.id) return // It's us!

    const player = bot.players.get(id)
    if (player && Pathfinder.canWalkPath(bot, player)) return // Nearby

    // Magiport
    bot.magiport(id).catch(console.error)
    lastMagiport.set(id, Date.now())
}

// export function startKillSteal(bot: Mage) {
//     bot.socket.on("action", (data: ActionData) => {

//     })
// }