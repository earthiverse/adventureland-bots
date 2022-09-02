import { Warrior } from "alclient"
import { sortPriority } from "../../base/sort.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./attack.js"

export type WarriorAttackStrategyOptions = BaseAttackStrategyOptions & {
    disableCleave?: boolean
}

export class WarriorAttackStrategy extends BaseAttackStrategy<Warrior> {
    public options: WarriorAttackStrategyOptions

    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.loops.set("attack", {
            fn: async (bot: Warrior) => {
                if (!this.shouldAttack(bot)) return
                await this.attack(bot)
            },
            interval: ["attack", "cleave"]
        })
    }

    protected async attack(bot: Warrior) {
        const priority = sortPriority(bot, this.options.typeList)

        if (!this.options.disableCleave) await this.cleave(bot)
        this.applyWarCry(bot)
        await this.basicAttack(bot, priority)
    }

    protected async cleave(bot: Warrior) {
        if (!bot.canUse("cleave")) return

        if (bot.isPVP()) {
            const nearby = bot.getPlayers({
                // TODO: Confirm that we can't do damage to party members and friends with cleave on PvP
                isFriendly: true,
                withinRange: "cleave"
            })
            if (nearby.length > 0) return
        }

        // Find all targets we want to attack
        const entities = bot.getEntities({
            ...this.options,
            withinRange: "cleave",
            canDamage: "cleave"
        })
        if (entities.length == 0) return // No targets to attack

        // Calculate how much courage we have left to spare
        const targetingMe = bot.calculateTargets()

        let newTargets = 0

        for (const entity of entities) {
            if ((this.options.targetingPartyMember && !entity.target)
                || (this.options.targetingPlayer && !entity.target)) {
                // We want to avoid aggro
                return
            }
            if ((this.options.type && entity.type !== this.options.type)
                || (this.options.typeList && !this.options.typeList.includes(entity.type))) {
                // We don't want to attack something that's within cleave range
                return
            }

            // Calculate the new fear if we cleave
            if (entity.target) continue // It won't change our fear
            if (bot.canKillInOneShot(entity, "cleave")) continue // It won't change our fear
            switch (entity.damage_type) {
                case "magical":
                    if (bot.mcourage > targetingMe.magical) targetingMe.magical += 1 // We can tank one more magical monster
                    else return // We can't tank any more, don't cleave
                    break
                case "physical":
                    if (bot.courage > targetingMe.physical) targetingMe.physical += 1 // We can tank one more physical monster
                    else return // We can't tank any more, don't cleave
                    break
                case "pure":
                    if (bot.pcourage > targetingMe.pure) targetingMe.pure += 1 // We can tank one more pure monster
                    else return // We can't tank any more, don't cleave
                    break
            }
            newTargets += 1

            if (this.options.maximumTargets && newTargets + bot.targets > this.options.maximumTargets) {
                // We'll go over our limit if we cleave
                return
            }
        }

        for (const entity of entities) if (bot.canKillInOneShot(entity, "cleave")) this.preventOverkill(bot, entity)
        return bot.cleave().catch(console.error)
    }

    protected async applyWarCry(bot: Warrior) {
        if (!bot.canUse("warcry")) return
        if (bot.s.warcry) return // We already have it applied
        if (!bot.getEntity(this.options)) return // We aren't about to attack

        bot.warcry().catch(console.error)
    }
}