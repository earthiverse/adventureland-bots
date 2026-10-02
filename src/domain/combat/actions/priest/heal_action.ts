import type { Action, ActionContext } from "../../../../core/actions/action.js"
import type { BotStatus } from "../../../../core/blackboard/team_blackboard.js"

export interface HealActionOptions {
    /** Maximum distance to heal a target (default: 260) */
    healRange?: number
    /** HP ratio threshold below which a target is eligible for heal (default: 0.90) */
    hpThreshold?: number
}

interface HealCandidate {
    id: string
    name: string
    hp: number
    maxHp: number
    hpRatio: number
    x: number
    y: number
}

export class HealAction implements Action<any> {
    public readonly name = "PriestHeal"

    private readonly healRange: number
    private readonly hpThreshold: number

    public constructor(options: HealActionOptions = {}) {
        this.healRange = options.healRange ?? 260
        this.hpThreshold = options.hpThreshold ?? 0.90
    }

    public canExecute(bot: any, context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "priest") return false

        if (typeof bot.canUse === "function" && !bot.canUse("heal")) {
            return false
        }

        const candidate = this.findBestCandidate(bot, context)
        return candidate !== null
    }

    public score(bot: any, context: ActionContext): number {
        const best = this.findBestCandidate(bot, context)
        if (!best) return 0

        // Critical rescue: highest score in system when party member is about to die
        if (best.hpRatio <= 0.30) {
            return Math.min(100, 95 + (1 - best.hpRatio) * 5)
        }

        // Substantial damage
        if (best.hpRatio <= 0.60) {
            return 80 + (0.60 - best.hpRatio) * 35
        }

        // Moderate damage
        return 50 + (this.hpThreshold - best.hpRatio) * 40
    }

    public async execute(bot: any, context: ActionContext): Promise<boolean> {
        const best = this.findBestCandidate(bot, context)
        if (!best || typeof bot.healSkill !== "function") return false

        await bot.healSkill(best.id)
        return true
    }

    public findBestCandidate(bot: any, context: ActionContext): HealCandidate | null {
        const candidates: HealCandidate[] = []

        // Self check
        const selfMaxHp = bot.max_hp ?? 1000
        const selfHp = bot.hp ?? selfMaxHp
        const selfRatio = selfHp / selfMaxHp
        if (selfRatio < this.hpThreshold) {
            candidates.push({
                id: bot.id ?? bot.name,
                name: bot.name ?? "Priest",
                hp: selfHp,
                maxHp: selfMaxHp,
                hpRatio: selfRatio,
                x: bot.x ?? 0,
                y: bot.y ?? 0,
            })
        }

        // Party members from blackboard
        if (context.blackboard) {
            const teamStatuses = context.blackboard.getAllMembers()
            for (const member of teamStatuses) {
                if (member.name === bot.name) continue
                const ratio = member.hp / member.maxHp
                if (ratio < this.hpThreshold && this.inRange(bot, member)) {
                    candidates.push({
                        id: member.name,
                        name: member.name,
                        hp: member.hp,
                        maxHp: member.maxHp,
                        hpRatio: ratio,
                        x: member.x,
                        y: member.y,
                    })
                }
            }
        }

        // Nearby players if visible
        if (bot.players) {
            for (const [, player] of bot.players) {
                if (!player || player.rip || player.name === bot.name) continue
                const isAlly = !bot.party || player.party === bot.party
                if (!isAlly) continue

                const pMaxHp = player.max_hp ?? 1000
                const pHp = player.hp ?? pMaxHp
                const pRatio = pHp / pMaxHp
                if (pRatio < this.hpThreshold && this.inRange(bot, player)) {
                    // Check if already in candidates
                    if (!candidates.some((c) => c.name === player.name)) {
                        candidates.push({
                            id: player.id ?? player.name,
                            name: player.name,
                            hp: pHp,
                            maxHp: pMaxHp,
                            hpRatio: pRatio,
                            x: player.x ?? 0,
                            y: player.y ?? 0,
                        })
                    }
                }
            }
        }

        if (candidates.length === 0) return null

        // Sort ascending by hpRatio (lowest health % healed first)
        candidates.sort((a, b) => a.hpRatio - b.hpRatio)
        return candidates[0]
    }

    private inRange(bot: any, target: { x: number; y: number }): boolean {
        const dx = (bot.x ?? 0) - (target.x ?? 0)
        const dy = (bot.y ?? 0) - (target.y ?? 0)
        return Math.hypot(dx, dy) <= this.healRange
    }
}
