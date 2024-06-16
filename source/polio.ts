import AL, {
    Mage,
    Merchant,
    MonsterName,
    PingCompensatedCharacter,
    Ranger,
    ServerIdentifier,
    ServerRegion,
    Warrior,
} from "alclient"
import { Strategist } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { ItemStrategy } from "./strategy_pattern/strategies/item.js"
import { DEFAULT_ITEM_CONFIG } from "./base/itemsNew.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { DestroyStrategy } from "./strategy_pattern/strategies/destroy.js"
import { ImprovedMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { SellStrategy } from "./strategy_pattern/strategies/sell.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { RangerAttackStrategy } from "./strategy_pattern/strategies/attack_ranger.js"
import { NewMerchantStrategy, defaultNewMerchantStrategyOptions } from "./merchant/strategy.js"
import { AvoidDeathStrategy } from "./strategy_pattern/strategies/avoid_death.js"
import { ToggleStandStrategy } from "./strategy_pattern/strategies/stand.js"
import { RETURN_HIGHEST, UNEQUIP } from "./strategy_pattern/setups/equipment.js"
import { TrackUpgradeStrategy } from "./strategy_pattern/strategies/statistics.js"
import { WarriorAttackStrategy } from "./strategy_pattern/strategies/attack_warrior.js"
import { MageAttackStrategy } from "./strategy_pattern/strategies/attack_mage.js"
import { ElixirStrategy } from "./strategy_pattern/strategies/elixir.js"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge.js"
import { HomeServerStrategy } from "./strategy_pattern/strategies/home_server.js"

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const BASE_STRATEGY = new BaseStrategy(CONTEXTS)
const ITEM_STRATEGY = new ItemStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const BUY_STRATEGY = new BuyStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const SELL_STRATEGY = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const RESPAWN_STRATEGY = new RespawnStrategy()
const TRACKER_STRATEGY = new TrackerStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const CHARGE_STRATEGY = new ChargeStrategy()
const HOME_STRATEGY = new HomeServerStrategy("US", "I")
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const TRACK_UPGRADES_STRATEGY = new TrackUpgradeStrategy()
const PARTY_ACCEPT_STRATEGY = new AcceptPartyRequestStrategy()
const PARTY_MEMBER_STRATEGY = new RequestPartyStrategy("earthiverse")
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const MERCHANT_STRATEGY = new NewMerchantStrategy({ ...defaultNewMerchantStrategyOptions, contexts: CONTEXTS })
const MERCHANT_STAND_STRATEGY = new ToggleStandStrategy({
    offWhenMoving: true,
    onWhenNear: [{ distance: 100, position: defaultNewMerchantStrategyOptions.defaultPosition }],
})
const ATTACK_STRATEGY_WOLFIE = new RangerAttackStrategy({
    contexts: CONTEXTS,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "crossbow", filters: RETURN_HIGHEST },
            chest: { name: "tshirt9", filters: RETURN_HIGHEST }, // MP Shirt
            ring1: { name: "zapper", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            orb: { name: "vorb", filters: RETURN_HIGHEST },
        },
    },
    typeList: ["wolfie"],
})
const MOVE_STRATEGY_WOLFIE = new ImprovedMoveStrategy(["wolfie"])
const SCORPION_PRIORITY: MonsterName[] = ["gscorpion"]
const ATTACK_STRATEGY_SCORPION_WARRIOR = new WarriorAttackStrategy({
    contexts: CONTEXTS,
    enableGreedyAggro: true,
    disableZapperGreedyAggro: true,
    enableEquipForCleave: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
            offhand: { name: "ololipop", filters: RETURN_HIGHEST },
            shoes: { name: "wingedboots", filters: RETURN_HIGHEST },
            // chest: { name: "coat", filters: RETURN_HIGHEST },
            pants: { name: "pants", filters: RETURN_HIGHEST },
            helmet: { name: "helmet", filters: RETURN_HIGHEST },
            chest: { name: "tshirt9", filters: RETURN_HIGHEST }, // MP Shirt
            gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
            ring1: { name: "zapper", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            orb: { name: "orbofstr", filters: RETURN_HIGHEST },
            amulet: { name: "mpxamulet", filters: RETURN_HIGHEST },
        },
    },
    typeList: SCORPION_PRIORITY,
})
const ATTACK_STRATEGY_SCORPION_MAGE = new MageAttackStrategy({
    contexts: CONTEXTS,
    disableScare: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "gstaff", filters: RETURN_HIGHEST },
            offhand: UNEQUIP,
            chest: { name: "tshirt9", filters: RETURN_HIGHEST }, // MP Shirt
            gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
            ring1: { name: "cring", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
        },
    },
    typeList: SCORPION_PRIORITY,
})
const MOVE_STRATEGY_SCORPION = new ImprovedMoveStrategy(SCORPION_PRIORITY)

async function start(serverRegion: ServerRegion, serverIdentifier: ServerIdentifier) {
    const merchant = await AL.Game.startMerchant("earthMer", serverRegion, serverIdentifier)
    const merchantContext = new Strategist<Merchant>(merchant, BASE_STRATEGY)
    CONTEXTS.push(merchantContext)
    merchantContext.applyStrategy(MERCHANT_STRATEGY)
    merchantContext.applyStrategy(MERCHANT_STAND_STRATEGY)
    merchantContext.applyStrategy(PARTY_ACCEPT_STRATEGY)

    const ranger = await AL.Game.startRanger("earthiverse", serverRegion, serverIdentifier)
    const context = new Strategist<Ranger>(ranger, BASE_STRATEGY)
    CONTEXTS.push(context)
    context.applyStrategy(ATTACK_STRATEGY_WOLFIE)
    context.applyStrategy(MOVE_STRATEGY_WOLFIE)
    context.applyStrategy(PARTY_ACCEPT_STRATEGY)

    const mage = await AL.Game.startMage("earthMag", serverRegion, serverIdentifier)
    const context2 = new Strategist<Mage>(mage, BASE_STRATEGY)
    CONTEXTS.push(context2)
    context2.applyStrategy(ATTACK_STRATEGY_SCORPION_MAGE)
    context2.applyStrategy(MOVE_STRATEGY_SCORPION)
    context2.applyStrategy(PARTY_ACCEPT_STRATEGY)
    context2.applyStrategy(PARTY_MEMBER_STRATEGY)

    const warrior = await AL.Game.startWarrior("earthWar", serverRegion, serverIdentifier)
    const context3 = new Strategist<Warrior>(warrior, BASE_STRATEGY)
    CONTEXTS.push(context3)
    context3.applyStrategy(ATTACK_STRATEGY_SCORPION_WARRIOR)
    context3.applyStrategy(MOVE_STRATEGY_SCORPION)
    context3.applyStrategy(PARTY_ACCEPT_STRATEGY)
    context3.applyStrategy(CHARGE_STRATEGY)
    context3.applyStrategy(PARTY_MEMBER_STRATEGY)

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
start("US", "I")
