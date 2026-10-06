import { Character, IRespawn, MapName, RespawnModel, Tools } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"
import { checkOnlyEveryMS, sleep } from "../../base/general.js"
import { isEquipmentLocked, lockEquipmentSlot, unlockEquipmentSlot } from "../lock.js"

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
        if (isEquipmentLocked(bot, "orb")) return // Orb is currently locked
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

            const isEquipped = bot.slots.orb?.name === "orboftemporal"
            const slot = isEquipped ? undefined : bot.locateItem("orboftemporal")
            if (!isEquipped && slot === undefined) continue

            lockEquipmentSlot(bot, "orb")
            try {
                if (slot !== undefined) {
                    await bot.equip(slot, "orb")
                    if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
                }
                await bot.temporalSurge()

                // TODO: Figure out if there's a way to update the exact time (is probably the one whose time is closest to * 0.85 - 1)

                return
            } catch (e) {
                console.error(e)
            } finally {
                unlockEquipmentSlot(bot, "orb")
            }
        }
    }
}
