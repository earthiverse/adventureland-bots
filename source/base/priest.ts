import AL, { Character, Entity, Mage, MonsterName, Player, Priest } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { LOOP_MS } from "./general.js"

export async function attackTheseTypesPriest(bot: Priest, types: MonsterName[], friends: Character[] = [], options: {
    healStrangers?: boolean
    targetingPartyMember?: boolean
    targetingPlayer?: string
} = {}): Promise<void> {
    if (!bot.canUse("attack")) return // We can't attack

    // Adjust options
    if (options.targetingPlayer && options.targetingPlayer == bot.id) options.targetingPlayer = undefined

    if (bot.c.town) return // Don't attack if teleporting

    const healPriority = (a: Player, b: Player) => {
        // Heal our friends first
        const a_isFriend = friends.some((friend) => { friend?.id == a.id })
        const b_isFriend = friends.some((friend) => { friend?.id == b.id })
        if (a_isFriend && !b_isFriend) return true
        else if (b_isFriend && !a_isFriend) return false

        // Heal those with lower HP first
        const a_hpRatio = a.hp / a.max_hp
        const b_hpRatio = b.hp / b.max_hp
        if (a_hpRatio < b_hpRatio) return true
        else if (b_hpRatio < a_hpRatio) return false

        // Heal closer players
        return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
    }
    const players = new FastPriorityQueue<Character | Player>(healPriority)
    // Potentially heal ourself
    if (bot.hp / bot.max_hp <= 0.8) players.add(bot)
    // Potentially heal others
    for (const [, player] of bot.players) {
        if (AL.Tools.distance(bot, player) > bot.range) continue // Too far away to heal
        if (player.rip) continue // Player is already dead
        if (player.hp / player.max_hp > 0.8) continue // Player still has a lot of hp

        const isFriend = friends.some((friend) => { friend?.id == bot.id })
        if (!isFriend && bot.party && bot.party !== player.party && !options.healStrangers) continue // They're not our friend, not in our party, and we're not healing strangers

        players.add(player)
    }
    const toHeal = players.peek()
    if (toHeal) {
        await bot.heal(toHeal.id)
        return
    }

    // NOTE: Apparently this doesn't work!?
    // // Heal entities that drop on hit if they are damaged
    // for (const entity of bot.getEntities({ withinRange: bot.range })) {
    //     if (!entity.drop_on_hit) continue
    //     if (entity.hp == entity.max_hp) continue

    //     await bot.heal(entity.id)
    //     return
    // }

    if (bot.isOnCooldown("scare")) return

    const attackPriority = (a: Entity, b: Entity): boolean => {
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

    const targets = new FastPriorityQueue<Entity>(attackPriority)
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
    if (targets.size == 0) return // No target

    const target = targets.peek()
    const canKill = bot.canKillInOneShot(target)

    // Apply curse if we can't kill it in one shot and we have enough MP
    if (bot.canUse("curse") && bot.mp > (bot.mp_cost + bot.G.skills.curse.mp) && !canKill && !target.immune) {
        bot.curse(target.id).catch(e => console.error(e))
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

    // Remove them from our friends' entities list if we're going to kill it
    if (canKill) {
        for (const friend of friends) {
            if (!friend) continue // No friend
            if (friend.id == bot.id) continue // Don't delete it from our own list
            if (AL.Constants.SPECIAL_MONSTERS.includes(target.type)) continue // Don't delete special monsters
            friend.deleteEntity(target.id)
        }
    }

    await bot.basicAttack(target.id)
}

export function startDarkBlessingLoop(bot: Priest): void {
    async function darkBlessingLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (!bot.s.darkblessing && bot.canUse("darkblessing")) await bot.darkBlessing()
        } catch (e) {
            console.error(e)
        }

        bot.timeouts.set("darkblessingloop", setTimeout(async () => { darkBlessingLoop() }, Math.max(LOOP_MS, bot.getCooldown("darkblessing"))))
    }
    darkBlessingLoop()
}

export function startPartyHealLoop(bot: Priest, friends: Character[] = []): void {
    async function partyHealLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return

            if (bot.c.town) {
                bot.timeouts.set("partyhealloop", setTimeout(async () => { partyHealLoop() }, bot.c.town.ms))
                return
            }

            // Check provided characters (we can heal them wherever they are, we just need to know if they're hurt)
            if (bot.canUse("partyheal")) {
                for (const friend of friends) {
                    if (!friend) continue // No friend
                    if (friend.party !== bot.party) continue // Our priest isn't in the same party!?
                    if (friend.rip) continue // Party member is already dead
                    if (friend.hp < friend.max_hp * 0.5) {
                        // Someone in our party has low HP
                        await bot.partyHeal()
                        break
                    }
                }
            }

            // Check characters around us
            if (bot.canUse("partyheal")) {
                for (const [, player] of bot.players) {
                    if (!player) continue // No player
                    if (player.party !== bot.party) continue // Not in the same party
                    if (player.rip) continue // Player is already dead
                    if (player.hp < player.max_hp * 0.5) {
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