import type { GData } from "alclient"
import type { Action, ActionContext } from "../../../../core/actions/action.js"
import { MonsterClassifier } from "../../monster_classifier.js"

export interface SuperShotActionOptions {
    gData?: GData
    range?: number
    minMp?: number
}

interface SuperShotCandidate {
    id: string
    type: string
    hp: number
    dangerRating: number
    target?: string | null
}

export class SuperShotAction implements Action<any> {
    public readonly name = "RangerSuperShot"

    private readonly gData?: GData
    private readonly range: number
    private readonly minMp: number

    public constructor(options: SuperShotActionOptions = {}) {
        this.gData = options.gData
        this.range = options.range ?? 450
        this.minMp = options.minMp ?? 400
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "ranger") return false

        if (typeof bot.canUse === "function" && !bot.canUse("supershot")) {
            return false
        }

        if ((bot.mp ?? 0) < this.minMp) return false

        const target = this.findBestTarget(bot)
        return target !== null
    }

    public score(bot: any, _context: ActionContext): number {
        const target = this.findBestTarget(bot)
        if (!target) return 0

        // Prioritize enemies attacking allies
        if (target.target && target.target !== bot.name) {
            return 82
        }

        if (target.dangerRating >= 40) {
            return 78
        }

        return 70
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        const target = this.findBestTarget(bot)
        if (!target || typeof bot.superShot !== "function") return false

        await bot.superShot(target.id)
        return true
    }

    public findBestTarget(bot: any): SuperShotCandidate | null {
        if (!bot.entities || bot.entities.size === 0) return null
        const gData = this.gData ?? bot.G
        if (!gData) return null

        const candidates: SuperShotCandidate[] = []

        for (const [, entity] of bot.entities) {
            if (!entity) continue
            if (entity.immune || entity.s?.fullguard || entity.s?.fullguardx) continue

            // Distance check
            const dx = (bot.x ?? 0) - (entity.x ?? 0)
            const dy = (bot.y ?? 0) - (entity.y ?? 0)
            if (Math.hypot(dx, dy) > this.range) continue

            const profile = MonsterClassifier.classify(entity.type, gData, { isRanged: true })

            // CRITICAL: Avoid shooting monsters with reflect
            if (profile.hasReflect) continue

            candidates.push({
                id: entity.id,
                type: entity.type,
                hp: entity.hp ?? 0,
                dangerRating: profile.dangerRating,
                target: entity.target,
            })
        }

        if (candidates.length === 0) return null

        // Sort by danger rating and target urgency
        candidates.sort((a, b) => {
            const aAggroAlly = a.target && a.target !== bot.name ? 1 : 0
            const bAggroAlly = b.target && b.target !== bot.name ? 1 : 0
            if (bAggroAlly !== aAggroAlly) return bAggroAlly - aAggroAlly
            return b.dangerRating - a.dangerRating
        })

        return candidates[0]
    }
}
