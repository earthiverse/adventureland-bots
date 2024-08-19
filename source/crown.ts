import AL, { Merchant, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion, Warrior } from "alclient"
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
import { NewMerchantStrategy, defaultNewMerchantStrategyOptions } from "./merchant/strategy.js"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death.js"
import { ToggleStandStrategy } from "./strategy_pattern/strategies/stand.js"
import { TrackUpgradeStrategy } from "./strategy_pattern/strategies/statistics.js"
import { WarriorAttackStrategy } from "./strategy_pattern/strategies/attack_warrior.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge.js"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server.js"
import { RETURN_HIGHEST } from "./strategy_pattern/setups/equipment.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

// We're using pumpkinspice for the elixir in this script
DEFAULT_ITEM_CONFIG["pumpkinspice"] = {
    hold: true,
}

const PARTY_LEADER = "earthWar"
const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "III"

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const BASE_STRATEGY = new BaseStrategy()
const ITEM_STRATEGY = new ItemStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const BUY_STRATEGY = new BuyStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const SELL_STRATEGY = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const RESPAWN_STRATEGY = new RespawnStrategy()
const TRACKER_STRATEGY = new TrackerStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const CHARGE_STRATEGY = new ChargeStrategy()
const HOME_STRATEGY = new HomeServerStrategy(SERVER_REGION, SERVER_ID)
const ELIXIR_STRATEGY = new ElixirStrategy("pumpkinspice")
const TRACK_UPGRADES_STRATEGY = new TrackUpgradeStrategy()
const PARTY_ACCEPT_STRATEGY = new AcceptPartyRequestStrategy()
const PARTY_MEMBER_STRATEGY = new RequestPartyStrategy(PARTY_LEADER)
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const MERCHANT_STRATEGY = new NewMerchantStrategy({
    ...defaultNewMerchantStrategyOptions,
    contexts: CONTEXTS,
})
const MERCHANT_STAND_STRATEGY = new ToggleStandStrategy({
    offWhenMoving: true,
    onWhenNear: [{ distance: 100, position: defaultNewMerchantStrategyOptions.defaultPosition }],
})
const SCORPION_PRIORITY: MonsterName[] = ["gscorpion"]
const ATTACK_STRATEGIES: { [T in string]: WarriorAttackStrategy } = {
    earthWar: new WarriorAttackStrategy({
        contexts: CONTEXTS,
        disableAgitate: true,
        enableEquipForCleave: true,
        generateEnsureEquipped: {
            attributes: ["apiercing"],
            prefer: {
                mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
                offhand: { name: "ololipop", filters: RETURN_HIGHEST },
                earring1: { name: "molesteeth", filters: RETURN_HIGHEST },
                earring2: { name: "molesteeth", filters: RETURN_HIGHEST },
                ring1: { name: "suckerpunch", filters: RETURN_HIGHEST },
                ring2: { name: "suckerpunch", filters: RETURN_HIGHEST },
                orb: { name: "orbofstr", filters: RETURN_HIGHEST },
                chest: { name: "tshirt9", filters: RETURN_HIGHEST },
                gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
            },
        },
        typeList: SCORPION_PRIORITY,
    }),
    earthWar2: new WarriorAttackStrategy({
        contexts: CONTEXTS,
        disableAgitate: true,
        enableEquipForCleave: true,
        generateEnsureEquipped: {
            attributes: ["apiercing"],
            prefer: {
                mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                offhand: { name: "ololipop", filters: RETURN_HIGHEST },
                earring1: { name: "molesteeth", filters: RETURN_HIGHEST },
                earring2: { name: "molesteeth", filters: RETURN_HIGHEST },
                ring1: { name: "suckerpunch", filters: RETURN_HIGHEST },
                ring2: { name: "suckerpunch", filters: RETURN_HIGHEST },
                orb: { name: "orbofstr", filters: RETURN_HIGHEST },
                gloves: { name: "supermittens", filters: RETURN_HIGHEST },
            },
        },
        typeList: SCORPION_PRIORITY,
    }),
    earthWar3: new WarriorAttackStrategy({
        contexts: CONTEXTS,
        disableAgitate: true,
        enableEquipForCleave: true,
        generateEnsureEquipped: {
            attributes: ["apiercing"],
            prefer: {
                mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                offhand: { name: "glolipop", filters: RETURN_HIGHEST },
                earring1: { name: "molesteeth", filters: RETURN_HIGHEST },
                earring2: { name: "molesteeth", filters: RETURN_HIGHEST },
                ring1: { name: "suckerpunch", filters: RETURN_HIGHEST },
                ring2: { name: "suckerpunch", filters: RETURN_HIGHEST },
                orb: { name: "orbofstr", filters: RETURN_HIGHEST },
                gloves: { name: "mittens", filters: RETURN_HIGHEST },
            },
        },
        typeList: SCORPION_PRIORITY,
    }),
}

const MOVE_STRATEGY_SCORPION = new ImprovedMoveStrategy(SCORPION_PRIORITY)

async function start(serverRegion: ServerRegion, serverIdentifier: ServerIdentifier) {
    const merchant = await AL.Game.startMerchant("earthMer", serverRegion, serverIdentifier)
    const merchantContext = new Strategist<Merchant>(merchant, BASE_STRATEGY)
    CONTEXTS.push(merchantContext)
    merchantContext.applyStrategy(MERCHANT_STRATEGY)
    merchantContext.applyStrategy(MERCHANT_STAND_STRATEGY)
    merchantContext.applyStrategy(PARTY_ACCEPT_STRATEGY)

    for (const warriorName of ["earthWar", "earthWar2", "earthWar3"]) {
        const warrior = await AL.Game.startWarrior(warriorName, serverRegion, serverIdentifier)
        const context = new Strategist<Warrior>(warrior, BASE_STRATEGY)
        CONTEXTS.push(context)
        context.applyStrategy(ATTACK_STRATEGIES[warriorName])
        context.applyStrategy(MOVE_STRATEGY_SCORPION)
        context.applyStrategy(PARTY_ACCEPT_STRATEGY)
        context.applyStrategy(CHARGE_STRATEGY)
        if (warriorName !== PARTY_LEADER) context.applyStrategy(PARTY_MEMBER_STRATEGY)
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
start(SERVER_REGION, SERVER_ID)
