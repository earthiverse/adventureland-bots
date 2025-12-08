import AL, {
    Character,
    EntityModel,
    IPosition,
    Mage,
    Merchant,
    MonsterName,
    Paladin,
    PingCompensatedCharacter,
    Priest,
    Ranger,
    Rogue,
    ServerIdentifier,
    ServerInfoDataLive,
    ServerRegion,
    Warrior,
} from "alclient"
import { Strategist } from "../strategy_pattern/context.js"
import { defaultNewMerchantStrategyOptions, NewMerchantStrategy } from "../merchant/strategy.js"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { adjustItemConfig, DEFAULT_ITEM_CONFIG } from "../base/itemsNew.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { DestroyStrategy, MerchantDestroyStrategy } from "../strategy_pattern/strategies/destroy.js"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { HomeServerStrategy } from "../strategy_pattern/strategies/home_server.js"
import { ChargeStrategy } from "../strategy_pattern/strategies/charge.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"
import { PartyHealStrategy } from "../strategy_pattern/strategies/partyheal.js"
import { ItemStrategy } from "../strategy_pattern/strategies/item.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"
import { MagiportOthersSmartMovingToUsStrategy } from "../strategy_pattern/strategies/magiport.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import {
    generateEnsureEquipped,
    RETURN_HIGHEST,
    ZAPPER_CRING,
    ZAPPER_STRRING,
} from "../strategy_pattern/setups/equipment.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategy_pattern/strategies/attack_rogue.js"
import { PaladinAttackStrategy } from "../strategy_pattern/strategies/attack_paladin.js"
import {
    GetHolidaySpiritStrategy,
    SpecialMonsterMoveStrategy,
    SpreadOutImprovedMoveStrategy,
} from "../strategy_pattern/strategies/move.js"
import { mainFrogs } from "../base/locations.js"
import { BoosterStrategy } from "../strategy_pattern/strategies/booster.js"
import { checkOnlyEveryMS } from "../base/general.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { remove_abtesting: true, remove_test: true })
void adjustItemConfig(DEFAULT_ITEM_CONFIG)

/**
 * Characters to use for grinch
 * PRIEST_CHARACTER will be the third attacking character
 * earthMer will be the merchant
 */
const CHARACTERS_FOR_SERVERS: { [T in ServerRegion]?: { [T in ServerIdentifier]?: string[] } } = {
    US: {
        I: ["earthiverse", "earthRog"],
        II: ["earthRan2", "earthRog2"],
        III: ["earthRan3", "earthRog3"],
        PVP: ["earthRog", "earthRog2"],
    },
    EU: {
        I: ["earthWar", "earthMag"],
        II: ["earthWar2", "earthMag2"],
        PVP: ["earthRog", "earthRog2"],
    },
    ASIA: {
        I: ["earthWar3", "earthMag3"],
    },
}

/** Also start priest for healing */
const PRIEST_CHARACTER = "earthPri"

// Sanity check that we aren't using characters for more than one server
// (other than PVP)
const UNIQUE_CHARACTERS = new Map<string, string>()
for (const region of Object.keys(CHARACTERS_FOR_SERVERS)) {
    for (const identifier of Object.keys(CHARACTERS_FOR_SERVERS[region as ServerRegion])) {
        if (identifier === "PVP") continue
        const characters = CHARACTERS_FOR_SERVERS[region as ServerRegion][identifier as ServerIdentifier]
        for (const character of characters) {
            if (UNIQUE_CHARACTERS.has(character))
                throw new Error(
                    `${character} is assigned to ${region}${identifier} and ${UNIQUE_CHARACTERS.get(character)}`,
                )
            UNIQUE_CHARACTERS.set(character, `${region}${identifier}`)
        }
    }
}

/** What monster to farm while waiting */
const CHRISTMAS_IDLE_MONSTER: MonsterName = "tortoise"

/** Christmas monsters, sorted by priority (high -> low) */
const CHRISTMAS_EVENT_MONSTERS: MonsterName[] = ["grinch", "snowman"]

/** All monsters we're farming */
const CHRISTMAS_MONSTERS: MonsterName[] = [...CHRISTMAS_EVENT_MONSTERS, "frog", "tortoise", "arcticbee"]

