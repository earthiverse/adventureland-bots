import type { Action, ActionContext } from "../../../../core/actions/action.js"

export interface PartyHealActionOptions {
    /** Minimum MP required to trigger party heal (default: 400) */
    minMp?: number
    /** HP ratio threshold below which a member counts as damaged (default: 0.80) */
    damagedThreshold?: number
    /** Minimum damaged members required to trigger (default: 2) */
    minDamagedMembers?: number
}

export class PartyHealAction implements Action<any> {
    public readonly name = "PriestPartyHeal"

    private readonly minMp: number
    private readonly damagedThreshold: number
    private readonly minDamagedMembers: number

    public constructor(options: PartyHealActionOptions = {}) {
        this.minMp = options.minMp ?? 400
        this.damagedThreshold = options.damagedThreshold ?? 0.80
        this.minDamagedMembers = options.minDamagedMembers ?? 2
    }

    public canExecute(bot: any, context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.ctype !== "priest") return false

        if (typeof bot.canUse === "function" && !bot.canUse("partyheal")) {
            return false
        }

        if ((bot.mp ?? 0) < this.minMp) return false

        const damagedCount = this.getDamagedMemberCount(bot, context)
        return damagedCount >= this.minDamagedMembers
    }

    public score(bot: any, context: ActionContext): number {
        const members = this.getPartyMembers(bot, context)
        const damaged = members.filter((m) => m.hpRatio < this.damagedThreshold)

        if (damaged.length < this.minDamagedMembers) return 0

        // If multiple members are critically injured (< 40%)
        const criticalCount = damaged.filter((m) => m.hpRatio <= 0.40).length
        if (criticalCount >= 2) {
            return 98
        }

        // 3+ damaged members
        if (damaged.length >= 3) {
            return 92
        }

        // 2 damaged members
        return 82
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        if (typeof bot.partyHeal !== "function") return false
        await bot.partyHeal()
        return true
    }

    private getDamagedMemberCount(bot: any, context: ActionContext): number {
        const members = this.getPartyMembers(bot, context)
        return members.filter((m) => m.hpRatio < this.damagedThreshold).length
    }

    private getPartyMembers(bot: any, context: ActionContext): Array<{ name: string; hpRatio: number }> {
        const members: Array<{ name: string; hpRatio: number }> = []

        // Self
        const selfMaxHp = bot.max_hp ?? 1000
        const selfHp = bot.hp ?? selfMaxHp
        members.push({
            name: bot.name ?? "Priest",
            hpRatio: selfHp / selfMaxHp,
        })

        // Blackboard team statuses
        if (context.blackboard) {
            const teamStatuses = context.blackboard.getAllMembers()
            for (const status of teamStatuses) {
                if (status.name === bot.name) continue
                members.push({
                    name: status.name,
                    hpRatio: status.hp / status.maxHp,
                })
            }
        }

        return members
    }
}
