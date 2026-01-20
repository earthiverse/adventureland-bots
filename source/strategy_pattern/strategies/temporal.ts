import { Character, IRespawn, MapName, RespawnModel, Tools } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { checkOnlyEveryMS, sleep } from "../../base/general.js"

/**
 * Temporal surge if there's a boss respawn nearby
 */
export class TemporalSurgeBossesStrategy<Type extends Character> implements Strategy<Type> {
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
        if (!bot.hasItem("orboftemporal") && bot.slots.orb?.name !== "orboftemporal") return // No orb
        if (!bot.canUse("temporalsurge", { ignoreEquipped: true })) return // Can't use
        // TODO: Skip if not on a map with spawns

        if (checkOnlyEveryMS(bot.map, 10_000)) {
            // Get latest respawn information for the current map
            const respawns = await RespawnModel.find({
                map: bot.map,
                estimatedRespawn: {
                    $gt: Date.now(),
                },
                type: {
                    // TODO: Move this to constructor as an option
                    $in: ["fvampire", "greenjr", "jr", "mvampire", "phoenix", "rharpy", "skeletor", "stompy"],
                },
                x: { $exists: true },
                y: { $exists: true },
            })
            this.respawns.set(bot.map, respawns as Required<IRespawn>[])
        }

        const respawns = this.respawns.get(bot.map) ?? []
        for (const respawn of respawns) {
            if (Tools.distance(bot, respawn) > 160) continue // Too far
            if (bot.getEntity({ type: respawn.type })) continue // Currently alive
            try {
                const slot = bot.slots.orb?.name === "orboftemporal" ? undefined : bot.locateItem("orboftemporal")
                if (slot !== undefined) {
                    await bot.equip(slot, "orb")
                    if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
                }
                await bot.temporalSurge()
                if (slot !== undefined) bot.equip(slot).catch(console.error)

                // TODO: Figure out if there's a way to update the exact time (is probably the one whose time is closest to * 0.85 - 1)

                return
            } catch (e) {
                console.error(e)
            }
        }
    }
}
