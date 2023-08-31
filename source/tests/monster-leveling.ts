import AL, { EntitiesData, MonsterName, PingCompensatedCharacter, Rogue } from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { sleep } from "../base/general.js"
import { RogueAttackStrategy } from "../strategy_pattern/strategies/attack_rogue.js"
import { ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"

const MONSTER: MonsterName = "snake"

export class ObserveLevelingStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    protected check: (data: EntitiesData) => void
    protected entityData = new Map<string, {
        level: number
        from: number
        max_hp: number
    }>()

    public constructor() {

        this.loops.set("tracker", {
            fn: async (bot: Type) => {
                await this.clearData(bot)
            },
            interval: 5_000
        })
    }

    public clearData(bot: Type) {
        for (const id of [...this.entityData.keys()]) {
            if (bot.entities.get(id)) continue // Still visible

            // Delete entities that are no longer visible
            this.entityData.delete(id)
        }
    }

    public onApply(bot: Type) {
        this.check = (data) => {
            for (const monster of data.monsters) {
                if (monster.target || monster.hp !== monster.max_hp) continue // It's been targeted
                if (monster.s.young && !this.entityData.has(monster.id)) {
                    // New monster to track
                    this.entityData.set(monster.id, {
                        level: monster.level ?? 1,
                        from: Date.now(),
                        max_hp: monster.max_hp ?? AL.Game.G.monsters[MONSTER].hp
                    })
                    continue
                }

                const entityData = this.entityData.get(monster.id)
                if (!entityData) {
                    this.entityData.set(monster.id, {
                        level: monster.level ?? 1,
                        from: undefined,
                        max_hp: monster.max_hp ?? AL.Game.G.monsters[MONSTER].hp,
                    })
                    continue
                }
                if (entityData.level == (monster.level ?? 1)) continue // Hasn't leveled

                // It leveled up!
                if (entityData.from) {
                    // We have the date when it began at this level
                    console.log(`${monster.id}\t${monster.type}\t${Date.now() - entityData.from}\t${entityData.level}\t${monster.level}\t${entityData.max_hp}\t${monster.max_hp}`)
                }
                entityData.level = monster.level
                entityData.from = Date.now()
                entityData.max_hp = monster.max_hp

            }
        }
        bot.socket.on("entities", this.check)
    }

    public onRemove(bot: Type) {
        if (this.check) bot.socket.off("entities", this.check)
    }
}

async function run() {
    console.log("Logging in, etc...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const context = new Strategist<Rogue>(await AL.Game.startRogue("earthiverse", "EU", "PVP"), new BaseStrategy())
    context.applyStrategy(new ObserveLevelingStrategy())
    const attackStrategy = new RogueAttackStrategy({ contexts: [], levelGreaterThan: 1, type: MONSTER })
    const moveStrategy = new ImprovedMoveStrategy(MONSTER)

    await context.bot.smartMove(MONSTER)

    context.applyStrategy(attackStrategy)
    context.applyStrategy(moveStrategy)

    // Destroy monsters until we see nothing over level 1
    console.debug(`Deleveling ${MONSTER}s...`)
    while (true) {
        if (!context.isReady()) {
            // Wait for context to reconnect
            await sleep(1000)
            continue
        }

        const entity = context.bot.getEntity({ levelGreaterThan: 1, type: MONSTER })
        if (entity) {
            await sleep(100)
            continue
        }

        if(context.bot.getCooldown("invis")) {
            await sleep(context.bot.getCooldown("invis"))
            continue
        }

        await sleep(2500)
        if (!context.bot.getEntity({ levelGreaterThan: 1, type: MONSTER })) {
            // They've all been deleveled, maybe?
            break
        }
    }
    
    console.debug(`Observing ${MONSTER}s...`)
    context.removeStrategy(attackStrategy)
    context.removeStrategy(moveStrategy)
    await context.bot.invis()
    await context.bot.smartMove(MONSTER)
}

run()