import TTLCache from "@isaacs/ttlcache"
import {
    Character,
    Database,
    EntityModel,
    IPosition,
    MapName,
    PingCompensatedCharacter,
    Rogue,
    ServerInfoDataLive,
} from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../context.js"
import { Setup } from "./base.js"

const CHECKED = new TTLCache<string, boolean>({ ttl: 120_000 })
const CHECKING = new TTLCache<string, boolean>({ ttl: 15_000 })
const getKey = (bot: PingCompensatedCharacter, pos: IPosition) =>
    `${bot.serverData.region}_${bot.serverData.name}_${pos.map}_${pos.x}_${pos.y}`

export class SlendermanAttackStrategy implements Strategy<Rogue> {
    public loops = new Map<LoopName, Loop<Character>>()

    public constructor() {
        this.loops.set("attack", {
            fn: async (bot: Rogue) => {
                await this.attack(bot)
            },
            interval: ["attack"],
        })
    }

    protected async attack(bot: Rogue) {
        if (!bot.canUse("attack")) return
        const slenderman = bot.getEntity({ type: "slenderman", withinRange: 0.001 })
        if (!slenderman) return
        const promises: Promise<unknown>[] = []
        promises.push(bot.basicAttack(slenderman.id))

        if (bot.canUse("quickpunch")) promises.push(bot.quickPunch(slenderman.id))
        if (bot.canUse("quickstab")) promises.push(bot.quickStab(slenderman.id))
        return Promise.allSettled(promises)
    }
}

export class SlendermanMoveStrategyOptions {
    /** If set, we will only look on this map */
    map?: MapName
}

export class SlendermanMoveStrategy implements Strategy<Rogue> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected options: SlendermanMoveStrategyOptions

    public constructor(options: SlendermanMoveStrategyOptions = {}) {
        this.options = options

        this.loops.set("move", {
            fn: async (bot: Rogue) => {
                await this.move(bot)
            },
            interval: 1000,
        })
    }

    protected async move(bot: Rogue) {
        if (!bot.S.slenderman) return // No slenderman
        if (!(bot.S.slenderman as ServerInfoDataLive).live) return // Not live

        // Go invisible to move
        if (!bot.s.invis) {
            if (!bot.canUse("invis")) return // Can't invis
            await bot.invis()
        }

        // Check local entities
        const slenderman = bot.getEntity({ type: "slenderman" })
        if (slenderman) {
            CHECKED.clear()
            CHECKING.clear()
            return bot.smartMove(slenderman)
        }

        // Check map
        // const map = (bot.S.slenderman as ServerInfoDataLive).map
        // if (this.options.map && map !== this.options.map) return // Different map

        // Check database
        if (Database.connection) {
            const dbSlenderman = await EntityModel.findOne(
                {
                    lastSeen: { $gt: Date.now() - 60_000 },
                    map: this.options.map,
                    serverIdentifier: bot.serverData.name,
                    serverRegion: bot.serverData.name,
                    type: "slenderman",
                    x: { $exists: true },
                    y: { $exists: true },
                },
                {
                    _id: 0,
                    map: 1,
                    in: 1,
                    x: 1,
                    y: 1,
                },
            )
                .lean()
                .exec()
            if (dbSlenderman) return bot.smartMove(dbSlenderman)
        }

        // Look for slenderman
        const points: IPosition[] = []
        switch (this.options.map) {
            case "cave":
                points.push({ map: "cave", x: 270, y: -425 })
                points.push({ map: "cave", x: 175, y: -1000 })
                points.push({ map: "cave", x: 1075, y: -250 })
                points.push({ map: "cave", x: 1450, y: -875 })
                break
            case "halloween":
                points.push({ map: "halloween", x: 800, y: -100 })
                points.push({ map: "halloween", x: -200, y: 600 })
                points.push({ map: "halloween", x: -50, y: -550 })
                points.push({ map: "halloween", x: 550, y: -1050 })
                points.push({ map: "halloween", x: -475, y: -1450 })
                break
            case "spookytown":
                points.push({ map: "spookytown", x: 300, y: 1000 })
                points.push({ map: "spookytown", x: -200, y: 600 })
                points.push({ map: "spookytown", x: 0, y: 0 })
                points.push({ map: "spookytown", x: 700, y: 0 })
                points.push({ map: "spookytown", x: -750, y: -275 })
                points.push({ map: "spookytown", x: 50, y: -1100 })
                break
        }

        for (const point of points) {
            const key = getKey(bot, point)
            if (CHECKED.has(key)) continue // Already checked recently
            if (CHECKING.has(key)) continue // Another bot is checking
            CHECKING.set(key, true)
            await bot.smartMove(point, {
                stopIfTrue: async () => !!bot.getEntity({ type: "slenderman" }),
            })
            const slenderman = bot.getEntity({ type: "slenderman" })
            if (slenderman) {
                CHECKED.clear()
                CHECKING.clear()
                return bot.smartMove(slenderman)
            } else {
                CHECKED.set(key, true)
            }
        }
    }
}

export function constructSlendermanSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "slenderman_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new SlendermanAttackStrategy(),
                        move: new SlendermanMoveStrategy(),
                    },
                ],
            },
        ],
    }
}
