import AL, { MonsterName, PingCompensatedCharacter } from "alclient"
import { Loop, Loops, Strategy } from "../context.js"

export class BasicAttackStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public name = "BasicAttackStrategy"
    public loops: Loops<Type> = new Map<string, Loop<Type>>()

    public types: MonsterName[]

    public constructor(type: MonsterName | MonsterName[]) {
        if (Array.isArray(type)) {
            this.types = type
            this.name += ` (${type.join(", ")})`
        } else {
            this.types = [type]
            this.name += ` (${type})`
        }

        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.attack(bot) },
            interval: ["attack"]
        })
    }

    private async attack(bot: Type) {
        if (!bot.canUse("attack")) return
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willDieToProjectiles: false })
        if (nearest && AL.Tools.distance(bot, nearest) < bot.range) {
            await bot.basicAttack(nearest.id)
        }
    }
}