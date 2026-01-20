import AL, { Attribute, Entity, MonsterName, PingCompensatedCharacter, Player, Priest } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { BaseAttackStrategy, BaseAttackStrategyOptions, EnsureEquipped } from "./attack.js"
import { suppress_errors } from "../logging.js"
import { checkOnlyEveryMS } from "../../base/general.js"
import { generateEnsureEquipped } from "../setups/equipment.js"

export type PriestAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableAbsorb?: true
    disableCurse?: true
    disableDarkBlessing?: true
    enableAbsorbToTank?: true
    enableHealStrangers?: true
}

export class PriestAttackStrategy extends BaseAttackStrategy<Priest> {
    declare protected options: PriestAttackStrategyOptions

    protected healPriority = new Map<
        string,
        (a: PingCompensatedCharacter | Player, b: PingCompensatedCharacter | Player) => boolean
    >()

    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)

        if (!this.options.disableCurse) this.interval.push("curse")
        if (!this.options.disableDarkBlessing) this.interval.push("darkblessing")
    }

    public onApply(bot: Priest): void {
        super.onApply(bot)
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
        await this.healFriendsOrSelf(bot).catch(suppress_errors)
        if (!this.options.disableDarkBlessing) this.applyDarkBlessing(bot).catch(suppress_errors)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.botSort.get(bot.id)

        await this.ensureEquipped(bot).catch(console.error)

        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableAbsorb) await this.absorbTargets(bot).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot).catch(console.error)
    }

    protected async basicAttack(bot: Priest, priority: (a: Entity, b: Entity) => boolean): Promise<unknown> {
        if (!bot.canUse("attack")) return // We can't attack

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            canDamage: "attack",
            withinRange: "attack",
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
            if (bot.canKillInOneShot(target)) this.preventOverkill(bot, target)

            if (
                !canKill ||
                targets.size > 0 || // Energize if there are more targets around
                bot.mp < bot.max_mp * 0.25 // Energize if we are low on MP
            )
                this.getEnergizeFromOther(bot).catch(suppress_errors)

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
            if (player.name === "Geoffriel") continue // Aria asked me on 2025-10-23 not to heal their priest

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
                ...this.options,
                isCooperative: true,
                targetingPartyMember: false,
            })
            if (entity) {
                const player = bot.players.get(entity.target)
                if (player && AL.Tools.distance(bot, player) < AL.Game.G.skills.absorb.range) {
                    return bot.absorbSins(player.id)
                }
            }
        }

        if (this.options.enableAbsorbToTank) {
            const entity = bot.getEntity({
                ...this.options,
                targetingMe: false,
                targetingPartyMember: true,
            })
            if (entity) {
                const player = bot.players.get(entity.target)
                if (player && AL.Tools.distance(bot, player) < AL.Game.G.skills.absorb.range) {
                    return bot.absorbSins(player.id)
                }
            }
        }

        // TODO: If there are bots in our contexts that are scared, and we can safely tank all of their targets, absorb their targets
    }

    protected async applyCurse(bot: Priest, entity: Entity) {
        if (!entity) return // No entity
        if (entity.s.curse) return // Already cursed
        if (entity.immune && !AL.Game.G.skills.curse.pierces_immunity) return // Can't curse
        if (!bot.canUse("curse")) return
        if (
            bot.canKillInOneShot(entity) ||
            entity.willBurnToDeath() ||
            entity.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        )
            return // Would be a waste to use if we can kill it right away

        return bot.curse(entity.id)
    }

    protected async applyDarkBlessing(bot: Priest) {
        if (!bot.canUse("darkblessing")) return
        if (bot.s.darkblessing) return // We already have it applied
        if (!bot.getEntity(this.options)) return // We aren't about to attack

        return bot.darkBlessing()
    }
}

export type PriestAttackWithLuckStrategyOptions = PriestAttackStrategyOptions & {
    /** For the given monster name, if less than hp, switch to attributes */
    switchConfig: [MonsterName, hp: number, attributes: Attribute[]][]
}

/**
 * Can be used to change equipment if we see certain monsters
 */
export class PriestAttackWithAttributesStrategy extends PriestAttackStrategy {
    declare public options: PriestAttackWithLuckStrategyOptions
    public originalEnsureEquipped: EnsureEquipped

    public constructor(options?: PriestAttackWithLuckStrategyOptions) {
        super(options)

        this.originalEnsureEquipped = structuredClone(options.ensureEquipped)
    }

    protected ensureEquipped(bot: Priest): Promise<void> {
        let switched = false
        if (checkOnlyEveryMS(`equip_${bot.id}`, 2_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            for (const [type, hpLessThan, attributes] of this.options.switchConfig) {
                const monster = bot.getEntity({ type, hpLessThan })
                if (!monster) continue // No monster, or not low enough HP

                // Equip with our attributes
                console.debug("DEBUG: SWITCHING TO LUCK ON", bot.id, "FOR", type)
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes }))
                switched = true
                break
            }
        }

        // Use our original equipment
        if (!switched) this.botEnsureEquipped.set(bot.id, this.originalEnsureEquipped)

        return super.ensureEquipped(bot)
    }
}
