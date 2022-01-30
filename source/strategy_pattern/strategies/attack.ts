import AL, { MonsterName, PingCompensatedCharacter } from "alclient"
import { Loop, Loops } from "../context.js"

export class BasicAttackAndMoveStrategy<Type extends PingCompensatedCharacter> {
    public name = "BasicAttackAndMoveStrategy"
    public loops: Loops<Type> = new Map<string, Loop<Type>>()

    public types: MonsterName[]

    public constructor(types: MonsterName[]) {
        this.types = types
        this.name += ` (${types.join(", ")})`

        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.attack(bot) },
            interval: ["attack"]
        })

        this.loops.set("move", {
            fn: async (bot: Type) => { await this.move(bot) },
            interval: 250
        })
    }

    async attack(bot: Type) {
        if (!bot.canUse("attack")) return
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willDieToProjectiles: false })
        if (nearest && AL.Tools.distance(bot, nearest) < bot.range) {
            await bot.basicAttack(nearest.id)
        }
    }

    async move(bot: Type) {
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willDieToProjectiles: false })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0]).catch(() => { /** Suppress Error */ })
            }
        } else if (AL.Tools.distance(bot, nearest) > bot.range) {
            bot.smartMove(nearest, { getWithin: bot.range / 2 }).catch(() => { /** Suppress Error */ })
        }
    }
}