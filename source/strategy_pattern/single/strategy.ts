import AL, { MonsterName, PingCompensatedCharacter } from "alclient"
import { sleep } from "../../base/general.js"
import { Loop, Loops, SingleCharStrategy } from "./context.js"

export abstract class Single_BaseStrategy<Type extends PingCompensatedCharacter> implements SingleCharStrategy<Type> {
    public name: string
    public loops: Loops<Type>

    public constructor() {
        this.name = "BaseStrategy"
        this.loops = new Map<string, Loop<Type>>()

        this.loops.set("heal", {
            fn: async (bot: Type) => { await this.heal(bot) },
            interval: 250
        })
        this.loops.set("loot", {
            fn: async (bot: Type) => { await this.loot(bot) },
            interval: 250
        })
    }

    async heal(bot: Type) {
        if (bot.rip) return

        const missingHP = bot.max_hp - bot.hp
        const missingMP = bot.max_mp - bot.mp
        const hpRatio = bot.hp / bot.max_hp
        const mpRatio = bot.mp / bot.max_mp
        const hpot1 = bot.locateItem("hpot1")
        const hpot0 = bot.locateItem("hpot0")
        const mpot1 = bot.locateItem("mpot1")
        const mpot0 = bot.locateItem("mpot0")
        if (hpRatio < mpRatio) {
            if (bot.c.town || bot.s.fishing) {
                await bot.regenHP()
            } else if (missingHP >= 400 && hpot1 !== undefined) {
                await bot.useHPPot(hpot1)
            } else if (missingHP >= 200 && hpot0 !== undefined) {
                await bot.useHPPot(hpot0)
            } else {
                await bot.regenHP()
            }
        } else if (mpRatio < hpRatio) {
            if (bot.c.town || bot.s.fishing) {
                await bot.regenHP()
            } else if (missingMP >= 500 && mpot1 !== undefined) {
                await bot.useMPPot(mpot1)
            } else if (missingMP >= 300 && mpot0 !== undefined) {
                await bot.useMPPot(mpot0)
            } else {
                await bot.regenMP()
            }
        } else if (hpRatio < 1) {
            if (bot.c.town || bot.s.fishing) {
                await bot.regenHP()
            } else if (missingHP >= 400 && hpot1 !== undefined) {
                await bot.useHPPot(hpot1)
            } else if (missingHP >= 200 && hpot0 !== undefined) {
                await bot.useHPPot(hpot0)
            } else {
                await bot.regenHP()
            }
        }
    }

    async loot(bot: Type) {
        const [chest] = bot.chests
        if (chest) await bot.openChest(chest[0])
        else return sleep(100)
    }
}

export class Single_BasicAttackAndMoveStrategy<Type extends PingCompensatedCharacter> extends Single_BaseStrategy<Type> {
    public name = "BasicAttackAndMoveStrategy"
    public types: MonsterName[]

    public constructor(types: MonsterName[]) {
        super()

        this.types = types
        console.log(`debug (constructor): this.types is ${this.types}`)
        this.name += ` (${types.join(", ")})`
        console.log(`debug (constructor): this.name is ${this.name}`)

        this.loops.set("attack", {
            fn: async (bot: Type) => { await this.attack(bot) },
            interval: 100
        })

        this.loops.set("move", {
            fn: async (bot: Type) => { await this.move(bot) },
            interval: 250
        })
    }

    async attack(bot: Type) {
        if (!bot.canUse("attack")) return
        const nearest = bot.getEntity({ returnNearest: true, typeList: this.types })
        if (nearest && AL.Tools.distance(bot, nearest) < bot.range) {
            await bot.basicAttack(nearest.id)
        }
    }

    async move(bot: Type) {
        if (bot.rip) {
            await bot.respawn()
            return
        }

        const nearest = bot.getEntity({ returnNearest: true, typeList: this.types })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0])
            }
        } else if (AL.Tools.distance(bot, nearest) > bot.range) {
            bot.smartMove(nearest, { getWithin: bot.range / 2 })
        }
    }
}