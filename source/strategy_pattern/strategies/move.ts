import AL, { IPosition, MonsterName, PingCompensatedCharacter } from "alclient"
import { Loop, Loops, Strategy } from "../context.js"

export class BasicMoveStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public name = "BasicMoveStrategy"
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

        this.loops.set("move", {
            fn: async (bot: Type) => { await this.move(bot) },
            interval: 250
        })
    }

    private async move(bot: Type) {
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willDieToProjectiles: false })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0]).catch(() => { /** Suppress Error */ })
            }
        } else if (AL.Tools.distance(bot, nearest) > bot.range) {
            bot.smartMove(nearest, { getWithin: Math.max(0, bot.range - nearest.speed) }).catch(() => { /** Suppress Error */ })
        }
    }
}

export class HoldPositionMoveStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public name = "HoldPositionMoveStrategy"
    public loops: Loops<Type> = new Map<string, Loop<Type>>()

    public location: IPosition

    public constructor(location: IPosition) {
        this.location = location

        this.loops.set("move", {
            fn: async (bot: Type) => { await this.move(bot) },
            interval: 1000
        })
    }

    private async move(bot: Type) {
        await bot.smartMove(this.location)
    }
}