import type { GData } from "alclient"
import type { Action, ActionContext } from "../../../../core/actions/action.js"
import { MonsterClassifier } from "../../monster_classifier.js"

export interface CBurstActionOptions {
    gData?: GData
    range?: number
    minMp?: number
    mpPerTarget?: number
    maxTargets?: number
}

export class CBurstAction implements Action<any> {
    public readonly name = "MageCBurst"

    private readonly gData?: GData
    private readonly range: number
    private readonly minMp: number
    private readonly mpPerTarget: number
    private readonly maxTargets: number

    public constructor(options: CBurstActionOptions = {}) {
        this.gData = options.gData
        this.range = options.range ?? 360
        this.minMp = options.minMp ?? 400
        this.mpPerTarget = options.mpPerTarget ?? 60
        this.maxTargets = options.maxTargets ?? 5
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "mage") return false

        if (typeof bot.canUse === "function" && !bot.canUse("cburst")) {
            return false
        }

        if ((bot.mp ?? 0) < this.minMp) return false

        const targets = this.findEligibleTargets(bot)
        return targets.length > 0
    }

    public score(bot: any, _context: ActionContext): number {
        const targets = this.findEligibleTargets(bot)
        if (targets.length === 0) return 0

        // Multi-target scaling: 75 for 2 targets, up to 90 for 5 targets
        if (targets.length >= 2) {
            return Math.min(90, 75 + (targets.length - 2) * 5)
        }

        return 65
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        const targets = this.findEligibleTargets(bot)
        if (targets.length === 0 || typeof bot.cburst !== "function") return false

        const cburstPayload: [string, number][] = targets.map((t) => [t.id, this.mpPerTarget])
        await bot.cburst(cburstPayload)
        return true
    }

    public findEligibleTargets(bot: any): Array<{ id: string; type: string }> {
        if (!bot.entities || bot.entities.size === 0) return []
        const gData = this.gData ?? bot.G
        if (!gData) return []

        const eligible: Array<{ id: string; type: string }> = []

        for (const [, entity] of bot.entities) {
            if (!entity) continue
            if (entity.immune || entity.s?.fullguard || entity.s?.fullguardx) continue

            // Distance check
            const dx = (bot.x ?? 0) - (entity.x ?? 0)
            const dy = (bot.y ?? 0) - (entity.y ?? 0)
            if (Math.hypot(dx, dy) > this.range) continue

            const profile = MonsterClassifier.classify(entity.type, gData, { isRanged: true })

            // CRITICAL: Avoid damaging monsters with reflect
            if (profile.hasReflect) continue

            // CRITICAL: Avoid pulling unprovoked cooperative monsters (prevents overwhelming pack aggro)
            if (profile.isCooperative && !entity.target) continue

            eligible.push({ id: entity.id, type: entity.type })
            if (eligible.length >= this.maxTargets) break
        }

        return eligible
    }
}
