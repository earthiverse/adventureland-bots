import AL, {
    Character,
    InviteData,
    Mage,
    Merchant,
    MonsterName,
    PingCompensatedCharacter,
    Ranger,
    ServerIdentifier,
    ServerRegion,
    Warrior,
} from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "./strategy_pattern/context.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { ItemStrategy } from "./strategy_pattern/strategies/item.js"
import { DEFAULT_ITEM_CONFIG } from "./base/itemsNew.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { DestroyStrategy } from "./strategy_pattern/strategies/destroy.js"
import { ImprovedMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { SellStrategy } from "./strategy_pattern/strategies/sell.js"
import { AcceptPartyRequestStrategy } from "./strategy_pattern/strategies/party.js"
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
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const TRACK_UPGRADES_STRATEGY = new TrackUpgradeStrategy()
const PARTY_ACCEPT_STRATEGY = new AcceptPartyRequestStrategy()
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
const BAT_PRIORITY: MonsterName[] = ["goldenbat", "mvampire", "bat"]
// const ATTACK_STRATEGY_BAT_RANGER = new RangerAttackStrategy({
//     contexts: CONTEXTS,
//     generateEnsureEquipped: {
//         prefer: {
//             mainhand: { name: "crossbow", filters: RETURN_HIGHEST },
//             chest: { name: "tshirt9", filters: RETURN_HIGHEST }, // MP Shirt
//             ring1: { name: "zapper", filters: RETURN_HIGHEST },
//             ring2: { name: "cring", filters: RETURN_HIGHEST },
//             orb: { name: "vorb", filters: RETURN_HIGHEST },
//         },
//     },
//     typeList: BAT_PRIORITY,
// })
const ATTACK_STRATEGY_BAT_WARRIOR = new WarriorAttackStrategy({
    contexts: CONTEXTS,
    enableGreedyAggro: true,
    enableEquipForCleave: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
            offhand: { name: "ololipop", filters: RETURN_HIGHEST },
            shoes: { name: "wingedboots", filters: RETURN_HIGHEST },
            chest: { name: "coat", filters: RETURN_HIGHEST },
            pants: { name: "pants", filters: RETURN_HIGHEST },
            helmet: { name: "helmet", filters: RETURN_HIGHEST },
            // chest: { name: "tshirt9", filters: RETURN_HIGHEST }, // MP Shirt
            gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
            ring1: { name: "zapper", filters: RETURN_HIGHEST },
            ring2: { name: "cring", filters: RETURN_HIGHEST },
            orb: { name: "orbofstr", filters: RETURN_HIGHEST },
            amulet: { name: "mpxamulet", filters: RETURN_HIGHEST },
        },
    },
    typeList: BAT_PRIORITY,
})
const ATTACK_STRATEGY_BAT_MAGE = new MageAttackStrategy({
    contexts: CONTEXTS,
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
    typeList: BAT_PRIORITY,
})
const MOVE_STRATEGY_BAT = new ImprovedMoveStrategy(BAT_PRIORITY)

class PolioPartyStrategy<Type extends Character> implements Strategy<Type> {
    private onInvite: (data: { name: string }) => Promise<void>
    public loops = new Map<LoopName, Loop<Character>>()

    public constructor() {
        this.loops.set("party", {
            fn: async (bot: Character) => {
                await this.requestPartyInvite(bot)
            },
            interval: 2000,
        })
    }

    public onApply(bot: Type) {
        this.onInvite = async (data: InviteData) => {
            if (data.name !== "Polio") return // Not Polio
            await bot.acceptPartyInvite(data.name).catch(console.error)
        }
        bot.socket.on("invite", this.onInvite)
    }

    public onRemove(bot: Type) {
        if (this.onInvite) bot.socket.off("invite", this.onInvite)
    }

    private async requestPartyInvite(bot: Character) {
        if (!bot.partyData?.list?.includes("Polio")) {
            // They're not in our party, send a request
            await bot.sendCM(["Polio"], { data: "partyInvite", id: bot.id })
        }
    }
}
const POLIO_PARTY_STRATEGY = new PolioPartyStrategy()

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
    context.applyStrategy(POLIO_PARTY_STRATEGY)

    const mage = await AL.Game.startMage("earthMag", serverRegion, serverIdentifier)
    const context2 = new Strategist<Mage>(mage, BASE_STRATEGY)
    CONTEXTS.push(context2)
    context2.applyStrategy(ATTACK_STRATEGY_BAT_MAGE)
    context2.applyStrategy(MOVE_STRATEGY_BAT)
    context2.applyStrategy(POLIO_PARTY_STRATEGY)

    const warrior = await AL.Game.startWarrior("earthWar", serverRegion, serverIdentifier)
    const context3 = new Strategist<Warrior>(warrior, BASE_STRATEGY)
    CONTEXTS.push(context3)
    context3.applyStrategy(ATTACK_STRATEGY_BAT_WARRIOR)
    context3.applyStrategy(MOVE_STRATEGY_BAT)
    context3.applyStrategy(POLIO_PARTY_STRATEGY)
    context3.applyStrategy(CHARGE_STRATEGY)

    // for (const name of ["earthRan2", "earthRan3"]) {
    //     const ranger = await AL.Game.startRanger(name, serverRegion, serverIdentifier)
    //     const context = new Strategist<Ranger>(ranger, BASE_STRATEGY)
    //     CONTEXTS.push(context)
    //     context.applyStrategy(ATTACK_STRATEGY_BAT_RANGER)
    //     context.applyStrategy(MOVE_STRATEGY_BAT)
    //     context.applyStrategy(POLIO_PARTY_STRATEGY)
    // }

    for (const context of CONTEXTS) {
        context.applyStrategy(AVOID_DEATH_STRATEGY)
        context.applyStrategy(ITEM_STRATEGY)
        context.applyStrategy(BUY_STRATEGY)
        context.applyStrategy(SELL_STRATEGY)
        context.applyStrategy(RESPAWN_STRATEGY)
        context.applyStrategy(TRACKER_STRATEGY)
        context.applyStrategy(DESTROY_STRATEGY)
        context.applyStrategy(TRACK_UPGRADES_STRATEGY)

        if (context.bot.ctype !== "merchant") {
            context.applyStrategy(ELIXIR_STRATEGY)
        }
    }
}
start("US", "I")
