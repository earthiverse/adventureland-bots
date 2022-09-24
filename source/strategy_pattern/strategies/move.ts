import AL, { IPosition, MonsterName, Pathfinder, Character, Tools, PingCompensatedCharacter } from "alclient"
import { offsetPositionParty } from "../../base/locations.js"
import { sortClosestDistance } from "../../base/sort.js"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"

export class BasicMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public types: MonsterName[]

    public constructor(type: MonsterName | MonsterName[]) {
        if (Array.isArray(type)) {
            this.types = type
        } else {
            this.types = [type]
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })
    }

    private async move(bot: Character) {
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willDieToProjectiles: false })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0]).catch(() => { /** Suppress Error */ })
            }
        } else if (AL.Tools.distance(bot, nearest) > bot.range) {
            bot.smartMove(nearest, { getWithin: Math.max(0, bot.range - nearest.speed), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        }
    }
}

export class FinishMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.turnInMonsterHunt(bot) },
            interval: 100
        })
    }

    private async turnInMonsterHunt(bot: Type) {
        if (!bot.s.monsterhunt) return // We already have a monster hunt
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
        await bot.finishMonsterHuntQuest()
    }
}

export class FollowFriendMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public friendContext: Strategist<PingCompensatedCharacter>

    /**
     * Follows another bot
     * @param friendContext The friend to follow
     */
    public constructor(friendContext: Strategist<PingCompensatedCharacter>) {
        this.friendContext = friendContext
        if (!friendContext) throw new Error("No friend specified")

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 1000
        })
    }

    private async move(bot: Character) {
        const friend = this.friendContext.bot
        if (!friend || !friend.ready) return // No friend!?

        return bot.smartMove(friend, { getWithin: 10 })
    }
}

export class GetHolidaySpirit<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.getHolidaySpirit(bot) },
            interval: 100
        })
    }

    private async getHolidaySpirit(bot: Type) {
        if (bot.s.holidayspirit) return // We already have holiday spirit
        await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
        await bot.getHolidaySpirit()
    }
}

export class GetMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.getMonsterHunt(bot) },
            interval: 100
        })
    }

    private async getMonsterHunt(bot: Type) {
        if (bot.s.monsterhunt) return // We already have a monster hunt
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 })
        await bot.getMonsterHuntQuest()
    }
}

export type HoldPositionMoveStrategyOptions = {
    /** If set, we will offset the given location by this amount */
    offset?: {
        x?: number
        y?: number
    }
}

export class HoldPositionMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public location: IPosition

    public constructor(location: IPosition, options?: HoldPositionMoveStrategyOptions) {
        this.location = { ...location }

        if (options?.offset) {
            console.log("before", this.location.map, this.location.x, this.location.y)
            if (options.offset.x) this.location.x += options.offset.x
            if (options.offset.y) this.location.y += options.offset.y
            console.log("after", this.location.map, this.location.x, this.location.y)
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 1000
        })
    }

    private async move(bot: Character) {
        console.log("location", bot.id, this.location.map, this.location.x, this.location.y)
        console.log(await bot.smartMove(this.location, { showConsole: true }))
        console.log("bot", bot.id, bot.map, bot.x, bot.y)
    }
}

export class ImprovedMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public types: MonsterName[]
    protected spawns: IPosition[]

    public constructor(type: MonsterName | MonsterName[]) {
        if (Array.isArray(type)) {
            this.types = type
        } else {
            this.types = [type]
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })

        this.spawns = []
        for (const type of this.types) this.spawns.push(...Pathfinder.locateMonster(type))
    }

    private async move(bot: Character) {
        const targets = bot.getEntities({ canDamage: true, couldGiveCredit: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false })
        targets.sort(sortClosestDistance(bot))

        // Move to next monster
        let lastD = 0
        for (const target of targets) {
            const d = AL.Tools.distance({ x: bot.x, y: bot.y }, { x: target.x, y: target.y })
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
            this.spawns.sort(sortClosestDistance(bot))
            bot.smartMove(offsetPositionParty(this.spawns[0], bot), { getWithin: Tools.distance(bot, this.spawns[0]) - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        } else if (!bot.smartMoving) {
            // No targets nearby, move to spawn
            this.spawns.sort(sortClosestDistance(bot))
            bot.smartMove(offsetPositionParty(this.spawns[0], bot), { resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        }
    }
}

export type MoveInCircleMoveStrategyOptions = {
    /** The center of the circle to walk */
    center: IPosition
    /** The radius of the circle to walk */
    radius: number
    /** The number of sides to make the circle */
    sides?: number
}

export class MoveInCircleMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: MoveInCircleMoveStrategyOptions

    public constructor(options: MoveInCircleMoveStrategyOptions) {
        if (options.sides === undefined){
            options.sides = 3
        } else if (options.sides !== undefined && options.sides < 3) {
            console.warn("[MoveInCircleMoveStrategy] # Sides must be a minimum of 3, setting to 3.")
            options.sides = 3
        }
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })
    }

    private move(bot: Character) {
        const angle = (2 * Math.PI) / this.options.sides
        const center = this.options.center
        const radius = this.options.radius
        if (AL.Pathfinder.canWalkPath(bot, center)) {
            const angleFromCenterToCurrent = Math.atan2(bot.y - center.y, bot.x - center.x)
            const endGoalAngle = angleFromCenterToCurrent + angle
            const endGoal = { x: center.x + radius * Math.cos(endGoalAngle), y: center.y + radius * Math.sin(endGoalAngle) }
            bot.move(endGoal.x, endGoal.y, { resolveOnStart: true }).catch(() => { /** Suppress errors */ })
        } else {
            // Move to where we can walk
            return bot.smartMove(center, { getWithin: radius })
        }

    }
}