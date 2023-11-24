import AL, { ActionData, Character, HitData, Mage } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

// TODO: Add things to do if we will burn to death

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
        if (!bot.targets) return // Nothing attacking us
        if (bot.canUse("scare")) return // We could scare

        // If we could die due to attacks from incoming monsters
        let potentialIncomingDamage = 0
        let multiplier = bot.calculateTargets()
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

        // TODO: Should make a "blocked" function for ALClient
        if (bot.s.stoned || bot.s.deepfreezed) {
            // TODO: Should make a "force disconnect" function for ALClient
            console.info(`Force disconnecting ${bot.id} to avoid death (checkIncomingDamage)!`)
            for(let i = 0; i < 500; i++) {
                // @ts-ignore
                bot.socket.emit("cruise", 999)
            }
        } else {
            console.info(`Warping ${bot.id} to jail to avoid death (checkIncomingDamage)!`)
            await bot.warpToJail()
        }
    }
}
