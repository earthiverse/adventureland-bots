import type { GData } from "alclient"
import type { Action, ActionContext } from "../../../../core/actions/action.js"
import { MonsterClassifier } from "../../monster_classifier.js"

export interface HuntersMarkActionOptions {
    gData?: GData
    range?: number
    minMp?: number
    minHpToMark?: number
}

interface MarkCandidate {
    id: string
    type: string
    hp: number
    dangerRating: number
}

export class HuntersMarkAction implements Action<any> {
    public readonly name = "RangerHuntersMark"

    private readonly gData?: GData
    private readonly range: number
    private readonly minMp: number
    private readonly minHpToMark: number

    public constructor(options: HuntersMarkActionOptions = {}) {
        this.gData = options.gData
        this.range = options.range ?? 360
        this.minMp = options.minMp ?? 240
        this.minHpToMark = options.minHpToMark ?? 3000
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "ranger") return false

        if (typeof bot.canUse === "function" && !bot.canUse("huntersmark")) {
            return false
        }

        if ((bot.mp ?? 0) < this.minMp) return false

        const target = this.findBestTarget(bot)
        return target !== null
    }

    public score(bot: any, _context: ActionContext): number {
        const target = this.findBestTarget(bot)
        if (!target) return 0

        // Prioritize bosses and very dangerous targets
        if (target.dangerRating >= 40 || target.hp >= 50_000) {
            return 84
        }

        return 74
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        const target = this.findBestTarget(bot)
        if (!target || typeof bot.huntersMark !== "function") return false

        await bot.huntersMark(target.id)
        return true
    }

    public findBestTarget(bot: any): MarkCandidate | null {
        if (!bot.entities || bot.entities.size === 0) return null
        const gData = this.gData ?? bot.G
        if (!gData) return null

        const candidates: MarkCandidate[] = []

        for (const [, entity] of bot.entities) {
            if (!entity) continue
            // Skip already marked enemies
            if (entity.s?.marked) continue
            // Skip invulnerable enemies
            if (entity.immune || entity.s?.fullguard || entity.s?.fullguardx) continue

            // Distance check
            const dx = (bot.x ?? 0) - (entity.x ?? 0)
            const dy = (bot.y ?? 0) - (entity.y ?? 0)
            if (Math.hypot(dx, dy) > this.range) continue

            const profile = MonsterClassifier.classify(entity.type, gData, { isRanged: true })

            // Only mark enemies with sufficient HP or high danger rating
            if ((entity.hp ?? 0) < this.minHpToMark && profile.dangerRating < 35) {
                continue
            }

            candidates.push({
                id: entity.id,
                type: entity.type,
                hp: entity.hp ?? 0,
                dangerRating: profile.dangerRating,
            })
        }

        if (candidates.length === 0) return null

        // Sort by danger rating first, then HP
        candidates.sort((a, b) => {
            if (b.dangerRating !== a.dangerRating) return b.dangerRating - a.dangerRating
            return b.hp - a.hp
        })

        return candidates[0]
    }
}
