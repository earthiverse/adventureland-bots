import type { GData } from "alclient"
import type { Action, ActionContext } from "../../../../core/actions/action.js"
import type { BotStatus } from "../../../../core/blackboard/team_blackboard.js"
import {
    TargetSelector,
    type EntityLike,
    type TargetSelectionOptions,
} from "../../target_selector.js"

export interface BasicAttackOptions extends TargetSelectionOptions {
    gData?: GData
    baseScore?: number
}

export class BasicAttackAction implements Action<any> {
    public readonly name = "BasicAttack"

    private readonly gData?: GData
    private readonly targetOptions: TargetSelectionOptions
    private readonly baseScore: number

    public constructor(options: BasicAttackOptions = {}) {
        this.gData = options.gData
        this.baseScore = options.baseScore ?? 45
        this.targetOptions = {
            allowedMonsters: options.allowedMonsters,
            avoidMonsters: options.avoidMonsters,
            maxDistance: options.maxDistance,
            prioritizeKillSpeed: options.prioritizeKillSpeed ?? true,
            protectParty: options.protectParty ?? true,
        }
    }

    public canExecute(bot: any, context: ActionContext): boolean {
        if (!bot || bot.rip) return false

        if (typeof bot.canUse === "function" && !bot.canUse("attack")) {
            return false
        }

        const best = this.findBestTarget(bot, context)
        if (!best) return false

        // Check if target is within attack range
        const botRange = bot.range ?? 40
        const dist = this.getDistance(bot, best)
        return dist <= botRange
    }

    public score(bot: any, context: ActionContext): number {
        const best = this.findBestTarget(bot, context)
        if (!best) return 0

        let score = this.baseScore

        // Target attacking party member increases attack priority
        if (best.target && best.target !== bot.name && best.target !== bot.id) {
            score += 15
        }

        // Low health execute bonus
        if (best.max_hp > 0 && best.hp / best.max_hp < 0.3) {
            score += 10
        }

        return Math.min(100, score)
    }

    public async execute(bot: any, context: ActionContext): Promise<boolean> {
        const best = this.findBestTarget(bot, context)
        if (!best || typeof bot.basicAttack !== "function") return false

        await bot.basicAttack(best.id)
        return true
    }

    public findBestTarget(bot: any, context: ActionContext): EntityLike | null {
        const gData = this.gData ?? bot.G
        if (!gData) return null

        const rawEntities: EntityLike[] = bot.entities
            ? Array.from(bot.entities.values())
            : []

        const partyStatuses = context.blackboard ? context.blackboard.getAllMembers() : []
        const party = partyStatuses.map((s: BotStatus) => ({
            name: s.name,
            type: s.type,
            hp: s.hp,
            maxHp: s.maxHp,
            x: s.x,
            y: s.y,
        }))

        const botActor = {
            name: bot.name ?? bot.id ?? "Unknown",
            type: bot.ctype ?? "warrior",
            x: bot.x ?? 0,
            y: bot.y ?? 0,
            range: bot.range ?? 40,
        }

        return TargetSelector.selectBestTarget(rawEntities, botActor, party, gData, this.targetOptions)
    }

    private getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
        const dx = (a.x ?? 0) - (b.x ?? 0)
        const dy = (a.y ?? 0) - (b.y ?? 0)
        return Math.hypot(dx, dy)
    }
}
