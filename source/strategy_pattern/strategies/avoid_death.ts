import { ActionData, Character, HitData } from "alclient"
import { Strategy } from "../context.js"

// TODO: Add things to do if we will burn to death

export class AvoidDeathStrategy<Type extends Character> implements Strategy<Type> {
    // public loops = new Map<LoopName, Loop<Type>>()
    private onAction: (data: HitData) => Promise<void>

    public onApply(bot: Type) {
        this.onAction = async (data: ActionData) => {
            if (data.target !== bot.id) return // Not for us
            if (!bot.couldDieToProjectiles()) return // No chance of dying

            console.info(`Warping ${bot.id} to jail to avoid death!`)
            await bot.warpToJail()
        }

        bot.socket.on("action", this.onAction)
    }

    public onRemove(bot: Type) {
        if (this.onAction) bot.socket.removeListener("action", this.onAction)
    }
}