const SWITCH_TO_LUCK_AT_HP: number = 2_000_000
const STAY_ON_SERVER_IF_HP_LESS_THAN: number = 5_000_000

const MERCHANT_HOLD_POSITION: IPosition = { map: "main", x: 0, y: 0 }

let currentRegion: ServerRegion = "US"
let currentIdentifier: ServerIdentifier = "HARDCORE" // Start on a non-existent server, the first loop will set this to something else

type Server = `${ServerRegion}${ServerIdentifier}`
const SERVER_PRIORITY: Server[] = ["EUI", "USIII", "USII", "EUII", "USI", "ASIAI", "USPVP", "EUPVP"]

const activeStrategists: Strategist<PingCompensatedCharacter>[] = []

const ACCEPT_PARTY_REQUEST_STRATEGY = new AcceptPartyRequestStrategy()
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy()
const BASE_STRATEGY = new BaseStrategy(activeStrategists)
const BOOSTER_STRATEGY = new BoosterStrategy("luckbooster")
const BUY_STRATEGY = new BuyStrategy({
    contexts: activeStrategists,
    itemConfig: DEFAULT_ITEM_CONFIG,
    enableBuyForProfit: true,
})
const CHARGE_STRATEGY = new ChargeStrategy()
const DESTROY_STRATEGY = new DestroyStrategy()
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const GIVE_ROGUE_SPEED_STRATEGY = new GiveRogueSpeedStrategy()
const ITEM_STRATEGY = new ItemStrategy({
    contexts: activeStrategists,
    itemConfig: DEFAULT_ITEM_CONFIG,
    transferItemsTo: "earthMer",
})
const MAGIPORT_STRATEGY = new MagiportOthersSmartMovingToUsStrategy(activeStrategists)
const MERCHANT_DESTROY_STRATEGY = new MerchantDestroyStrategy()
const MERCHANT_STRATEGY = new NewMerchantStrategy({
    ...defaultNewMerchantStrategyOptions,
    contexts: activeStrategists,
    defaultPosition: MERCHANT_HOLD_POSITION,
    goldToHold: 1_000_000_000,
})
const PARTY_HEAL_STRATEGY = new PartyHealStrategy(activeStrategists)
const RESPAWN_STRATEGY = new RespawnStrategy()
const SELL_STRATEGY = new SellStrategy({
    itemConfig: DEFAULT_ITEM_CONFIG,
})
const TOGGLE_STAND_STRATEGY = new ToggleStandStrategy({
    offWhenMoving: true,
    onWhenNear: [{ distance: 10, position: MERCHANT_HOLD_POSITION }],
})
const TRACKER_STRATEGY = new TrackerStrategy()

class MageChristmasAttackStrategy extends MageAttackStrategy {
    protected ensureEquipped(bot: Mage): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 5_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            const grinch = bot.getEntity({ type: "grinch" })
            const snowman = bot.getEntity({ type: "snowman" })
            if ((grinch && grinch.hp < SWITCH_TO_LUCK_AT_HP) || (snowman && snowman.hp < 100)) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["luck"] }))
                return super.ensureEquipped(bot)
            }

            if (snowman) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["frequency"] }))
                return super.ensureEquipped(bot)
            }
        }

        return super.ensureEquipped(bot)
    }
}
const MAGE_ATTACK_STRATEGY = new MageChristmasAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbook1", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: CHRISTMAS_MONSTERS,
})

class PaladinChristmasAttackStrategy extends PaladinAttackStrategy {
    protected ensureEquipped(bot: Paladin): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 5_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            const grinch = bot.getEntity({ type: "grinch" })
            const snowman = bot.getEntity({ type: "snowman" })
            if ((grinch && grinch.hp < SWITCH_TO_LUCK_AT_HP) || (snowman && snowman.hp < 100)) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["luck"] }))
                return super.ensureEquipped(bot)
            }

            if (snowman) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["frequency"] }))
                return super.ensureEquipped(bot)
            }
        }

        return super.ensureEquipped(bot)
    }
}
const PALADIN_ATTACK_STRATEGY = new PaladinChristmasAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: { mainhand: { name: "fireblade", filters: RETURN_HIGHEST } },
        ...ZAPPER_CRING,
    },
    typeList: CHRISTMAS_MONSTERS,
})

