import AL, { Attribute, Character, ChestData, Game, ItemName, PingCompensatedCharacter, Tools } from "alclient"
import { LRUCache } from "lru-cache"
import { filterContexts, Loop, LoopName, Strategist, Strategy } from "../context.js"

export class BaseStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()
    private contexts: Strategist<Type>[]

    protected lootOnDrop: (data: ChestData) => void

    protected static recentlyLooted = new LRUCache<string, boolean>({ max: 10 })

    /**
     * A list of potions to use
     * TODO: Move this to a config option
     * */
    protected static potions: ItemName[] = ["hpot0", "mpot0", "hpot1", "mpot1"]

    public constructor(contexts?: Strategist<Type>[]) {
        this.contexts = contexts ?? []
        this.loops.set("heal", {
            fn: async (bot: Type) => {
                await this.heal(bot)
            },
            interval: ["use_hp"],
        })
        this.loops.set("loot", {
            fn: async (bot: Type) => {
                for (const [, chest] of bot.chests) {
                    await this.lootChest(bot, chest)
                }
            },
            interval: 250,
        })
    }

    public onApply(bot: Type) {
        this.lootOnDrop = (data: ChestData) => {
            this.lootChest(bot, data).catch(console.error)
        }
        bot.socket.on("drop", this.lootOnDrop)
    }

    public onRemove(bot: Type) {
        if (this.lootOnDrop) bot.socket.removeListener("drop", this.lootOnDrop)
    }

    private async heal(bot: Type) {
        if (bot.rip) return // Don't heal if dead

        const missingHP = bot.max_hp - bot.hp
        const missingMP = bot.max_mp - bot.mp

        if (missingHP == 0 && missingMP == 0) return // We have full HP and MP

        let maxGiveHp = Math.min(50, missingHP) // If we use `regen_hp` skill
        let maxGiveHpPotion: ItemName | "regen_hp" = "regen_hp"
        let maxGiveMp = Math.min(100, missingMP) // If we use `regen_mp` skill
        let maxGiveMpPotion: ItemName | "regen_mp" = "regen_mp"
        let maxGiveBoth = Math.max(maxGiveHp, maxGiveMp)
        let maxGiveBothPotion: ItemName

        const hpRatio = bot.hp / bot.max_hp
        const mpRatio = bot.mp / bot.max_mp

        if (bot.c.town || bot.c.fishing || bot.c.mining || bot.c.pickpocket) {
            // Channeled skills will stop chanelling if you use a potion
            if (hpRatio <= mpRatio) return bot.regenHP()
            else return bot.regenMP()
        }

        for (const potion of BaseStrategy.potions) {
            const gItem = Game.G.items[potion]
            if (!gItem.gives) continue // It's missing give information!?
            if (!bot.hasItem(potion)) continue // We don't have any
            let couldGiveHp = 0
            let couldGiveMp = 0
            for (const give of [
                ...gItem.gives,
                ...(((gItem[bot.map] as unknown as any).gives as [Attribute, number][]) ?? []), // Map bonuses
                ...(((gItem[bot.ctype] as unknown as any).gives as [Attribute, number][]) ?? []), // Character bonuses
            ]) {
                if (give[0] === "hp") couldGiveHp += Math.max(0, Math.min(give[1], missingHP))
                else if (give[0] === "mp") couldGiveMp += Math.max(0, Math.min(give[1], missingMP))
            }
            if (couldGiveHp > maxGiveHp) {
                maxGiveHp = couldGiveHp
                maxGiveHpPotion = potion
            }
            if (couldGiveMp > maxGiveMp) {
                maxGiveMp = couldGiveMp
                maxGiveMpPotion = potion
            }
            const couldGiveBoth = couldGiveHp + couldGiveMp
            if (couldGiveBoth > maxGiveBoth) {
                maxGiveBoth = couldGiveBoth
                maxGiveBothPotion = potion
            }
        }

        if (Math.abs(hpRatio - mpRatio) < 0.25) {
            // Our ratios are pretty similar, prefer both
            if (maxGiveBothPotion)
                return bot.usePotion(bot.locateItem(maxGiveBothPotion, bot.items, { returnLowestQuantity: true }))
        }

        if (hpRatio <= mpRatio) {
            // HP ratio is the same, or lower than the MP ratio, prefer HP
            if (maxGiveHpPotion === "regen_hp") return bot.regenHP()
            else return bot.usePotion(bot.locateItem(maxGiveHpPotion, bot.items, { returnLowestQuantity: true }))
        }

        // MP ratio is lower, prefer MP
        if (maxGiveMpPotion === "regen_mp") return bot.regenMP()
        else return bot.usePotion(bot.locateItem(maxGiveMpPotion, bot.items, { returnLowestQuantity: true }))
    }

    private async lootChest(bot: Type, chest: ChestData) {
        if (Tools.squaredDistance(chest, bot) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) return // It's far away from us
        if (BaseStrategy.recentlyLooted.has(chest.id)) return // One of our characters is already looting it

        let goldM = 0
        let best: Character
        for (const context of filterContexts(this.contexts, { serverData: bot.serverData })) {
            const friend = context.bot
            if (!context.bot.chests.has(chest.id)) continue // They don't have the chest in their drops
            if (Tools.squaredDistance(chest, friend) > AL.Constants.NPC_INTERACTION_DISTANCE_SQUARED) continue // It's far away from them
            if (friend.goldm > goldM) {
                goldM = friend.goldm
                best = friend
            }
        }

        if (best && best !== bot) return // We're not the best one to loot the chest

        // Open the chest
        BaseStrategy.recentlyLooted.set(chest.id, true)
        return bot.openChest(chest.id).catch(console.error)
    }
}
