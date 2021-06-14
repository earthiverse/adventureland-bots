import AL from "alclient-mongo"
import FastPriorityQueue from "fastpriorityqueue"
import { LOOP_MS } from "./general.js"

export async function attackTheseTypesPriest(bot: AL.Priest, types: AL.MonsterName[], friends: AL.Character[], options?: {
    targetingPlayer?: string
}): Promise<void> {
    if (!bot.canUse("attack")) return // We can't attack
    if (bot.c.town) return // Don't attack if teleporting

    const healPriority = (a: AL.Player, b: AL.Player) => {
        // Heal our friends first
        const a_isFriend = friends.some((friend) => { friend.id == a.id })
        const b_isFriend = friends.some((friend) => { friend.id == b.id })
        if (a_isFriend && !b_isFriend) return true
        else if (b_isFriend && !a_isFriend) return false

        // Heal those with lower HP first
        const a_hpRatio = a.hp / a.max_hp
        const b_hpRatio = b.hp / b.max_hp
        if (a_hpRatio < b_hpRatio) return true
        else if (b_hpRatio < a_hpRatio) return false
    }
    const players = new FastPriorityQueue<AL.Player>(healPriority)
    for (const [, player] of bot.players) {
        if (AL.Tools.distance(bot, player) > bot.range) continue // Too far away to heal
        if (player.hp / player.max_hp > 0.8) continue // Player still has a lot of hp

        const isFriend = friends.some((friend) => { friend.id == bot.id })
        if (!isFriend && bot.party && bot.partyData.list && !bot.partyData.list.includes(player.id)) continue // They're not our friend, and not in our party

        players.add(player)
    }
    const toHeal = players.peek()
    if (toHeal) {
        await bot.heal(toHeal.id)
        return
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
    if (targets.size == 0) return // No target

    const target = targets.peek()

    // Apply curse if we can't kill it in one shot and we have enough MP
    if (bot.canUse("curse") && bot.mp > (bot.mp_cost + bot.G.skills.curse.mp) && !bot.canKillInOneShot(target)) {
        bot.curse(target.id).catch((e) => { console.error(e) })
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

    await bot.basicAttack(target.id)
}

export function startPartyHealLoop(bot: AL.Priest | AL.Priest, friends: AL.Character[] | AL.Character[]): void {
    async function partyHealLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.c.town) {
                bot.timeouts.set("partyhealloop", setTimeout(async () => { partyHealLoop() }, bot.c.town.ms))
                return
            }

            if (bot.canUse("partyheal")) {
                for (const friend of friends) {
                    if (friend.party !== bot.party) continue // Our priest isn't in the same party!?
                    if (friend.rip) continue // Party member is already dead
                    if (friend.hp < friend.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await bot.partyHeal()
                        break
                    }
                }
            }
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("partyhealloop", setTimeout(async () => { partyHealLoop() }, Math.max(bot.getCooldown("partyheal"), LOOP_MS)))
    }
    partyHealLoop()
}