class PriestChristmasAttackStrategy extends PriestAttackStrategy {
    protected ensureEquipped(bot: Priest): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 5_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            const grinch = bot.getEntity({ type: "grinch" })
            const snowman = bot.getEntity({ type: "snowman" })
            if ((grinch && grinch.hp < SWITCH_TO_LUCK_AT_HP) || (snowman && snowman.hp < 100)) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["luck"] }))
                return super.ensureEquipped(bot)
            }

            if (snowman) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["frequency"] }))
                return super.ensureEquipped(bot)
            }
        }

        return super.ensureEquipped(bot)
    }
}
const PRIEST_ATTACK_STRATEGY = new PriestChristmasAttackStrategy({
    contexts: activeStrategists,
    enableAbsorbToTank: true,
    enableGreedyAggro: ["grinch"],
    enableHealStrangers: true,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
            offhand: { name: "wbook1", filters: RETURN_HIGHEST },
            orb: { name: "jacko", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: CHRISTMAS_MONSTERS,
})

class RangerChristmasAttackStrategy extends RangerAttackStrategy {
    protected ensureEquipped(bot: Ranger): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 5_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            const grinch = bot.getEntity({ type: "grinch" })
            const snowman = bot.getEntity({ type: "snowman" })
            if ((grinch && grinch.hp < SWITCH_TO_LUCK_AT_HP) || (snowman && snowman.hp < 100)) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["luck"] }))
                return super.ensureEquipped(bot)
            }

            if (snowman) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["frequency"] }))
                return super.ensureEquipped(bot)
            }
        }

        return super.ensureEquipped(bot)
    }
}
const RANGER_ATTACK_STRATEGY = new RangerChristmasAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "firebow", filters: RETURN_HIGHEST },
            offhand: { name: "t2quiver", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
        },
    },
    typeList: CHRISTMAS_MONSTERS,
})

class RogueChristmasAttackStrategy extends RogueAttackStrategy {
    protected ensureEquipped(bot: Rogue): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 5_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            const grinch = bot.getEntity({ type: "grinch" })
            const snowman = bot.getEntity({ type: "snowman" })
            if ((grinch && grinch.hp < SWITCH_TO_LUCK_AT_HP) || (snowman && snowman.hp < 100)) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["luck"] }))
                return super.ensureEquipped(bot)
            }

            if (snowman) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["frequency"] }))
                return super.ensureEquipped(bot)
            }
        }

        return super.ensureEquipped(bot)
    }
}
const ROGUE_ATTACK_STRATEGY = new RogueChristmasAttackStrategy({
    contexts: activeStrategists,
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "crabclaw", filters: RETURN_HIGHEST },
            offhand: { name: "firestars", filters: RETURN_HIGHEST },
            gloves: { name: "mpxgloves", filters: RETURN_HIGHEST },
            belt: { name: "dexbelt", filters: RETURN_HIGHEST },
            amulet: { name: "mpxamulet", filters: RETURN_HIGHEST },
            orb: { name: "orbofdex", filters: RETURN_HIGHEST },
            ...ZAPPER_CRING,
            earring1: { name: "dexearring", filters: RETURN_HIGHEST },
            earring2: { name: "dexearring", filters: RETURN_HIGHEST },
        },
    },
    typeList: CHRISTMAS_MONSTERS,
})

class WarriorChristmasAttackStrategy extends WarriorAttackStrategy {
    protected ensureEquipped(bot: Warrior): Promise<void> {
        if (checkOnlyEveryMS(`equip_${bot.id}`, 5_000)) {
            this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, this.options.generateEnsureEquipped))

            const grinch = bot.getEntity({ type: "grinch" })
            const snowman = bot.getEntity({ type: "snowman" })
            if ((grinch && grinch.hp < SWITCH_TO_LUCK_AT_HP) || (snowman && snowman.hp < 100)) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["luck"] }))
                return super.ensureEquipped(bot)
            }

            if (snowman) {
                this.botEnsureEquipped.set(bot.id, generateEnsureEquipped(bot, { attributes: ["frequency"] }))
                return super.ensureEquipped(bot)
            }
        }

        return super.ensureEquipped(bot)
    }
}
const WARRIOR_ATTACK_STRATEGY = new WarriorChristmasAttackStrategy({
    contexts: activeStrategists,
    disableStomp: true,
    enableEquipForCleave: true,
    enableGreedyAggro: ["grinch"],
    generateEnsureEquipped: {
        prefer: {
            mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
            offhand: { name: "fireblade", filters: RETURN_HIGHEST },
            ...ZAPPER_STRRING,
            earring1: { name: "cearring", filters: RETURN_HIGHEST },
            earring2: { name: "cearring", filters: RETURN_HIGHEST },
            amulet: { name: "snring", filters: RETURN_HIGHEST },
            orb: { name: "orbofstr", filters: RETURN_HIGHEST },
        },
    },
    typeList: CHRISTMAS_MONSTERS,
})

