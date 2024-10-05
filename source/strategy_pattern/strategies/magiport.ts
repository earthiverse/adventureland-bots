import AL, { CMData, Mage, PingCompensatedCharacter } from "alclient"
import { Loop, LoopName, Strategist, Strategy, filterContexts } from "../context.js"

export class MagiportOthersSmartMovingToUsStrategyOptions {
    delayMs: number
    range: number
}

export const DefaultMagiportOthersSmartMovingToUsStrategyOptions: MagiportOthersSmartMovingToUsStrategyOptions = {
    /** Don't magiport the same bot within this interval (in ms) */
    delayMs: 5000,
    /** Offer magiports to those smart moving within this range of us */
    range: 250,
}

export class MagiportOthersSmartMovingToUsStrategy implements Strategy<Mage> {
    public loops = new Map<LoopName, Loop<PingCompensatedCharacter>>()

    protected contexts: Strategist<PingCompensatedCharacter>[]
    protected options: MagiportOthersSmartMovingToUsStrategyOptions

    protected static recentlyMagiported = new Map<string, number>()

    public constructor(
        contexts: Strategist<PingCompensatedCharacter>[],
        options = DefaultMagiportOthersSmartMovingToUsStrategyOptions,
    ) {
        this.contexts = contexts
        this.options = options

        this.loops.set("magiport", {
            fn: async (bot: Mage) => {
                await this.magiport(bot)
            },
            interval: ["magiport"],
        })
    }

    protected async magiport(bot: Mage) {
        if (!bot.canUse("magiport")) return // We can't magiport anyone
        if (bot.map.startsWith("bank")) return // We can't magiport others to the bank
        if (bot.smartMoving) return // We're currently moving somewhere
        if (bot.getEntity({ type: "fieldgen0", withinRange: 400 })) return // They won't be able to magiport here

        for (const context of filterContexts(this.contexts, { serverData: bot.serverData })) {
            const friend = context.bot
            if (friend.id == bot.id) continue // It's us
            if (!friend.smartMoving) continue // They're not smart moving
            if (friend.map.startsWith("bank")) continue // Can't warp people from the bank
            if (AL.Pathfinder.canWalkPath(bot, friend)) continue // They can walk to us
            if (!AL.Pathfinder.canWalkPath(bot, friend.smartMoving)) continue // We can't walk to where they want to go
            if (AL.Tools.distance(friend, friend.smartMoving) < 2 * this.options.range) continue // They're fairly close
            if (AL.Tools.distance(bot, friend.smartMoving) > this.options.range) continue // They're not smart moving to a place near us

            const lastMagiport = MagiportOthersSmartMovingToUsStrategy.recentlyMagiported.get(friend.id)
            if (lastMagiport && lastMagiport + this.options.delayMs > Date.now()) continue // We recently magiported them

            // Offer the magiport
            try {
                await bot.magiport(friend.id)
                MagiportOthersSmartMovingToUsStrategy.recentlyMagiported.set(friend.id, Date.now())
                await friend.acceptMagiport(bot.id)
                await friend.stopSmartMove()
                await friend.stopWarpToTown()
            } catch (e) {
                console.error(e)
            }
        }
    }
}

export class MagiportServiceStrategyOptions {
    /** If set, we will only allow magiport requests from these characters */
    allowList?: string[]
}

export class MagiportServiceStrategy implements Strategy<Mage> {
    public loops = new Map<LoopName, Loop<PingCompensatedCharacter>>()

    protected options: MagiportServiceStrategyOptions

    protected inviteListener: (data: CMData) => Promise<unknown>

    public constructor(options: MagiportServiceStrategyOptions = {}) {
        this.options = options
    }

    public onApply(bot: Mage) {
        this.inviteListener = async (data: CMData) => {
            if (this.options.allowList && !this.options.allowList.includes(data.name)) return // Not in allow list
            if (!data.message.includes("magiport")) return // Different CM
            if (bot.players.get(data.name)) return // They're "nearby"
            if (!bot.canUse("magiport")) return // We can't use magiport (probably no MP)
            return bot.magiport(data.name)
        }

        bot.socket.on("cm", this.inviteListener)
    }

    public onRemove(bot: Mage) {
        if (this.inviteListener) bot.socket.removeListener("cm", this.inviteListener)
    }
}
