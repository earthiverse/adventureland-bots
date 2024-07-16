import AL, {
    Attribute,
    Game,
    ItemName,
    Merchant,
    MonsterName,
    PingCompensatedCharacter,
    ServerIdentifier,
    ServerRegion,
    Warrior,
} from "alclient"
import { Loop, LoopName, Strategist, Strategy } from "./strategy_pattern/context.js"
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

await Promise.all([AL.Game.loginJSONFile("../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

// We're using pumpkinspice for the elixir in this script
DEFAULT_ITEM_CONFIG["pumpkinspice"] = {
    hold: true,
}

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

class BaseStrategy<Type extends PingCompensatedCharacter> implements Strategy<Type> {
    public loops = new Map<LoopName, Loop<Type>>()

    /**
     * A list of potions to use
     * TODO: Move this to a config option
     * */
    protected static potions: ItemName[] = ["hpot0", "mpot0", "hpot1", "mpot1"]

    public constructor() {
        this.loops.set("heal", {
            fn: async (bot: Type) => {
                await this.heal(bot)
            },
            interval: ["use_hp"],
        })
    }

    private async heal(bot: Type) {
        if (bot.rip) return // Don't heal if dead

        const missingHP = bot.max_hp - bot.hp
        const missingMP = bot.max_mp - bot.mp

        if (missingHP == 0 && missingMP == 0) return // We have full HP and MP

        let maxGiveHp = Math.min(50, missingHP) // If we use `regen_hp` skill
        let maxGiveHpPotion: ItemName | "regen_hp" = "regen_hp"
        let maxGiveMp = Math.min(100, missingMP) // If we use `regen_mp` skill
        let maxGiveMpPotion: ItemName | "regen_mp" = "regen_mp"
        let maxGiveBoth = Math.max(maxGiveHp, maxGiveMp)
        let maxGiveBothPotion: ItemName

        const hpRatio = bot.hp / bot.max_hp
        const mpRatio = bot.mp / bot.max_mp

        if (bot.c.town || bot.c.fishing || bot.c.mining || bot.c.pickpocket) {
            // Channeled skills will stop chanelling if you use a potion
            if (hpRatio <= mpRatio) return bot.regenHP()
            else return bot.regenMP()
        }

        for (const potion of BaseStrategy.potions) {
            const gItem = Game.G.items[potion]
            if (!gItem?.gives) continue // It's missing give information!?
            if (!bot.hasItem(potion)) continue // We don't have any
            let couldGiveHp = 0
            let couldGiveMp = 0
            for (const give of [
                ...gItem.gives,
                ...(((gItem[bot.map] as unknown as any)?.gives as [Attribute, number][]) ?? []), // Map bonuses
                ...(((gItem[bot.ctype] as unknown as any)?.gives as [Attribute, number][]) ?? []), // Character bonuses
            ]) {
                if (give[0] === "hp") couldGiveHp += Math.max(0, Math.min(give[1], missingHP))
                else if (give[0] === "mp") couldGiveMp += Math.max(0, Math.min(give[1], missingMP))
            }
            if (couldGiveHp > maxGiveHp) {
                maxGiveHp = couldGiveHp
                maxGiveHpPotion = potion
            }
            if (couldGiveMp > maxGiveMp) {
                maxGiveMp = couldGiveMp
                maxGiveMpPotion = potion
            }
            const couldGiveBoth = couldGiveHp + couldGiveMp
            if (couldGiveBoth > maxGiveBoth) {
                maxGiveBoth = couldGiveBoth
                maxGiveBothPotion = potion
            }
        }

        if (Math.abs(hpRatio - mpRatio) < 0.25) {
            // Our ratios are pretty similar, prefer both
            if (maxGiveBothPotion)
                return bot.usePotion(bot.locateItem(maxGiveBothPotion, bot.items, { returnLowestQuantity: true }))
        }

        if (hpRatio <= mpRatio) {
            // HP ratio is the same, or lower than the MP ratio, prefer HP
            if (maxGiveHpPotion === "regen_hp") return bot.regenHP()
            else return bot.usePotion(bot.locateItem(maxGiveHpPotion, bot.items, { returnLowestQuantity: true }))
        }

        // MP ratio is lower, prefer MP
        if (maxGiveMpPotion === "regen_mp") return bot.regenMP()
        else return bot.usePotion(bot.locateItem(maxGiveMpPotion, bot.items, { returnLowestQuantity: true }))
    }
}

const BASE_STRATEGY = new BaseStrategy()
const ITEM_STRATEGY = new ItemStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const BUY_STRATEGY = new BuyStrategy({ contexts: CONTEXTS, itemConfig: DEFAULT_ITEM_CONFIG })
const SELL_STRATEGY = new SellStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const RESPAWN_STRATEGY = new RespawnStrategy()
const TRACKER_STRATEGY = new TrackerStrategy()
const DESTROY_STRATEGY = new DestroyStrategy({ itemConfig: DEFAULT_ITEM_CONFIG })
const CHARGE_STRATEGY = new ChargeStrategy()
const HOME_STRATEGY = new HomeServerStrategy("US", "III")
const ELIXIR_STRATEGY = new ElixirStrategy("pumpkinspice")
const TRACK_UPGRADES_STRATEGY = new TrackUpgradeStrategy()
const PARTY_ACCEPT_STRATEGY = new AcceptPartyRequestStrategy()
const PARTY_MEMBER_STRATEGY = new RequestPartyStrategy("CrownsAnal")
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
                orb: { name: "orbofstr", filters: RETURN_HIGHEST },
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
                orb: { name: "orbofstr", filters: RETURN_HIGHEST },
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
                orb: { name: "orbofstr", filters: RETURN_HIGHEST },
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
        context.applyStrategy(PARTY_MEMBER_STRATEGY)
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
start("US", "III")
