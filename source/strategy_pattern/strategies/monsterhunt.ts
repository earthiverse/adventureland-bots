import AL, { Character, ServerIdentifier, ServerRegion } from "alclient"
import { sleep } from "../../base/general.js"
import { Loop, LoopName, Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

export function canGetMonsterHunt(
    bot: Character,
    region?: ServerRegion,
    identifier?: ServerIdentifier,
): boolean {
    return (
        (region === undefined || bot.serverData.region === region) &&
        (identifier === undefined || bot.serverData.name === identifier) &&
        !bot.s.monsterhunt &&
        bot.map === bot.in
    )
}

export function canFinishMonsterHunt(bot: Character): boolean {
    if (!bot.s.monsterhunt || bot.s.monsterhunt.c > 0) return false
    const [region, id] = bot.s.monsterhunt.sn.split(" ")
    return region === bot.serverData.region && id === bot.serverData.name
}

export class GetMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => {
                await this.getMonsterHunt(bot)
            },
            interval: 100,
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => {
                await this.scare(bot)
            },
            interval: 50,
        })
    }

    private async getMonsterHunt(bot: Type) {
        if (bot.s.monsterhunt) return // We already have a monster hunt
        await bot
            .smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
            .catch(suppress_errors)
        await bot.smartMove("monsterhunter", {
            getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50,
            avoidTownWarps: true,
        })
        await bot.getMonsterHuntQuest()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export class FinishMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => {
                await this.turnInMonsterHunt(bot)
            },
            interval: 100,
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => {
                await this.scare(bot)
            },
            interval: 50,
        })
    }

    protected async turnInMonsterHunt(bot: Type) {
        if (!bot.s.monsterhunt) return // We already have a monster hunt
        await bot
            .smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
            .catch(suppress_errors)
        await bot.smartMove("monsterhunter", {
            getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50,
            avoidTownWarps: true,
        })
        await bot.finishMonsterHuntQuest()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}
