import AL, { Entity, Mage, PingCompensatedCharacter, Ranger, Tools } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { mainBeesNearGoos } from "../base/locations.js"
import { sortPriority } from "../base/sort.js"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { DebugStrategy } from "../strategy_pattern/strategies/debug.js"

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
let MAGE_CONTEXT: Strategist<Mage>

class EnergizeDebugAttackStrategy implements Strategy<Ranger> {
    public loops = new Map<LoopName, Loop<Ranger>>()
    protected mageContext: Strategist<Mage>

    public constructor(mageContext: Strategist<Mage>) {
        this.mageContext = mageContext

        this.loops.set("attack", {
            fn: async (bot: Ranger) => {
                if (!bot.canUse("attack")) return
                this.getEnergize(bot)
                // if (this.getEnergize(bot) || !bot.s.energized) return // Only attack if we are energized
                await this.attack(bot)

            },
            interval: ["attack"]
        })
    }

    protected attack(bot: Ranger): Promise<unknown> {
        // Find all targets we want to attack
        const entities = bot.getEntities({
            type: "bee",
            canDamage: "attack",
            withinRange: "attack"
        })
        if (entities.length == 0) return // No targets to attack

        // Prioritize the entities
        const priority = sortPriority(bot, ["bee"])
        const targets = new FastPriorityQueue<Entity>(priority)
        for (const entity of entities) targets.add(entity)

        const targetingMe = bot.calculateTargets()

        while (targets.size) {
            const target = targets.poll()

            if (!target.target) {
                // We're going to be tanking this monster, don't attack if it pushes us over our limit
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

            return bot.basicAttack(target.id).catch(console.error)
        }
    }

    protected getEnergize(bot: Ranger): boolean {
        if (bot.s.energized) return false
        const mage = this.mageContext.bot as Mage
        if (!mage || mage.socket.disconnected || !mage.ready) return false
        if (!mage.canUse("energize")) return false
        if (Tools.distance(bot, mage) > AL.Game.G.skills.energize.range) return false

        mage.energize(bot.id, Math.min(100, Math.max(1, bot.max_mp - bot.mp))).catch(console.error)
        return true
    }
}

async function run() {
    console.log("Logging in, etc...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()

    const mage = await AL.Game.startMage("attackMag", "US", "I")
    MAGE_CONTEXT = new Strategist<Mage>(mage, baseStrategy)
    startEnergizeMage(MAGE_CONTEXT)
    CONTEXTS.push(MAGE_CONTEXT)

    const ranger = await AL.Game.startRanger("attacking", "US", "I")
    const rangerContext = new Strategist<Ranger>(ranger, baseStrategy)
    startRanger(rangerContext)
    CONTEXTS.push(rangerContext)
}
run().catch(console.error)

async function startEnergizeMage(context: Strategist<Mage>) {
    context.bot.smartMove(mainBeesNearGoos)

    const debugStrategy = new DebugStrategy({
        logSkills: true,
        logSkillTimeouts: true
    })
    context.applyStrategy(debugStrategy)
}

async function startRanger(context: Strategist<Ranger>) {
    context.bot.smartMove(mainBeesNearGoos, { getWithin: 25 })

    const attackStrategy = new EnergizeDebugAttackStrategy(MAGE_CONTEXT)
    context.applyStrategy(attackStrategy)

    const debugStrategy = new DebugStrategy({
        logAttacks: true,
        logSkills: true,
        logSkillTimeouts: true
    })
    context.applyStrategy(debugStrategy)
}