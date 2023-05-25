import AL, { ActionData, Character, HitData } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

// TODO: Add things to do if we will burn to death

export class AvoidDeathStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()
    private onAction: (data: HitData) => Promise<void>

    public constructor() {
        this.loops.set("avoid_death", {
            fn: async (bot: Type) => { await this.checkIncomingDamage(bot) },
            interval: 100
        })
    }

    public onApply(bot: Type) {
        this.onAction = async (data: ActionData) => {
            if (data.target !== bot.id) return // Not for us
            if (!bot.couldDieToProjectiles()) return // No chance of dying

            console.info(`Warping ${bot.id} to jail to avoid death (onAction)!`)
            await bot.warpToJail()
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
        multiplier['magical'] -= bot.mcourage
        multiplier['physical'] -= bot.courage
        multiplier['pure'] -= bot.pcourage
        for (const entity of bot.getEntities({ targetingMe: true })) {
            if (AL.Tools.distance(bot, entity) > entity.range + entity.speed) continue // Too far away to attack us
            let entityDamage = entity.calculateDamageRange(bot)[1]

            // Calculate additional mobbing damage
            if (multiplier[entity.damage_type] > 0) entityDamage *= (1 + (0.2 * multiplier[entity.damage_type]))

            potentialIncomingDamage += entityDamage
        }
        if (potentialIncomingDamage < bot.hp) return // Not in immediate danger

        console.info(`Warping ${bot.id} to jail to avoid death (checkIncomingDamage)!`)
        await bot.warpToJail()
    }
}