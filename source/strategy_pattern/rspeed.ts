import AL, { ItemName, Rogue } from "alclient"
import { Strategist } from "./context.js"
import { BaseAttackStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { BuyStrategy } from "./strategies/buy.js"
import { ImprovedMoveStrategy } from "./strategies/move.js"
import { GiveRogueSpeedStrategy } from "./strategies/rspeed.js"
import { SellStrategy } from "./strategies/sell.js"
import { TrackerStrategy } from "./strategies/tracker.js"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const baseStrategy = new BaseStrategy()

    const rogue1 = await AL.Game.startRogue("attackRog", "US", "I")
    const context1 = new Strategist<Rogue>(rogue1, baseStrategy)
    startRspeedRogue(context1)

    const rogue2 = await AL.Game.startRogue("attackRog2", "US", "II")
    const context2 = new Strategist<Rogue>(rogue2, baseStrategy)
    startRspeedRogue(context2)

    const rogue3 = await AL.Game.startRogue("attackRog3", "US", "III")
    const context3 = new Strategist<Rogue>(rogue3, baseStrategy)
    startRspeedRogue(context3)
}
run()


async function startRspeedRogue(context: Strategist<Rogue>) {
    const moveStrategy = new ImprovedMoveStrategy(["bee"])
    const attackStrategy = new BaseAttackStrategy({ characters: [], typeList: ["bee"] })
    const trackerStrategy = new TrackerStrategy()
    const rspeedStrategy = new GiveRogueSpeedStrategy()
    const buyStrategy = new BuyStrategy({
        buyMap: undefined,
        replenishables: new Map<ItemName, number>([
            ["hpot1", 2500],
            ["mpot1", 2500]
        ])
    })
    const sellStrategy = new SellStrategy({
        sellMap: new Map<ItemName, [number, number][]>([
            ["beewings", undefined],
            ["cclaw", undefined],
            ["crabclaw", undefined],
            ["gslime", undefined],
            ["gstaff", undefined],
            ["hpamulet", undefined],
            ["hpbelt", undefined],
            ["ringsj", undefined],
            ["stinger", undefined],
            ["wcap", undefined],
            ["wshoes", undefined],
        ])
    })

    context.applyStrategy(moveStrategy)
    context.applyStrategy(attackStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(rspeedStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)

    setInterval(async () => {
        if (context.bot.smartMoving) return

        if (context.bot.canUse("rspeed")) {
            try { const noSpeedChars = await AL.PlayerModel.find({
                lastSeen: { $gt: Date.now() - 60_000 },
                "s.rspeed": undefined,
                serverIdentifier: context.bot.server.name, serverRegion: context.bot.server.region,
            }).lean().exec()

            if (noSpeedChars.length) {
                const player = noSpeedChars[0]
                console.log(`We would like to rspeed ${player.name}`)
                context.stopLoop("move")
                await context.bot.smartMove(player, { avoidTownWarps: true })
            }
            } catch (e) {
                console.error(e)
            }
        }

        // Do Base Strategy
        context.applyStrategy(moveStrategy)
    }, 1000)
}