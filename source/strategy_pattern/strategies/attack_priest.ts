import AL, { Entity, PingCompensatedCharacter, Player, Priest } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"
import { suppress_errors } from "../logging.js"

export type PriestAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableAbsorb?: true
    disableCurse?: true
    disableDarkBlessing?: true
    enableHealStrangers?: true
}

export class PriestAttackStrategy extends BaseAttackStrategy<Priest> {
    public options: PriestAttackStrategyOptions

    protected healPriority = new Map<string, (a: PingCompensatedCharacter | Player, b: PingCompensatedCharacter | Player) => boolean>()

    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)

        if (!this.options.disableDarkBlessing) this.interval.push("darkblessing")
    }

    public onApply(bot: Priest): void {
        this.healPriority.set(bot.id, (a: PingCompensatedCharacter | Player, b: PingCompensatedCharacter | Player) => {
            // Heal our own characters
            const a_isOurs = a.owner && bot.owner == a.owner
            const b_isOurs = b.owner && bot.owner == b.owner
            if (a_isOurs && !b_isOurs) return true
            else if (b_isOurs && !a_isOurs) return false

            // Heal party members
            const a_party = a.party && bot.party && bot.party == a.party
            const b_party = b.party && bot.party && bot.party == b.party
            if (a_party && !b_party) return true
            else if (b_party && !a_party) return false

            // Heal lower hp players
            const a_hpRatio = a.hp / a.max_hp
            const b_hpRatio = b.hp / b.max_hp
            if (a_hpRatio < b_hpRatio) return true
            else if (b_hpRatio < a_hpRatio) return false

            // Heal closer players
            return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
        })
    }

    protected async attack(bot: Priest): Promise<void> {
        await this.healFriendsOrSelf(bot)
        if (!this.options.disableDarkBlessing) this.applyDarkBlessing(bot)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.sort.get(bot.id)

        await this.ensureEquipped(bot)

        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableAbsorb) await this.absorbTargets(bot).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot)
    }

    protected async basicAttack(bot: Priest, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("attack")) return // We can't attack

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "attack",
            withinRange: "attack"
        })
        if (entities.length == 0) return // No targets to attack

        // Prioritize the entities
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        if (!this.options.disableCurse) this.applyCurse(bot, targets.peek()).catch(suppress_errors)

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
                if (bot.targets >= this.options.maximumTargets) continue // We don't want another target
                switch (target.damage_type) {
                    case "magical":
                        if (bot.mcourage <= targetingMe.magical) continue // We can't tank any more magical monsters
                        break
                    case "physical":
                        if (bot.courage <= targetingMe.physical) continue // We can't tank any more physical monsters
                        break
                    case "pure":
                        if (bot.courage <= targetingMe.pure) continue // We can't tank any more pure monsters
                        break
                }
            }

            const canKill = bot.canKillInOneShot(target)
            if (canKill) this.preventOverkill(bot, target)
            if (!canKill || targets.size > 0) this.getEnergizeFromOther(bot)
            return bot.basicAttack(target.id)
        }
    }

    protected async healFriendsOrSelf(bot: Priest): Promise<unknown> {
        if (!bot.canUse("heal")) return

        const healPriority = this.healPriority.get(bot.id)
        const players = new FastPriorityQueue<PingCompensatedCharacter | Player>(healPriority)

        // Potentially heal ourself
        if (bot.hp / bot.max_hp <= 0.8) players.add(bot)

        for (const player of bot.getPlayers({
            isDead: false,
            isFriendly: this.options.enableHealStrangers ? undefined : true,
            isNPC: false,
            withinRange: "heal",
        })) {
            if (player.hp / player.max_hp > 0.8) continue // They have enough hp

            // TODO: Check for healing projectiles, if they'll be fully healed from them, don't heal

            players.add(player)
        }

        const toHeal = players.peek()
        if (toHeal) {
            return bot.healSkill(toHeal.id)
        }
    }

    protected async absorbTargets(bot: Priest) {
        if (!bot.canUse("absorb")) return // Can't absorb

        if (this.options.enableGreedyAggro) {
            // Absorb the sins of other players attacking coop monsters
            const entity = bot.getEntity({
                couldGiveCredit: true,
                targetingPartyMember: false,
                typeList: this.options.typeList,
            })
            if (entity) {
                const player = bot.players.get(entity.target)
                if (player && AL.Tools.distance(bot, player) < AL.Game.G.skills.absorb.range) {
                    return bot.absorbSins(player.id)
                }
            }
        }
    }

    protected applyCurse(bot: Priest, entity: Entity) {
        if (!entity) return // No entity
        if (entity.immune && !AL.Game.G.skills.curse.pierces_immunity) return // Can't curse
        if (!bot.canUse("curse")) return
        if (bot.canKillInOneShot(entity) || entity.willBurnToDeath() || entity.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)) return // Would be a waste to use if we can kill it right away

        return bot.curse(entity.id)
    }

    protected async applyDarkBlessing(bot: Priest) {
        if (!bot.canUse("darkblessing")) return
        if (bot.s.darkblessing) return // We already have it applied
        if (!bot.getEntity(this.options)) return // We aren't about to attack

        return bot.darkBlessing()
    }
}