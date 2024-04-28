import AL, {
    Character,
    InviteData,
    Merchant,
    PingCompensatedCharacter,
    Ranger,
    ServerIdentifier,
    ServerRegion,
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
import { RETURN_HIGHEST } from "./strategy_pattern/setups/equipment.js"
import { TrackUpgradeStrategy } from "./strategy_pattern/strategies/statistics.js"

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
const ATTACK_STRATEGY_BAT = new RangerAttackStrategy({
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
    typeList: ["bat", "goldenbat", "mvampire"],
})
const MOVE_STRATEGY_BAT = new ImprovedMoveStrategy(["bat", "goldenbat", "mvampire"])

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

    for (const name of ["earthiverse"]) {
        const ranger = await AL.Game.startRanger(name, serverRegion, serverIdentifier)
        const context = new Strategist<Ranger>(ranger, BASE_STRATEGY)
        CONTEXTS.push(context)
        context.applyStrategy(ATTACK_STRATEGY_WOLFIE)
        context.applyStrategy(MOVE_STRATEGY_WOLFIE)
        context.applyStrategy(POLIO_PARTY_STRATEGY)
    }
    for (const name of ["earthRan2", "earthRan3"]) {
        const ranger = await AL.Game.startRanger(name, serverRegion, serverIdentifier)
        const context = new Strategist<Ranger>(ranger, BASE_STRATEGY)
        CONTEXTS.push(context)
        context.applyStrategy(ATTACK_STRATEGY_BAT)
        context.applyStrategy(MOVE_STRATEGY_BAT)
        context.applyStrategy(POLIO_PARTY_STRATEGY)
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
    }
}
start("US", "I")
