import AL, { ActionData, Character, HitData, Mage } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export class AvoidDeathStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()
    private onAction: (data: HitData) => Promise<void>

    public constructor() {
        this.loops.set("avoid_death", {
            fn: async (bot: Type) => {
                await this.checkIncomingDamage(bot)
            },
            interval: 100,
        })
    }

    public onApply(bot: Type) {
        this.onAction = async (data: ActionData) => {
            if (bot.rip) return // We're already dead
            if (data.target !== bot.id) return // Not for us

            if (data.source === "multi_burn" && bot.ctype === "mage" && bot.canUse("blink")) {
                try {
                    console.info(`Blinking ${bot.id} to avoid multi_burn (onAction)!`)
                    await (bot as unknown as Mage).blink(bot.x, bot.y)
                    return
                } catch (e) {
                    console.error(e)
                }
            }
            if (!bot.couldDieToProjectiles()) return // No chance of dying

            console.info(`Warping ${bot.id} to jail to avoid death (onAction)!`)
            await bot.warpToJail().catch(console.error)
        }

        bot.socket.on("action", this.onAction)
    }

    public onRemove(bot: Type) {
        if (this.onAction) bot.socket.removeListener("action", this.onAction)
    }

    protected async checkIncomingDamage(bot: Type) {
        if (bot.rip) return // We're already dead

        if (bot.s.burned) {
            // Check if we're going to burn to death
            const numIntervals = Math.min(
                Math.floor(bot.s.burned.ms / AL.Game.G.conditions.burned.interval) - 1, // Number of intervals for burn
                Math.ceil((bot.ping * 6) / AL.Game.G.conditions.burned.interval) + 1, // We could receive healing
            )
            const burnDamage = numIntervals * (bot.s.burned.intensity / 5)
            if (burnDamage >= bot.hp) {
                console.info(`Harakiri-ing ${bot.id} to avoid burning to death (checkIncomingDamage)!`)
                bot.socket.emit("harakiri")
                return
            }
        }

        if (!bot.targets) return // Nothing attacking us

        // If we could die due to attacks from incoming monsters
        let potentialIncomingDamage = 0
        const multiplier = bot.calculateTargets()
        multiplier["magical"] -= bot.mcourage
        multiplier["physical"] -= bot.courage
        multiplier["pure"] -= bot.pcourage
        for (const entity of bot.getEntities({ targetingMe: true })) {
            if (AL.Tools.distance(bot, entity) > entity.range + entity.speed) continue // Too far away to attack us
            let entityDamage = entity.calculateDamageRange(bot)[1]

            // Calculate additional mobbing damage
            if (multiplier[entity.damage_type] > 0) entityDamage *= 1 + 0.2 * multiplier[entity.damage_type]

            potentialIncomingDamage += entityDamage
        }
        if (potentialIncomingDamage < bot.hp) return // Not in immediate danger

        // TODO: Is this the same as bot.isDisabled() on ALClient?
        if (bot.s.stoned || bot.s.deepfreezed || bot.s.stunned || bot.s.fingered) {
            console.info(`Harakiri-ing ${bot.id} (checkIncomingDamage)!`)
            bot.socket.emit("harakiri")
        } else {
            console.info(`Warping ${bot.id} to jail to avoid death (checkIncomingDamage)!`)
            await bot.warpToJail()
        }
    }
}
