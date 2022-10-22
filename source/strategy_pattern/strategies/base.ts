import { Character, ChestData, PingCompensatedCharacter, Tools } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"

export class BaseStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()
    private contexts: Strategist<Type>[]

    protected lootOnDrop: (data: ChestData) => void

    public constructor(contexts?: Strategist<Type>[]) {
        this.contexts = contexts ?? []
        this.loops.set("heal", {
            fn: async (bot: Type) => { await this.heal(bot) },
            interval: ["use_hp"]
        })
        this.loops.set("loot", {
            fn: async (bot: Type) => {
                for (const [, chest] of bot.chests) {
                    await this.lootChest(bot, chest)
                }
            },
            interval: 250
        })
    }

    public onApply(bot: Type) {
        this.lootOnDrop = async (data: ChestData) => {
            this.lootChest(bot, data).catch(console.error)
        }
        bot.socket.on("drop", this.lootOnDrop)
    }

    public onRemove(bot: Type) {
        if (this.lootOnDrop) bot.socket.removeListener("drop", this.lootOnDrop)
    }

    private async heal(bot: Type) {
        if (bot.rip) return

        const missingHP = bot.max_hp - bot.hp
        const missingMP = bot.max_mp - bot.mp
        const hpRatio = bot.hp / bot.max_hp
        const mpRatio = bot.mp / bot.max_mp
        const hpot1 = bot.locateItem("hpot1")
        const hpot0 = bot.locateItem("hpot0")
        const mpot1 = bot.locateItem("mpot1")
        const mpot0 = bot.locateItem("mpot0")
        if (hpRatio < mpRatio) {
            if (bot.c.town || bot.c.fishing || bot.c.mining) {
                await bot.regenHP()
            } else if (missingHP >= 400 && hpot1 !== undefined) {
                await bot.useHPPot(hpot1)
            } else if (missingHP >= 200 && hpot0 !== undefined) {
                await bot.useHPPot(hpot0)
            } else {
                await bot.regenHP()
            }
        } else if (mpRatio < hpRatio) {
            if (bot.c.town || bot.c.fishing || bot.c.mining) {
                await bot.regenMP()
            } else if (missingMP >= 500 && mpot1 !== undefined) {
                await bot.useMPPot(mpot1)
            } else if (missingMP >= 300 && mpot0 !== undefined) {
                await bot.useMPPot(mpot0)
            } else {
                await bot.regenMP()
            }
        } else if (hpRatio < 1) {
            if (bot.c.town || bot.c.fishing || bot.c.mining) {
                await bot.regenHP()
            } else if (missingHP >= 400 && hpot1 !== undefined) {
                await bot.useHPPot(hpot1)
            } else if (missingHP >= 200 && hpot0 !== undefined) {
                await bot.useHPPot(hpot0)
            } else {
                await bot.regenHP()
            }
        }
    }

    private async lootChest(bot: Type, chest: ChestData) {
        if (Tools.distance(chest, bot) > 800) return // It's far away from us

        let goldM = 0
        let best: Character
        for (const context of this.contexts) {
            if (!context.isReady()) continue // They're not ready
            const friend = context.bot
            if (friend.serverData.region !== bot.serverData.region || friend.serverData.name !== bot.serverData.name) continue // They're on a different server
            if (Tools.distance(chest, friend) > 800) continue // It's far away from them
            if (friend.goldm > goldM) {
                goldM = friend.goldm
                best = friend
            }
        }

        if (best && best !== bot) return // We're not the best one to loot the chest

        // Open the chest
        return bot.openChest(chest.id).catch(console.error)
    }
}
