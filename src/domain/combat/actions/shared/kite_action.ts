import type { PingCompensatedCharacter } from "alclient"
import type { Action, ActionContext } from "../../../../core/actions/action.js"
import { KiteController, type KiteOptions, type KiteTarget, type NearbyEntity } from "../../kiter.js"
import { TargetSelector, type TargetSelectionOptions } from "../../target_selector.js"
import { MonsterClassifier } from "../../monster_classifier.js"

export interface KiteActionOptions extends KiteOptions {
    gData?: any
    targetOptions?: TargetSelectionOptions
}

export class KiteAction implements Action<PingCompensatedCharacter> {
    public readonly name = "KiteAction"

    private controller: KiteController
    private gData?: any
    private options: KiteActionOptions

    public constructor(options: KiteActionOptions = {}) {
        this.gData = options.gData
        this.options = options
        this.controller = new KiteController(options.gData, options)
    }

    private findTarget(bot: any, context?: ActionContext): KiteTarget | null {
        if (!bot.entities) return null

        // 1. Highest priority threat: any hostile entity actively targeting this squishy bot
        for (const [id, entity] of bot.entities) {
            if (entity.target === bot.name) {
                return {
                    id,
                    type: entity.type,
                    x: entity.x,
                    y: entity.y,
                    speed: entity.speed,
                    attackRange: entity.range,
                    target: entity.target,
                    hp: entity.hp,
                    maxHp: entity.max_hp,
                }
            }
        }

        // 2. Secondary threat: select best target via TargetSelector
        const gData = this.gData ?? bot.G
        if (gData && bot.entities) {
            const rawEntities = Array.from(bot.entities.values()) as any[]
            const partyStatuses = context?.blackboard ? context.blackboard.getAllMembers() : []
            const party = partyStatuses.map((s: any) => ({
                name: s.name,
                type: s.type,
                hp: s.hp,
                maxHp: s.maxHp,
                x: s.x,
                y: s.y,
            }))
            const botActor = {
                name: bot.name ?? bot.id ?? "Unknown",
                type: bot.ctype ?? "mage",
                x: bot.x ?? 0,
                y: bot.y ?? 0,
                range: bot.range ?? 300,
            }

            const selected = TargetSelector.selectBestTarget(
                rawEntities,
                botActor,
                party,
                gData,
                this.options.targetOptions ?? {},
            )
            if (selected) {
                const profile = MonsterClassifier.classify(selected.type as any, gData)
                return {
                    id: selected.id,
                    type: selected.type,
                    x: selected.x,
                    y: selected.y,
                    speed: profile.speed,
                    attackRange: profile.attackRange,
                    target: selected.target ?? undefined,
                    hp: selected.hp,
                    maxHp: selected.max_hp,
                }
            }
        }

        return null
    }

    private getNearbyEntities(bot: any): NearbyEntity[] {
        if (!bot.entities) return []
        const list: NearbyEntity[] = []
        for (const [id, entity] of bot.entities) {
            list.push({
                id,
                type: entity.type,
                x: entity.x,
                y: entity.y,
                target: entity.target,
                hp: entity.hp,
                maxHp: entity.max_hp,
            })
        }
        return list
    }

    public canExecute(bot: PingCompensatedCharacter, context: ActionContext): boolean {
        // Melee tanks should stand their ground and not kite
        if (bot.ctype === "warrior" || bot.ctype === "paladin") {
            return false
        }

        if (bot.rip) return false

        const target = this.findTarget(bot, context)
        if (!target) return false

        const nearby = this.getNearbyEntities(bot)
        const evaluation = this.controller.evaluateKite(
            { x: bot.x, y: bot.y, range: bot.range ?? 300, name: bot.name, ctype: bot.ctype },
            target,
            nearby,
        )

        return evaluation.shouldMove
    }

    public score(bot: PingCompensatedCharacter, context: ActionContext): number {
        if (bot.ctype === "warrior" || bot.ctype === "paladin") {
            return 0
        }

        if (bot.rip) return 0

        const target = this.findTarget(bot, context)
        if (!target) return 0

        const nearby = this.getNearbyEntities(bot)
        const evaluation = this.controller.evaluateKite(
            { x: bot.x, y: bot.y, range: bot.range ?? 300, name: bot.name, ctype: bot.ctype },
            target,
            nearby,
        )

        return evaluation.dangerScore
    }

    public async execute(bot: PingCompensatedCharacter, context: ActionContext): Promise<void> {
        const target = this.findTarget(bot, context)
        if (!target) return

        const nearby = this.getNearbyEntities(bot)
        const evaluation = this.controller.evaluateKite(
            { x: bot.x, y: bot.y, range: bot.range ?? 300, name: bot.name, ctype: bot.ctype },
            target,
            nearby,
        )

        if (evaluation.shouldMove) {
            await bot.move(evaluation.destination.x, evaluation.destination.y).catch(() => {})
        }
    }
}