class GrinchMoveStrategy extends SpecialMonsterMoveStrategy {
    protected move(bot: Character): Promise<IPosition> {
        const map = (bot.S.grinch as ServerInfoDataLive).map
        if (!map) return // Not live
        if (bot.G.maps[map].safe) return // Can't farm on safe map

        return super.move(bot)
    }
}

const HOLIDAY_SPIRIT_STRATEGY = new GetHolidaySpiritStrategy()
const GRINCH_MOVE_STRATEGY = new GrinchMoveStrategy({ contexts: activeStrategists, typeList: ["grinch"] })
const SNOWMAN_MOVE_STRATEGY = new SpecialMonsterMoveStrategy({ contexts: activeStrategists, typeList: ["snowman"] })
const TORTOISE_MOVE_STRATEGY = new SpreadOutImprovedMoveStrategy(["tortoise"], { idlePosition: mainFrogs })

const startBot = async (region: ServerRegion, identifier: ServerIdentifier, name: string, monster: MonsterName) => {
    let strategist: Strategist<PingCompensatedCharacter>
    switch (name) {
        // Mages
        case "earthMag":
        case "earthMag2":
        case "earthMag3": {
            const mage = new Strategist(await AL.Game.startMage(name, region, identifier))
            strategist = mage
            mage.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, MAGIPORT_STRATEGY, MAGE_ATTACK_STRATEGY])
            break
        }

        // Merchants
        case "earthMer":
        case "earthMer2":
        case "earthMer3": {
            const merchant = new Strategist(await AL.Game.startMerchant(name, region, identifier))
            merchant.applyStrategies([MERCHANT_DESTROY_STRATEGY, MERCHANT_STRATEGY, TOGGLE_STAND_STRATEGY])
            strategist = merchant
            break
        }

        // Paladins
        case "earthPal": {
            const paladin = new Strategist(await AL.Game.startPaladin(name, region, identifier))
            paladin.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, PALADIN_ATTACK_STRATEGY])
            strategist = paladin
            break
        }

        // Priests
        case "earthPri":
        case "earthPri2": {
            const priest = new Strategist(await AL.Game.startPriest(name, region, identifier))
            priest.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, PARTY_HEAL_STRATEGY, PRIEST_ATTACK_STRATEGY])
            strategist = priest
            break
        }

        // Rangers
        case "earthiverse":
        case "earthRan2":
        case "earthRan3": {
            const ranger = new Strategist(await AL.Game.startRanger(name, region, identifier))
            ranger.applyStrategies([BOOSTER_STRATEGY, DESTROY_STRATEGY, RANGER_ATTACK_STRATEGY])
            strategist = ranger
            break
        }

        // Rogues
        case "earthRog":
        case "earthRog2":
        case "earthRog3": {
            const rogue = new Strategist(await AL.Game.startRogue(name, region, identifier))
            rogue.applyStrategies([
                BOOSTER_STRATEGY,
                DESTROY_STRATEGY,
                GIVE_ROGUE_SPEED_STRATEGY,
                ROGUE_ATTACK_STRATEGY,
            ])
            strategist = rogue
            break
        }

        // Warriors
        case "earthWar":
        case "earthWar2":
        case "earthWar3": {
            const warrior = new Strategist(await AL.Game.startWarrior(name, region, identifier))
            warrior.applyStrategies([BOOSTER_STRATEGY, CHARGE_STRATEGY, DESTROY_STRATEGY, WARRIOR_ATTACK_STRATEGY])
            strategist = warrior
            break
        }
    }

    // Strategies for all bots
    strategist.applyStrategies([
        ACCEPT_PARTY_REQUEST_STRATEGY,
        AVOID_DEATH_STRATEGY,
        AVOID_STACKING_STRATEGY,
        BASE_STRATEGY,
        BUY_STRATEGY,
        ELIXIR_STRATEGY,
        ITEM_STRATEGY,
        RESPAWN_STRATEGY,
        SELL_STRATEGY,
        TRACKER_STRATEGY,
    ])

    // Move strategies
    if (!(strategist.bot instanceof Merchant)) {
        if (monster === "grinch") strategist.applyStrategy(GRINCH_MOVE_STRATEGY)
        else if (monster === "snowman") strategist.applyStrategy(SNOWMAN_MOVE_STRATEGY)
        else if (monster === "tortoise") strategist.applyStrategy(TORTOISE_MOVE_STRATEGY)
    }

    if (identifier !== "PVP" && name !== PRIEST_CHARACTER)
        strategist.applyStrategy(new HomeServerStrategy(region, identifier))

    // First character to start becomes party leader
    if (activeStrategists.length > 0 && strategist.bot.ctype !== "merchant") {
        strategist.applyStrategy(new RequestPartyStrategy(activeStrategists[0].bot.name))
    }

    activeStrategists.push(strategist)
}

