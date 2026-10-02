import type { Action, ActionContext } from "../../../../core/actions/action.js"

export interface LootChestsOptions {
    /** Maximum distance to loot a chest (default: 400) */
    maxDistance?: number
    /** Maximum chests to open in a single action execution (default: 5) */
    maxChestsPerTick?: number
}

export class LootChestsAction implements Action<any> {
    public readonly name = "LootChests"

    private readonly maxDistanceSq: number
    private readonly maxChestsPerTick: number

    public constructor(options: LootChestsOptions = {}) {
        const maxDist = options.maxDistance ?? 400
        this.maxDistanceSq = maxDist * maxDist
        this.maxChestsPerTick = options.maxChestsPerTick ?? 5
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false
        if (bot.esize !== undefined && bot.esize <= 0) return false
        if (!bot.chests || bot.chests.size === 0) return false

        // Check if there is at least one reachable chest
        for (const [, chest] of bot.chests) {
            if (this.isReachable(bot, chest)) {
                return true
            }
        }
        return false
    }

    public score(bot: any, _context: ActionContext): number {
        const hpRatio = bot.max_hp > 0 ? bot.hp / bot.max_hp : 1
        // Defer looting if critically injured to prioritize survival
        if (hpRatio < 0.35) return 10

        let reachableCount = 0
        for (const [, chest] of bot.chests) {
            if (this.isReachable(bot, chest)) {
                reachableCount++
            }
        }

        if (reachableCount === 0) return 0

        // Base 55 points + 4 points per additional chest, capped at 75
        return Math.min(75, 55 + (reachableCount - 1) * 4)
    }

    public async execute(bot: any, _context: ActionContext): Promise<boolean> {
        if (!bot.chests || typeof bot.openChest !== "function") return false

        const chestsToOpen: string[] = []
        for (const [id, chest] of bot.chests) {
            if (this.isReachable(bot, chest)) {
                chestsToOpen.push(id)
                if (chestsToOpen.length >= this.maxChestsPerTick) break
            }
        }

        if (chestsToOpen.length === 0) return false

        for (const chestId of chestsToOpen) {
            await bot.openChest(chestId)
        }

        return true
    }

    private isReachable(bot: any, chest: any): boolean {
        if (!chest || typeof chest.x !== "number" || typeof chest.y !== "number") return false
        const dx = (bot.x ?? 0) - chest.x
        const dy = (bot.y ?? 0) - chest.y
        return dx * dx + dy * dy <= this.maxDistanceSq
    }
}
