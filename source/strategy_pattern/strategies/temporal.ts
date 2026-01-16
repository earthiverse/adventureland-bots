import { Character, IRespawn, MapName, RespawnModel, Tools } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { checkOnlyEveryMS } from "../../base/general.js"

export class TemporalSurgeStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public respawns = new Map<MapName, Required<IRespawn>[]>()

    public constructor() {
        this.loops.set("temporal", {
            fn: async (bot: Type) => {
                await this.temporalSurge(bot)
            },
            interval: ["temporalsurge"],
        })
    }

    private async temporalSurge(bot: Type) {
        if (!bot.canUse("temporalsurge")) return // Can't use

        if (checkOnlyEveryMS(bot.map, 10_000)) {
            // Get latest respawn information for the current map
            const respawns = await RespawnModel.find({
                map: bot.map,
                estimatedRespawn: {
                    $gt: Date.now(),
                },
                x: { $exists: true },
                y: { $exists: true },
            })
            this.respawns.set(bot.map, respawns as Required<IRespawn>[])
        }

        const respawns = this.respawns.get(bot.map)
        for (const respawn of respawns) {
            if (Tools.distance(bot, respawn) > 160) continue
            try {
                await bot.temporalSurge()

                // TODO: Figure out if there's a way to update the exact time (is probably the one whose time is closest to * 0.85 - 1)

                return
            } catch (e) {
                console.error(e)
            }
        }
    }
}
