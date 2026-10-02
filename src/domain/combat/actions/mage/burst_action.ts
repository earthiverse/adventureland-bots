import type { GData } from "alclient"
import type { Action, ActionContext } from "../../../../core/actions/action.js"
import { MonsterClassifier } from "../../monster_classifier.js"

export interface BurstActionOptions {
    gData?: GData
    range?: number
    minMp?: number
    minHpToBurst?: number
}

interface BurstCandidate {
    id: string
    type: string
    dangerRating: number
    hp: number
    target?: string | null
}

export class BurstAction implements Action<any> {
    public readonly name = "MageBurst"

    private readonly gData?: GData
    private readonly range: number
    private readonly minMp: number
    private readonly minHpToBurst: number

    public constructor(options: BurstActionOptions = {}) {
        this.gData = options.gData
        this.range = options.range ?? 320
        this.minMp = options.minMp ?? 300
        this.minHpToBurst = options.minHpToBurst ?? 200
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "mage") return false

        if (typeof bot.canUse === "function" && !bot.canUse("burst")) {
            return false
        }

        if ((bot.mp ?? 0) < this.minMp) return false

        const candidate = this.findBestTarget(bot)
        return candidate !== null
    }

    public score(bot: any, _context: ActionContext): number {
        const candidate = this.findBestTarget(bot)
        if (!candidate) return 0

        // High danger enemies or threats actively attacking party
        if (candidate.target && candidate.target !== bot.name) {
            return 85
        }

        if (candidate.dangerRating >= 40) {
            return 80
        }

        return 72
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        const candidate = this.findBestTarget(bot)
        if (!candidate || typeof bot.burst !== "function") return false

        await bot.burst(candidate.id)
        return true
    }

    public findBestTarget(bot: any): BurstCandidate | null {
        if (!bot.entities || bot.entities.size === 0) return null
        const gData = this.gData ?? bot.G
        if (!gData) return null

        const candidates: BurstCandidate[] = []

        for (const [, entity] of bot.entities) {
            if (!entity || (entity.hp ?? 0) < this.minHpToBurst) continue
            if (entity.immune || entity.s?.fullguard || entity.s?.fullguardx) continue

            // Distance check
            const dx = (bot.x ?? 0) - (entity.x ?? 0)
            const dy = (bot.y ?? 0) - (entity.y ?? 0)
            if (Math.hypot(dx, dy) > this.range) continue

            // Tactical trait check via MonsterClassifier
            const profile = MonsterClassifier.classify(entity.type, gData, { isRanged: true })

            // CRITICAL: Avoid burst against monsters with reflect!
            if (profile.hasReflect) continue

            candidates.push({
                id: entity.id,
                type: entity.type,
                dangerRating: profile.dangerRating,
                hp: entity.hp,
                target: entity.target,
            })
        }

        if (candidates.length === 0) return null

        // Prioritize highest danger rating, then highest HP
        candidates.sort((a, b) => {
            if (b.dangerRating !== a.dangerRating) return b.dangerRating - a.dangerRating
            return b.hp - a.hp
        })

        return candidates[0]
    }
}
