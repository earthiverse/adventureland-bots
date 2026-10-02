import type { Action, ActionContext } from "../../../../core/actions/action.js"

export interface TauntActionOptions {
    /** Maximum distance to taunt (default: 200) */
    range?: number
    /** Squishy character types to prioritize peeling for */
    squishyClasses?: string[]
}

interface TauntTargetCandidate {
    entityId: string
    victimName: string
    isSquishy: boolean
    victimHpRatio: number
}

export class TauntAction implements Action<any> {
    public readonly name = "WarriorTaunt"

    private readonly range: number
    private readonly squishyClasses: string[]

    public constructor(options: TauntActionOptions = {}) {
        this.range = options.range ?? 200
        this.squishyClasses = options.squishyClasses ?? ["priest", "mage", "ranger"]
    }

    public canExecute(bot: any, context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "warrior") return false

        if (typeof bot.canUse === "function" && !bot.canUse("taunt")) {
            return false
        }

        const candidate = this.findBestTauntTarget(bot, context)
        return candidate !== null
    }

    public score(bot: any, context: ActionContext): number {
        const candidate = this.findBestTauntTarget(bot, context)
        if (!candidate) return 0

        // Squishy ally at low health: urgent emergency peel
        if (candidate.isSquishy && candidate.victimHpRatio <= 0.50) {
            return 96
        }

        // Squishy ally under attack
        if (candidate.isSquishy) {
            return 86
        }

        // Any ally at critical health
        if (candidate.victimHpRatio <= 0.50) {
            return 90
        }

        // Normal peel for party member
        return 75
    }

    public async execute(bot: any, context: ActionContext): Promise<boolean> {
        const candidate = this.findBestTauntTarget(bot, context)
        if (!candidate || typeof bot.taunt !== "function") return false

        await bot.taunt(candidate.entityId)
        return true
    }

    public findBestTauntTarget(bot: any, context: ActionContext): TauntTargetCandidate | null {
        if (!bot.entities || bot.entities.size === 0) return null

        const teamMap = new Map<string, { type: string; hpRatio: number }>()
        if (context.blackboard) {
            for (const status of context.blackboard.getAllMembers()) {
                teamMap.set(status.name, {
                    type: status.type,
                    hpRatio: status.hp / status.maxHp,
                })
            }
        }

        const candidates: TauntTargetCandidate[] = []

        for (const [, entity] of bot.entities) {
            if (!entity || !entity.target) continue
            // Skip if the monster is already targeting the warrior
            if (entity.target === bot.name || entity.target === bot.id) continue

            // Check if within range
            if (!this.inRange(bot, entity)) continue

            // Determine victim status
            let isSquishy = false
            let victimHpRatio = 1.0

            const teamMember = teamMap.get(entity.target)
            if (teamMember) {
                isSquishy = this.squishyClasses.includes(teamMember.type)
                victimHpRatio = teamMember.hpRatio
            } else if (bot.players && bot.players.has(entity.target)) {
                const player = bot.players.get(entity.target)
                if (player) {
                    isSquishy = this.squishyClasses.includes(player.ctype)
                    victimHpRatio = player.max_hp > 0 ? player.hp / player.max_hp : 1
                }
            } else {
                // Unknown target or not an ally
                continue
            }

            candidates.push({
                entityId: entity.id,
                victimName: entity.target,
                isSquishy,
                victimHpRatio,
            })
        }

        if (candidates.length === 0) return null

        // Sort: squishies first, then lowest victim HP ratio
        candidates.sort((a, b) => {
            if (a.isSquishy !== b.isSquishy) return a.isSquishy ? -1 : 1
            return a.victimHpRatio - b.victimHpRatio
        })

        return candidates[0]
    }

    private inRange(bot: any, target: { x?: number; y?: number }): boolean {
        const dx = (bot.x ?? 0) - (target.x ?? 0)
        const dy = (bot.y ?? 0) - (target.y ?? 0)
        return Math.hypot(dx, dy) <= this.range
    }
}
