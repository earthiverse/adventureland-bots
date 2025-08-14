import AL, { Character, MonsterName, Pathfinder, PingCompensatedCharacter, Rogue, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist } from "./strategy_pattern/context.js"
import { ItemStrategy } from "./strategy_pattern/strategies/item.js"
import { DEFAULT_ITEM_CONFIG } from "./base/itemsNew.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { DestroyStrategy } from "./strategy_pattern/strategies/destroy.js"
import { ImprovedMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { SellStrategy } from "./strategy_pattern/strategies/sell.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death.js"
import { TrackUpgradeStrategy } from "./strategy_pattern/strategies/statistics.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { RogueAttackStrategy } from "./strategy_pattern/strategies/attack_rogue.js"
import { GiveRogueSpeedStrategy } from "./strategy_pattern/strategies/rspeed.js"
import { RETURN_HIGHEST } from "./strategy_pattern/setups/equipment.js"
import { halloweenGreenJr } from "./base/locations.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

const PARTY_LEADER = "CrownsAnal"
const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "III"

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const BASE_STRATEGY = new BaseStrategy()
const ITEM_STRATEGY = new ItemStrategy({
    contexts: CONTEXTS,
    itemConfig: DEFAULT_ITEM_CONFIG,
    transferItemsTo: "earthMer",
})
const BUY_STRATEGY = new BuyStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const SELL_STRATEGY = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const RESPAWN_STRATEGY = new RespawnStrategy()
const TRACKER_STRATEGY = new TrackerStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const HOME_STRATEGY = new HomeServerStrategy(SERVER_REGION, SERVER_ID)
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const TRACK_UPGRADES_STRATEGY = new TrackUpgradeStrategy()
const PARTY_ACCEPT_STRATEGY = new AcceptPartyRequestStrategy()
const PARTY_MEMBER_STRATEGY = new RequestPartyStrategy(PARTY_LEADER)
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const ROGUE_SPEED_STRATEGY = new GiveRogueSpeedStrategy()
const MONSTER_PRIORITY: MonsterName[] = ["goldenbot", "sparkbot", "targetron", "greenjr", "osnake", "snake"]
const ATTACK_STRATEGIES: { [T in string]: RogueAttackStrategy } = {
    earthRog: new RogueAttackStrategy({
        contexts: CONTEXTS,
        generateEnsureEquipped: {
            attributes: ["xp"],
            prefer: {
                mainhand: { name: "cclaw", filters: RETURN_HIGHEST },
                offhand: { name: "cclaw", filters: RETURN_HIGHEST },
            },
        },
        typeList: MONSTER_PRIORITY,
    }),
}

class CrownMoveStrategy extends ImprovedMoveStrategy {
    protected move(bot: Character): Promise<void> {
        if (bot.party !== PARTY_LEADER) {
            // Not in party -- wait
            this.types = ["greenjr", "osnake", "snake"]
            this.spawns = [halloweenGreenJr]
        } else {
            this.types = ["goldenbot", "sparkbot", "targetron"]
            this.spawns = Pathfinder.locateMonster(this.types)
        }

        return super.move(bot)
    }
}

const MOVE_STRATEGY_SCORPION = new CrownMoveStrategy(MONSTER_PRIORITY)

async function start(serverRegion: ServerRegion, serverIdentifier: ServerIdentifier) {
    for (const rogueName of ["earthRog"]) {
        const rogue = await AL.Game.startRogue(rogueName, serverRegion, serverIdentifier)
        const context = new Strategist<Rogue>(rogue, BASE_STRATEGY)
        CONTEXTS.push(context)
        context.applyStrategy(ATTACK_STRATEGIES[rogueName])
        context.applyStrategy(MOVE_STRATEGY_SCORPION)
        context.applyStrategy(PARTY_ACCEPT_STRATEGY)
        context.applyStrategy(ROGUE_SPEED_STRATEGY)
        if (rogueName !== PARTY_LEADER) context.applyStrategy(PARTY_MEMBER_STRATEGY)
    }

    for (const context of CONTEXTS) {
        context.applyStrategy(AVOID_DEATH_STRATEGY)
        context.applyStrategy(ITEM_STRATEGY)
        context.applyStrategy(BUY_STRATEGY)
        context.applyStrategy(SELL_STRATEGY)
        context.applyStrategy(RESPAWN_STRATEGY)
        context.applyStrategy(TRACKER_STRATEGY)
        context.applyStrategy(DESTROY_STRATEGY)
        context.applyStrategy(TRACK_UPGRADES_STRATEGY)
        context.applyStrategy(HOME_STRATEGY)

        if (context.bot.ctype !== "merchant") {
            context.applyStrategy(ELIXIR_STRATEGY)
        }
    }
}
void start(SERVER_REGION, SERVER_ID)
