import AL, { MonsterName, PingCompensatedCharacter } from "alclient"
import { sleep } from "../../base/general.js"

export interface Single_Strategy<Type> {
    name: string
    attack(bot: Type): Promise<void>
    heal(bot: Type): Promise<void>
    loot(bot: Type): Promise<void>
    move(bot: Type): Promise<void>
}

export abstract class Single_BaseStrategy<Type extends PingCompensatedCharacter> implements Single_Strategy<Type> {
    public abstract attack(bot: Type): Promise<void>

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

    public abstract move(bot: Type): Promise<void>
    public name: string
}

export class Single_BasicAttackAndMoveStrategy<Type extends PingCompensatedCharacter> extends Single_BaseStrategy<Type> {
    public name = "basic_strategy"
    public types: MonsterName[]

    public constructor(types: MonsterName[]) {
        super()
        this.types = types
        this.name += ` (${types.join(", ")})`
    }

    async attack(bot: Type) {
        const nearest = bot.getEntity({ returnNearest: true, typeList: this.types })
        if (nearest && AL.Tools.distance(bot, nearest) < bot.range) {
            await bot.basicAttack(nearest.id)
        }
    }

    async move(bot: Type) {
        const nearest = bot.getEntity({ returnNearest: true, typeList: this.types })
        if (!nearest) {
            if (!bot.smartMoving) {
                bot.smartMove(this.types[0])
            }
        } else if (AL.Tools.distance(bot, nearest) > bot.range) {
            if (!bot.smartMoving && !bot.moving) {
                bot.smartMove(nearest, { getWithin: bot.range / 2 })
            }
        }
    }
}