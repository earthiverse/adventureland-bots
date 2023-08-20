import AL, { IPosition, MonsterName, Pathfinder, Character, PingCompensatedCharacter, Entity, ServerInfoDataLive, MapName, GMap, SmartMoveOptions, ItemName, Tools } from "alclient"
import { sleep } from "../../base/general.js"
import { offsetPositionParty } from "../../base/locations.js"
import { sortClosestDistance, sortClosestDistancePathfinder, sortSpreadOut, sortTypeThenClosest } from "../../base/sort.js"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"
import { suppress_errors } from "../logging.js"

export const AVOID_DOORS_COSTS = { blink: 999_999_999, enter: 999_999_999, town: 999_999_999, transport: 999_999_999 }

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
        const nearest = bot.getEntity({ couldGiveCredit: true, returnNearest: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0]).catch(() => { /** Suppress Error */ })
            }
        } else if (AL.Tools.distance({ x: bot.x, y: bot.y }, { x: nearest.x, y: nearest.y }) > bot.range) {
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

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    protected async turnInMonsterHunt(bot: Type) {
        if (!bot.s.monsterhunt) return // We already have a monster hunt
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 }).catch(suppress_errors)
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50, avoidTownWarps: true })
        await bot.finishMonsterHuntQuest()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
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

export class GetHolidaySpiritStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.getHolidaySpirit(bot) },
            interval: 100
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    private async getHolidaySpirit(bot: Type) {
        if (bot.s.holidayspirit) return // We already have holiday spirit
        await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 }).catch(suppress_errors)
        await bot.smartMove("newyear_tree", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2, avoidTownWarps: true })
        await bot.getHolidaySpirit()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export class GetMonsterHuntStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    public constructor() {
        this.loops.set("move", {
            fn: async (bot: Type) => { await this.getMonsterHunt(bot) },
            interval: 100
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    private async getMonsterHunt(bot: Type) {
        if (bot.s.monsterhunt) return // We already have a monster hunt
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50 }).catch(suppress_errors)
        await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 50, avoidTownWarps: true })
        await bot.getMonsterHuntQuest()
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
    }
}

export type GetReplenishablesStrategyOptions = {
    /** If set, we will check other contexts for extra replenishables */
    contexts?: Strategist<PingCompensatedCharacter>[]

    /** The replenishables we want to keep on ourself */
    replenishables: Map<ItemName, number>
}

/**
 * NOTE: This strategy depends on BuyStrategy also running with a superset of the same replenishables!
 */
export class GetReplenishablesStrategy<Type extends Character> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected options: GetReplenishablesStrategyOptions

    public constructor(options: GetReplenishablesStrategyOptions) {
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Type) => { await this.moveToReplenishable(bot) },
            interval: 50
        })

        // Scare if we need
        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.scare(bot) },
            interval: 50
        })
    }

    private async moveToReplenishable(bot: Type) {
        for (const [item, numHold] of this.options.replenishables) {
            const numHas = bot.countItem(item, bot.items)
            if (numHas > (numHold / 4)) continue // We have more than half of the amount we want
            const numWant = numHold - numHas
            if (!bot.canBuy(item, { ignoreLocation: true, quantity: numWant })) continue // We can't buy enough, don't go to buy them

            await bot.smartMove(item)
        }
    }

    protected async scare(bot: Type) {
        if (bot.targets == 0) return // No targets
        if (!(bot.hasItem("jacko") || bot.isEquipped("jacko"))) return // No jacko to scare
        if (!bot.isEquipped("jacko")) {
            await bot.equip(bot.locateItem("jacko"), "orb")
            if (bot.s.penalty_cd) await sleep(bot.s.penalty_cd.ms)
        }
        if (!bot.canUse("scare")) return // Can't use scare
        await bot.scare().catch(console.error)
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
            if (options.offset.x) this.location.x += options.offset.x
            if (options.offset.y) this.location.y += options.offset.y
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 1000
        })
    }

    private async move(bot: Character) {
        await bot.smartMove(this.location, { useBlink: true })
    }
}