const startBotsOnServer = async (region: ServerRegion, identifier: ServerIdentifier, monster: MonsterName) => {
    currentRegion = region
    currentIdentifier = identifier

    // Determine which bots to use
    const attackingCharacters: string[] = [...CHARACTERS_FOR_SERVERS[region][identifier], PRIEST_CHARACTER]

    // Start bots
    for (const name of attackingCharacters) await startBot(region, identifier, name, monster).catch(console.error)
    await startBot(region, identifier, "earthMer", monster).catch(console.error)

    // Backup merchant if `earthMer` gets stuck
    let hasMerch = activeStrategists.some((s) => s.bot.ctype === "merchant")
    if (!hasMerch) {
        try {
            await startBot(region, identifier, "earthMer2", monster)
            hasMerch = true
        } catch (e) {
            console.error(e)
        }
    }

    // Backup priest if `earthPri` gets stuck
    const hasPriest = activeStrategists.some((s) => s.bot.ctype === "priest")
    if (!hasPriest) await startBot(region, identifier, "earthPri2", monster).catch(console.error)

    // Backup additional character
    if ((hasMerch && activeStrategists.length < 4) || (!hasMerch && activeStrategists.length < 3)) {
        await startBot(region, identifier, "earthPal", monster).catch(console.error)
    }
}

