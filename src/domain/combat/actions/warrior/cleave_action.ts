import type { Action, ActionContext } from "../../../../core/actions/action.js"

export interface CleaveActionOptions {
    /** Cleave radius (default: 160) */
    cleaveRadius?: number
    /** Minimum number of valid targets required to cleave (default: 2) */
    minTargets?: number
    /** Minimum MP required to cleave (default: 35) */
    minMp?: number
    /** Monsters to avoid hitting with cleave (e.g. world bosses or passive mobs) */
    avoidMonsters?: string[]
}

export class CleaveAction implements Action<any> {
    public readonly name = "WarriorCleave"

    private readonly cleaveRadius: number
    private readonly minTargets: number
    private readonly minMp: number
    private readonly avoidMonsters: string[]

    public constructor(options: CleaveActionOptions = {}) {
        this.cleaveRadius = options.cleaveRadius ?? 160
        this.minTargets = options.minTargets ?? 2
        this.minMp = options.minMp ?? 35
        this.avoidMonsters = options.avoidMonsters ?? ["franky", "icegolem", "dragold", "grinch"]
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "warrior") return false

        if (typeof bot.canUse === "function" && !bot.canUse("cleave")) {
            return false
        }

        if ((bot.mp ?? 0) < this.minMp) return false

        const count = this.getEligibleTargetCount(bot)
        return count >= this.minTargets
    }

    public score(bot: any, _context: ActionContext): number {
        const count = this.getEligibleTargetCount(bot)
        if (count < this.minTargets) return 0

        // 2 targets: 65, 3 targets: 78, 4+ targets: 88
        if (count >= 4) return 88
        if (count === 3) return 78
        return 65
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        if (typeof bot.cleave !== "function") return false
        await bot.cleave()
        return true
    }

    private getEligibleTargetCount(bot: any): number {
        if (!bot.entities || bot.entities.size === 0) return 0

        let eligibleCount = 0
        for (const [, entity] of bot.entities) {
            if (!entity) continue
            // Skip invulnerable enemies
            if (entity.immune || entity.s?.fullguard || entity.s?.fullguardx) continue
            // Skip avoided monsters
            if (this.avoidMonsters.includes(entity.type)) continue

            // Distance check
            const dx = (bot.x ?? 0) - (entity.x ?? 0)
            const dy = (bot.y ?? 0) - (entity.y ?? 0)
            if (Math.hypot(dx, dy) <= this.cleaveRadius) {
                eligibleCount++
            }
        }

        return eligibleCount
    }
}
