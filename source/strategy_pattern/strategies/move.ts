import AL, { IPosition, MonsterName, PingCompensatedCharacter, Tools } from "alclient"
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

export class ImprovedMoveStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public name = "ImprovedMoveStrategy"
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
        const targets = bot.getEntities({ canDamage: true, couldGiveCredit: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false })
        targets.sort((a, b) => {
            const d_a = AL.Tools.distance(bot, a)
            const d_b = AL.Tools.distance(bot, b)
            return d_a - d_b
        })

        // Move to next monster
        let lastD = 0
        for (const target of targets) {
            const d = AL.Tools.distance(bot, target)
            if (d < bot.range) {
                lastD = d
                continue
            }

            if (lastD) {
                bot.smartMove(target, { getWithin: d - (bot.range - lastD) }).catch(() => { /** Suppress Error */ })
            } else {
                bot.smartMove(target, { getWithin: bot.range }).catch(() => { /** Suppress Error */ })
            }
            return
        }

        if (lastD) {
            // TODO: Move towards center of spawn
            const locations = bot.locateMonster(this.types[0])
            locations.sort((a, b) => {
                const d_a = AL.Tools.distance(bot, a)
                const d_b = AL.Tools.distance(bot, b)
                return d_a - d_b
            })
            bot.smartMove(locations[0], { getWithin: Tools.distance(bot, locations[0]) - (bot.range - lastD) }).catch(() => { /** Suppress Error */ })
        } else if (!bot.smartMoving) {
            // No targets nearby, move to spawn
            bot.smartMove(this.types[0]).catch(() => { /** Suppress Error */ })
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