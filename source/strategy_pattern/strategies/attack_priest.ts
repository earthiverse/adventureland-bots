import AL, { PingCompensatedCharacter, Player, Priest } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { sortPriority } from "../../base/sort.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type PriestAttackStrategyOptions = BaseAttackStrategyOptions & {
    healStrangers?: boolean
}

export class PriestAttackStrategy extends BaseAttackStrategy<Priest> {
    public options: PriestAttackStrategyOptions

    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)
    }

    public async attack(bot: Priest): Promise<void> {
        const priority = sortPriority(bot, this.options.typeList)

        await this.healFriendsOrSelf(bot)
        await this.basicAttack(bot, priority)
    }

    public async healFriendsOrSelf(bot: Priest): Promise<unknown> {
        const healPriority = (a: PingCompensatedCharacter, b: PingCompensatedCharacter) => {
            // Heal our friends first
            const a_isFriend = this.options.contexts.some((friend) => { friend.bot?.id == a.id })
            const b_isFriend = this.options.contexts.some((friend) => { friend.bot?.id == b.id })
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

        const players = new FastPriorityQueue<PingCompensatedCharacter | Player>(healPriority)

        // Potentially heal ourself
        if (bot.hp / bot.max_hp <= 0.8) players.add(bot)

        for (const player of bot.getPlayers({
            isDead: false,
            isFriendly: this.options.healStrangers ? undefined : true,
            isNPC: false,
            withinRange: "heal",
        })) {
            if (player.hp / player.max_hp > 0.8) continue // They have enough hp

            // TODO: Check for healing projectiles, if they'll be fully healed from them, don't heal

            players.add(player)
        }

        const toHeal = players.peek()
        if (toHeal) {
            return bot.heal(toHeal.id)

        }
    }
}