const logicLoop = async () => {
    /** How many ms to wait until the next check */
    let timeoutMs = 10_000
    try {
        console.debug("Looking for Christmas monsters...")
        const liveChristmasMonsters = await EntityModel.find({
            type: { $in: CHRISTMAS_EVENT_MONSTERS },
            $and: [
                {
                    $or: [
                        { "s.fullguardx": undefined },
                        { "s.fullguardx.ms": { $lt: 60_000 } },
                        { serverIdentifier: "PVP" },
                    ],
                },
                {
                    $or: [
                        { "s.fullguard": undefined },
                        { "s.fullguard.ms": { $lt: 60_000 } },
                        { serverIdentifier: "PVP" },
                    ],
                },
            ],
        })
            .lean()
            .exec()

        // Sort monsters by priority
        const monsterRank = (t: MonsterName) => {
            if (t === "grinch") return 0
            return 1 // snowman
        }
        liveChristmasMonsters.sort((a, b) => {
            // Prioritize by type
            const aRank = monsterRank(a.type)
            const bRank = monsterRank(b.type)
            if (aRank !== bRank) return aRank - bRank

            const aSameServer = a.serverIdentifier === currentIdentifier && a.serverRegion === currentRegion
            const bSameServer = b.serverIdentifier === currentIdentifier && b.serverRegion === currentRegion

            if (aSameServer && a.hp < STAY_ON_SERVER_IF_HP_LESS_THAN) return -1
            if (bSameServer && b.hp < STAY_ON_SERVER_IF_HP_LESS_THAN) return 1

            // Prioritize lower HP
            if (Math.abs(a.hp - b.hp) > 1_000_000) return a.hp - b.hp

            // Prioritize same server
            if (aSameServer && !bSameServer) return -1
            if (!aSameServer && bSameServer) return 1

            // Proritize by server
            const aServer: Server = `${a.serverRegion}${a.serverIdentifier}`
            const bServer: Server = `${b.serverRegion}${b.serverIdentifier}`
            if (aServer !== bServer) return SERVER_PRIORITY.indexOf(aServer) - SERVER_PRIORITY.indexOf(bServer)
        })

        const target =
            liveChristmasMonsters.length === 0
                ? { serverRegion: currentRegion, serverIdentifier: currentIdentifier, type: CHRISTMAS_IDLE_MONSTER }
                : liveChristmasMonsters[0]

        if (target.serverRegion !== currentRegion || target.serverIdentifier !== currentIdentifier) {
            console.debug(
                `Switching from ${currentRegion}${currentIdentifier} to ${target.serverRegion}${target.serverIdentifier}...`,
            )
            // Stop current bots
            for (const strategist of activeStrategists) {
                for (const [id] of strategist.bot.chests) await strategist.bot.openChest(id).catch(console.error)
                strategist.stop()
            }
            activeStrategists.splice(0, activeStrategists.length)

            // Start new bots
            await startBotsOnServer(target.serverRegion, target.serverIdentifier, target.type)
            timeoutMs = 60_000

            currentRegion = target.serverRegion
            currentIdentifier = target.serverIdentifier
            return
        }

        // Same characters, just ensure we're using the correct strategies
        for (const strategist of activeStrategists) {
            if (strategist.bot.ctype === "merchant") continue // Merchant does their own thing
            if (strategist.bot.S.holidayseason && !strategist.bot.s.holidayspirit) {
                if (strategist.hasStrategy(TORTOISE_MOVE_STRATEGY)) strategist.removeStrategy(TORTOISE_MOVE_STRATEGY)
                if (strategist.hasStrategy(GRINCH_MOVE_STRATEGY)) strategist.removeStrategy(GRINCH_MOVE_STRATEGY)
                if (strategist.hasStrategy(SNOWMAN_MOVE_STRATEGY)) strategist.removeStrategy(SNOWMAN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(HOLIDAY_SPIRIT_STRATEGY)) strategist.applyStrategy(HOLIDAY_SPIRIT_STRATEGY)
            } else if (target.type === "grinch") {
                if (strategist.hasStrategy(HOLIDAY_SPIRIT_STRATEGY)) strategist.removeStrategy(HOLIDAY_SPIRIT_STRATEGY)
                if (strategist.hasStrategy(TORTOISE_MOVE_STRATEGY)) strategist.removeStrategy(TORTOISE_MOVE_STRATEGY)
                if (strategist.hasStrategy(SNOWMAN_MOVE_STRATEGY)) strategist.removeStrategy(SNOWMAN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(GRINCH_MOVE_STRATEGY)) strategist.applyStrategy(GRINCH_MOVE_STRATEGY)
            } else if (target.type === "snowman") {
                if (strategist.hasStrategy(HOLIDAY_SPIRIT_STRATEGY)) strategist.removeStrategy(HOLIDAY_SPIRIT_STRATEGY)
                if (strategist.hasStrategy(TORTOISE_MOVE_STRATEGY)) strategist.removeStrategy(TORTOISE_MOVE_STRATEGY)
                if (strategist.hasStrategy(GRINCH_MOVE_STRATEGY)) strategist.removeStrategy(GRINCH_MOVE_STRATEGY)
                if (!strategist.hasStrategy(SNOWMAN_MOVE_STRATEGY)) strategist.applyStrategy(SNOWMAN_MOVE_STRATEGY)
            } else if (target.type === CHRISTMAS_IDLE_MONSTER) {
                if (strategist.hasStrategy(HOLIDAY_SPIRIT_STRATEGY)) strategist.removeStrategy(HOLIDAY_SPIRIT_STRATEGY)
                if (strategist.hasStrategy(GRINCH_MOVE_STRATEGY)) strategist.removeStrategy(GRINCH_MOVE_STRATEGY)
                if (strategist.hasStrategy(SNOWMAN_MOVE_STRATEGY)) strategist.removeStrategy(SNOWMAN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(TORTOISE_MOVE_STRATEGY)) strategist.applyStrategy(TORTOISE_MOVE_STRATEGY)
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(() => void logicLoop(), timeoutMs)
    }
}
void logicLoop()