export type ImprovedMoveStrategyOptions = {
    /** Where to wait if there are no monsters to move to */
    idlePosition?: IPosition

    /** If set, we will offset the given location by this amount */
    offset?: {
        x?: number
        y?: number
    }
}

export class ImprovedMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    public types: MonsterName[]
    protected spawns: IPosition[] = []
    protected options: ImprovedMoveStrategyOptions
    protected sort = new Map<string, (a: Entity, b: Entity) => number>()

    public constructor(type: MonsterName | MonsterName[], options?: ImprovedMoveStrategyOptions) {
        if (!options) options = {}
        this.options = options

        if (Array.isArray(type)) {
            this.types = type
        } else {
            this.types = [type]
        }

        this.loops.set("move", {
            fn: async (bot: Character) => { await this.move(bot) },
            interval: 250
        })

        if (options.idlePosition) {
            this.spawns.push({ ...options.idlePosition })
        } else {
            for (const type of this.types) {
                for (const spawn of Pathfinder.locateMonster(type)) {
                    this.spawns.push({ ...spawn })
                }
            }
        }

        if (this.options.offset) {
            for (const spawn of this.spawns) {
                if (this.options.offset.x) spawn.x += this.options.offset.x
                if (this.options.offset.y) spawn.y += this.options.offset.y
            }
        }
    }

    public onApply(bot: Character) {
        this.spawns.sort(sortClosestDistancePathfinder(bot))
        this.sort.set(bot.id, sortTypeThenClosest(bot, this.types))
    }

    private async move(bot: Character) {
        if (!AL.Pathfinder.canStand(bot) && bot.moving) return // We're cheating

        const targets = bot.getEntities({ canDamage: true, couldGiveCredit: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false })
        targets.sort(this.sort.get(bot.id))

        // Move for healing
        if (bot.hp < bot.max_hp * 0.50) {
            const priest = bot.getPlayer({ isDead: false, isPartyMember: true, ctype: "priest", returnNearest: true })
            if (priest && priest.range > Tools.distance(bot, priest)) {
                bot.smartMove(priest, { getWithin: priest.range - 25 }).catch(console.error)
                return
            }
        }

        // Move to next monster
        let lastD = 0
        for (const target of targets) {
            const d = AL.Tools.distance({ x: bot.x, y: bot.y }, { x: target.x, y: target.y })
            if (d < bot.range) {
                lastD = d
                continue
            }

            if (lastD) {
                bot.smartMove(target, { costs: AVOID_DOORS_COSTS, getWithin: d - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            } else {
                bot.smartMove(target, { costs: AVOID_DOORS_COSTS, resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            }
            return
        }

        if (bot.map !== this.spawns[0].map) {
            // Move to spawn
            await bot.smartMove(this.spawns[0], {
                avoidTownWarps: bot.targets > 0,
                resolveOnFinalMoveStart: true,
                useBlink: true,
                stopIfTrue: async () => {
                    if (bot.map !== this.spawns[0].map) return false
                    const entities = bot.getEntities({ canDamage: true, couldGiveCredit: true, typeList: this.types, willBurnToDeath: false, willDieToProjectiles: false, withinRange: "attack" })
                    return entities.length > 0
                }
            })
        } else if (lastD) {
            // Move towards center of closest spawn
            bot.smartMove(offsetPositionParty(this.spawns[0], bot), { costs: AVOID_DOORS_COSTS, getWithin: AL.Tools.distance({ x: bot.x, y: bot.y }, this.spawns[0]) - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        } else if (!bot.smartMoving) {
            // No targets nearby, move to spawn
            bot.smartMove(offsetPositionParty(this.spawns[0], bot), { resolveOnFinalMoveStart: true, useBlink: true }).catch(() => { /** Suppress Error */ })
        }
    }
}

export type SpreadOutImprovedMoveStrategyOptions = ImprovedMoveStrategyOptions & {
    /** Used to help spread out our characters */
    contexts?: Strategist<PingCompensatedCharacter>[]
}

export class SpreadOutImprovedMoveStrategy extends ImprovedMoveStrategy {
    protected options: SpreadOutImprovedMoveStrategyOptions

    public constructor(type: MonsterName | MonsterName[], options?: SpreadOutImprovedMoveStrategyOptions) {
        super(type, options)
    }

    public onApply(bot: Character) {
        this.spawns.sort(sortClosestDistancePathfinder(bot))
        this.sort.set(bot.id, sortSpreadOut(bot, this.types, this?.options?.contexts ?? []))
    }
}

export type KiteInCircleMoveStrategyOptions = {
    /** The center of the circle to walk */
    center: IPosition
    /** The radius of the circle to walk */
    radius: number
    /** Monster that we're kiting */
    type: MonsterName
}

export class KiteInCircleMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: KiteInCircleMoveStrategyOptions

    public constructor(options: KiteInCircleMoveStrategyOptions) {
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Character) => {
                if (bot.rip) return // Can't move if we're dead
                await this.move(bot)
            },
            interval: 250
        })
    }

    private async move(bot: Character) {
        const { center, radius, type } = this.options

        if (AL.Tools.distance(bot, center) > radius * 1.2) {
            // Get closer to the circle
            await bot.smartMove(center, { getWithin: radius })
        }

        const monster = bot.getEntity({ type: type, returnNearest: true })
        if (!monster) return // No monster

        const angleFromCenterToBot = Math.atan2(bot.y - center.y, bot.x - center.x)

        const cw = angleFromCenterToBot + (Math.PI / 6)
        const cwPoint = { x: center.x + (radius * Math.cos(cw)), y: center.y + (radius * Math.sin(cw)) }
        const distanceFromCwToMonster = AL.Tools.distance({ x: monster.x, y: monster.y }, cwPoint)
        const ccw = angleFromCenterToBot - (Math.PI / 6)
        const ccwPoint = { x: center.x + (radius * Math.cos(ccw)), y: center.y + (radius * Math.sin(ccw)) }
        const distanceFromCcwToMonster = AL.Tools.distance({ x: monster.x, y: monster.y }, ccwPoint)

        if (distanceFromCwToMonster > bot.range && distanceFromCcwToMonster > bot.range) {
            // We need to get closer, choose the closer point
            if (distanceFromCwToMonster > distanceFromCcwToMonster) {
                return bot.smartMove(ccwPoint, { resolveOnFinalMoveStart: true })
            } else {
                return bot.smartMove(cwPoint, { resolveOnFinalMoveStart: true })
            }
        } else {
            // We want to stay as far back as possible, choose the furthest point
            if (distanceFromCwToMonster <= distanceFromCcwToMonster) {
                return bot.smartMove(ccwPoint, { resolveOnFinalMoveStart: true })
            } else {
                return bot.smartMove(cwPoint, { resolveOnFinalMoveStart: true })
            }
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
    /** If true, we will move counter-clockwise instead */
    ccw?: true
}

export class MoveInCircleMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: MoveInCircleMoveStrategyOptions

    public constructor(options: MoveInCircleMoveStrategyOptions) {
        if (options.sides === undefined) {
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
            const endGoalAngle = angleFromCenterToCurrent + (this.options.ccw ? -angle : angle)
            const endGoal = { x: center.x + radius * Math.cos(endGoalAngle), y: center.y + radius * Math.sin(endGoalAngle) }
            bot.move(endGoal.x, endGoal.y, { resolveOnStart: true }).catch(() => { /** Suppress errors */ })
        } else {
            // Move to where we can walk
            return bot.smartMove(center, { getWithin: radius, useBlink: true })
        }
    }
}

export type SpecialMonsterMoveStrategyOptions = {
    /** If set, we will check other contexts for the monster we're looking for, too */
    contexts?: Strategist<PingCompensatedCharacter>[]
    /** If true, we won't use the database locations */
    disableCheckDB?: true
    /** If true, we will ignore moving if the monster is on one of these maps */
    ignoreMaps?: MapName[]
    /** The monsters we want to look for */
    typeList: MonsterName[]
}

export class SpecialMonsterMoveStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: SpecialMonsterMoveStrategyOptions

    protected spawns: IPosition[]

    public constructor(options: SpecialMonsterMoveStrategyOptions) {
        this.options = options
        if (!this.options.ignoreMaps) this.options.ignoreMaps = ["test"]

        this.spawns = Pathfinder.locateMonster(this.options.typeList)

        if (this.options.ignoreMaps.length) {
            // Remove all ignored maps
            this.spawns = this.spawns.filter(p => !this.options.ignoreMaps.includes(p.map))
        }

        this.loops.set("move", {
            fn: async (bot: Character) => {
                if (bot.rip) return // Can't move if we're dead
                await this.move(bot)
                await this.kiteToNPC(bot)
            },
            interval: 250
        })
    }

    protected returnUndefinedIfMapIgnored(position: { map: MapName; x: number; y: number }) {
        if (!this.options.ignoreMaps) return position
        if (this.options.ignoreMaps.includes(position.map)) return undefined
        return position
    }

    /**
     * This function checks "good" sources of data where the entity we're trying to find could be
     * @param bot
     */
    protected async checkGoodData(bot: Character, disableCheckDB = this.options.disableCheckDB): Promise<{ map: MapName; x: number; y: number }> {
        // Look for it nearby
        const target = bot.getEntity({ returnNearest: true, typeList: this.options.typeList })
        if (target) return this.returnUndefinedIfMapIgnored(target)

        if (this.options.contexts) {
            // Look for it around the other contexts
            for (const context of this.options.contexts) {
                if (!context.isReady()) continue
                if (bot == context.bot) continue // We've already looked for it around ourself
                const target = context.bot.getEntity({ returnNearest: true, typeList: this.options.typeList })
                if (target) return this.returnUndefinedIfMapIgnored(target)
            }
        }

        // Look for it in server data
        for (const type of this.options.typeList) {
            const sInfo = bot.S?.[type] as ServerInfoDataLive
            if (sInfo?.live && sInfo.map && sInfo.x !== undefined && sInfo.y !== undefined) return this.returnUndefinedIfMapIgnored(sInfo as { map: MapName; x: number; y: number })
        }

        if (!disableCheckDB) {
            // Look for it in our database
            const targets = await AL.EntityModel.find({
                lastSeen: { $gt: Date.now() - 60_000 },
                map: { $nin: this.options.ignoreMaps },
                serverIdentifier: bot.server.name,
                serverRegion: bot.server.region,
                type: { $in: this.options.typeList }
            }).sort({ lastSeen: -1 }).lean().exec()
            targets:
            for (const target of targets) {
                if (!target.map || target.x === undefined || target.y === undefined) continue

                if (this.options.contexts) {
                    // Check if one of our contexts should be able to see it
                    for (const context of this.options.contexts) {
                        if (!context.isReady()) continue
                        if (AL.Tools.distance(context.bot, target) < (AL.Constants.MAX_VISIBLE_RANGE / 2)) continue targets // We should be able to see it, the data is not valid
                    }
                }
                return target
            }
        }

        for (const type of this.options.typeList) {
            const sInfo = bot.S?.[type] as ServerInfoDataLive
            if (sInfo?.live && sInfo.map && bot.map !== sInfo.map) {
                // We're not on the right map but the default spawn is better than nothing
                const gInfo: GMap = AL.Game.G.maps[sInfo.map]
                return { map: sInfo.map, x: gInfo.spawns[0][0], y: gInfo.spawns[0][1] }
            }
        }

        const maps = new Set<MapName>(this.spawns.map(s => s.map))
        if (maps.size > 0 && !maps.has(bot.map)) {
            // Go to a map that has this monster
            const gInfo: GMap = AL.Game.G.maps[this.spawns[0].map]
            return { map: this.spawns[0].map, x: gInfo.spawns[0][0], y: gInfo.spawns[0][1] }
        }

        // Couldn't find a good data source for the monster
        return undefined
    }

    protected async move(bot: Character): Promise<IPosition> {
        const smartMoveOptions: SmartMoveOptions = {
            getWithin: bot.range - 10,
            stopIfTrue: async (): Promise<boolean> => {
                const target = await this.checkGoodData(bot, true)
                if (!target) return false // No target, keep looking
                return AL.Tools.distance(target, bot.smartMoving) > bot.range // It's moved far from where we're smart moving to
            },
            useBlink: true
        }

        const target = await this.checkGoodData(bot)
        // Go to the target if we have good data where it is
        if (target) {
            return AL.Tools.distance(bot, target) > bot.range ? bot.smartMove(target, smartMoveOptions) : undefined
        }

        // Look for if there's a spawn for it
        spawns:
        for (const spawn of this.spawns) {
            if (this.options.ignoreMaps && this.options.ignoreMaps.includes(spawn.map)) continue // Map is ignored
            if (this.options.contexts) {
                for (const context of this.options.contexts) {
                    if (context.bot == bot) continue // We've already checked ourselves
                    if (AL.Tools.distance(context.bot, spawn) < 400) continue spawns // Another bot is already there
                    if (!context.bot.smartMoving) continue
                    if (AL.Tools.distance(context.bot.smartMoving, spawn) < 100) continue spawns // Another bot is already checking there
                }
            }

            // Move to the next spawn
            try {
                await bot.smartMove(spawn, smartMoveOptions)
            } catch (e) {
                if (e.message.includes("new smartMove started")) return
                else console.error(e)
            }

            // If there's good data where it is, stop & smart move there
            const target = await this.checkGoodData(bot)
            if (target) return bot.smartMove(target, smartMoveOptions)
        }

        // Look through all spawns on the current map for it
        const gMap = bot.G.maps[bot.map] as GMap
        const spawns: IPosition[] = []
        for (const spawn of gMap.monsters) {
            // Add monster spawns
            const gMonster = bot.G.monsters[spawn.type]
            if (gMonster.aggro >= 100 || gMonster.rage >= 100) continue // Skip aggro spawns
            if (spawn.boundary) {
                spawns.push({ map: bot.map, x: (spawn.boundary[0] + spawn.boundary[2]) / 2, y: (spawn.boundary[1] + spawn.boundary[3]) / 2 })
            } else if (spawn.boundaries) {
                for (const boundary of spawn.boundaries) {
                    if (this.options.ignoreMaps && this.options.ignoreMaps.includes(boundary[0])) continue // Map is ignored
                    spawns.push({ map: boundary[0], x: (boundary[1] + boundary[3]) / 2, y: (boundary[2] + boundary[4]) / 2 })
                }
            }
        }

        for (const spawn of gMap.spawns) {
            // Add map spawns
            spawns.push({ map: bot.map, x: spawn[0], y: spawn[1] })
        }

        // Sort spawns
        spawns.sort((a, b) => a.x - b.x)

        spawns:
        for (const spawn of spawns) {
            if (this.options.contexts) {
                for (const context of this.options.contexts) {
                    if (context.bot == bot) continue // We've already checked ourselves
                    if (AL.Tools.distance(context.bot, spawn) < 400) continue spawns // Another bot is already there
                    if (!context.bot.smartMoving) continue
                    if (AL.Tools.distance(context.bot.smartMoving, spawn) < 100) continue spawns // Another bot is already checking there
                }
            }

            // Move to the next spawn
            try {
                await bot.smartMove(spawn, smartMoveOptions)
            } catch (e) {
                if (e.message.includes("new smartMove started")) return
                else console.error(e)
            }

            // If there's good data where it is, stop & smart move there
            const target = await this.checkGoodData(bot)
            if (target) return bot.smartMove(target, smartMoveOptions)
        }
    }

    protected async kiteToNPC(bot: Character) {
        const target = bot.getEntity({ typeList: this.options.typeList })
        if (!target) return // No target to kite to NPC

        const targets: IPosition[] = [target]

        if (bot.map === "main") {
            let kane = bot.players.get("$Kane")
            if (!kane && this.options.contexts) {
                for (const context of this.options.contexts) {
                    if (!context.isReady()) continue
                    if (context.bot == bot) continue // Already checked ourself
                    kane = context.bot.players.get("$Kane")
                    if (kane) break
                }
            }
            if (kane) targets.push(kane)
            let angel = bot.players.get("$Angel")
            if (!angel && this.options.contexts) {
                for (const context of this.options.contexts) {
                    if (!context.isReady()) continue
                    if (context.bot == bot) continue // Already checked ourself
                    angel = context.bot.players.get("$Angel")
                    if (angel) break
                }
            }
            if (angel) targets.push(angel)
        }

        if (targets.length == 1) return // No NPCS nearby
        targets.sort(sortClosestDistance(bot))

        // Move to next target
        let lastD = 0
        for (const target of targets) {
            if (!target) return
            const d = AL.Tools.distance({ x: bot.x, y: bot.y }, { x: target.x, y: target.y })
            if (d < bot.range) {
                lastD = d
                continue
            }

            if (lastD) {
                bot.smartMove(target, { costs: AVOID_DOORS_COSTS, getWithin: d - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            } else {
                bot.smartMove(target, { costs: AVOID_DOORS_COSTS, resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
            }
            return
        }

        if (lastD) {
            // Move towards center of an NPC
            bot.smartMove(offsetPositionParty(targets[1], bot), { costs: AVOID_DOORS_COSTS, getWithin: AL.Tools.distance({ x: bot.x, y: bot.y }, { x: targets[1].x, y: targets[1].y }) - (bot.range - lastD), resolveOnFinalMoveStart: true }).catch(() => { /** Suppress Error */ })
        }
    }
}

export class KiteMonsterMoveStrategy extends SpecialMonsterMoveStrategy {
    public constructor(options: SpecialMonsterMoveStrategyOptions) {
        super(options)

        this.loops.set("move", {
            fn: async (bot: Character) => {
                if (bot.rip) return // Can't move if we're dead
                await this.move(bot)
            },
            interval: 250
        })
    }

    protected async move(bot: Character): Promise<IPosition> {
        const entity = bot.getEntity({ ...this.options, returnNearest: true })
        if (!entity) return super.move(bot) // Go find an entity

        this.kite(bot, entity)
    }

    protected async kite(bot: Character, entity: Entity) {
        if (bot.in !== entity.in) {
            // We're on different maps
            if (!bot.smartMoving) bot.smartMove(entity, { getWithin: bot.range })
            return
        }

        // Look for the best position to kite to
        const angleFromEntityToBot = Math.atan2(bot.y - entity.y, bot.x - entity.x)
        const distance = Math.min(bot.range, (entity.charge ?? entity.speed ?? 0) + entity.range + 50)
        const NUM_ANGLES = 40
        for (let i = 1; i < NUM_ANGLES; i++) {
            const angle = angleFromEntityToBot + ((i % 2 ? 1 : -1) * ((Math.PI) * ((i - (i % 2)) / NUM_ANGLES)))
            const pos: IPosition = { map: bot.map, x: entity.x + (distance * Math.cos(angle)), y: entity.y + (distance * Math.sin(angle)) }
            if (!AL.Pathfinder.canStand(pos)) continue // Not a valid spot
            if (AL.Pathfinder.canWalkPath(bot, pos)) {
                if (bot.smartMoving) bot.stopSmartMove().catch(suppress_errors)
                bot.move(pos.x, pos.y, { resolveOnStart: true }).catch(suppress_errors)
            } else if (!bot.smartMoving) {
                bot.smartMove(pos, { avoidTownWarps: true, costs: { enter: 9999, transport: 9999 } }).catch(suppress_errors)
            }
            break
        }
    }
}