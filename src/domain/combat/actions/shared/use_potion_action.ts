import type { Action, ActionContext } from "../../../../core/actions/action.js"

export interface UsePotionOptions {
    emergencyHpRatio?: number
    hpThreshold?: number
    mpThreshold?: number
    hpPotions?: string[]
    mpPotions?: string[]
}

export class UsePotionAction implements Action<any> {
    public readonly name = "UsePotion"

    private readonly emergencyHpRatio: number
    private readonly hpThreshold: number
    private readonly mpThreshold: number
    private readonly hpPotions: string[]
    private readonly mpPotions: string[]

    public constructor(options: UsePotionOptions = {}) {
        this.emergencyHpRatio = options.emergencyHpRatio ?? 0.35
        this.hpThreshold = options.hpThreshold ?? 0.85
        this.mpThreshold = options.mpThreshold ?? 0.80
        this.hpPotions = options.hpPotions ?? ["hpot1", "hpot0"]
        this.mpPotions = options.mpPotions ?? ["mpot1", "mpot0"]
    }

    public canExecute(bot: any, _context: ActionContext): boolean {
        if (!bot || bot.rip) return false

        // Check if potion cooldown is ready
        if (typeof bot.canUse === "function") {
            const canUsePotion = bot.canUse("use_hp") || bot.canUse("regen_hp")
            if (!canUsePotion) return false
        }

        const hpRatio = bot.max_hp > 0 ? bot.hp / bot.max_hp : 1
        const mpRatio = bot.max_mp > 0 ? bot.mp / bot.max_mp : 1

        return hpRatio < this.hpThreshold || mpRatio < this.mpThreshold
    }

    public score(bot: any, _context: ActionContext): number {
        const hpRatio = bot.max_hp > 0 ? bot.hp / bot.max_hp : 1
        const mpRatio = bot.max_mp > 0 ? bot.mp / bot.max_mp : 1

        // Extreme emergency: life or death
        if (hpRatio <= this.emergencyHpRatio) {
            return Math.min(100, 95 + (1 - hpRatio) * 5)
        }

        let hpUrgency = 0
        if (hpRatio < this.hpThreshold) {
            hpUrgency = 40 + (1 - hpRatio) * 50
        }

        let mpUrgency = 0
        if (mpRatio < this.mpThreshold) {
            mpUrgency = 30 + (1 - mpRatio) * 45
        }

        return Math.min(100, Math.max(hpUrgency, mpUrgency))
    }

    public async execute(bot: any, context: ActionContext): Promise<boolean> {
        const hpRatio = bot.max_hp > 0 ? bot.hp / bot.max_hp : 1
        const mpRatio = bot.max_mp > 0 ? bot.mp / bot.max_mp : 1

        if (hpRatio <= 0.25 && context.eventBus) {
            context.eventBus.publish({
                type: "bot:health_critical",
                botName: bot.name ?? bot.id ?? "Unknown",
                hp: bot.hp,
                maxHp: bot.max_hp,
                map: bot.map ?? "main",
            })
        }

        // Prefer HP if HP ratio is equal or worse than MP ratio
        const preferHp = hpRatio <= mpRatio

        if (preferHp) {
            for (const pot of this.hpPotions) {
                const idx = this.findPotionSlot(bot, pot)
                if (idx !== -1 && typeof bot.usePotion === "function") {
                    await bot.usePotion(idx)
                    return true
                }
            }
            // Fallback to regen_hp skill if out of potions
            if (typeof bot.regenHP === "function") {
                await bot.regenHP()
                return true
            }
        } else {
            for (const pot of this.mpPotions) {
                const idx = this.findPotionSlot(bot, pot)
                if (idx !== -1 && typeof bot.usePotion === "function") {
                    await bot.usePotion(idx)
                    return true
                }
            }
            // Fallback to regen_mp skill if out of potions
            if (typeof bot.regenMP === "function") {
                await bot.regenMP()
                return true
            }
        }

        return false
    }

    private findPotionSlot(bot: any, name: string): number {
        if (typeof bot.locateItem === "function") {
            const pos = bot.locateItem(name)
            return pos >= 0 ? pos : -1
        }
        if (Array.isArray(bot.items)) {
            return bot.items.findIndex((i: any) => i && i.name === name)
        }
        return -1
    }
}
