import AL, { IPosition, MonsterName, PingCompensatedCharacter, Tools } from "alclient"
import { offsetPositionParty } from "../../base/locations.js"
import { sortClosestDistance } from "../../base/sort.js"
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
        targets.sort(sortClosestDistance(bot))

        // Move to next monster
        let lastD = 0
        for (const target of targets) {
            const d = AL.Tools.distance(bot, target)
            if (d < bot.range) {
                lastD = d
                continue
            }

            if (lastD) {
                bot.smartMove(target, { getWithin: d - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            } else {
                bot.smartMove(target, { resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            }
            return
        }

        if (lastD) {
            // Move towards center of closest spawn
            const locations: IPosition[] = []
            for (const type of this.types) locations.push(...bot.locateMonster(type))
            locations.sort(sortClosestDistance(bot))
            bot.smartMove(offsetPositionParty(locations[0], bot), { getWithin: Tools.distance(bot, locations[0]) - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        } else if (!bot.smartMoving) {
            // No targets nearby, move to spawn
            const locations: IPosition[] = []
            for (const type of this.types) locations.push(...bot.locateMonster(type))
            locations.sort(sortClosestDistance(bot))
            bot.smartMove(offsetPositionParty(locations[0], bot), { resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
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