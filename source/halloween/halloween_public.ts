import AL, {
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
    ServerRegion,
    Warrior,
} from "alclient"
import bodyParser from "body-parser"
import cors from "cors"
import express from "express"
import path from "path"
import { body, matchedData, validationResult } from "express-validator"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { MagiportOthersSmartMovingToUsStrategy } from "../strategy_pattern/strategies/magiport.js"
import { ChargeStrategy } from "../strategy_pattern/strategies/charge.js"
import { PartyHealStrategy } from "../strategy_pattern/strategies/partyheal.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { PaladinAttackStrategy } from "../strategy_pattern/strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { RogueAttackStrategy } from "../strategy_pattern/strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy, SpreadOutImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { halloweenGreenJr } from "../base/locations.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { AvoidDeathStrategy } from "../strategy_pattern/strategies/avoid_death.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { CombinedConfig, ItemConfig } from "../base/itemsNew.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"
import { ItemStrategy } from "../strategy_pattern/strategies/item.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"
import { NewMerchantStrategy } from "../merchant/strategy.js"
import { ToggleStandStrategy } from "../strategy_pattern/strategies/stand.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json", false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { remove_abtesting: true, remove_test: true })

/** What monster to farm while waiting */
const HALLOWEEN_IDLE_MONSTER: MonsterName = "osnake"

/** Halloween monsters, sorted by priority (high -> low) */
const HALLOWEEN_EVENT_MONSTERS: MonsterName[] = ["mrpumpkin", "mrgreen"]

/** All monsters we're farming */
const HALLOWEEN_MONSTERS: MonsterName[] = ["mrgreen", "mrpumpkin", "minimush", "osnake", "snake"]

const PARTY_LEADER = "earthPri"

const SELL: CombinedConfig = {
    sell: true,
    sellPrice: "npc",
}
const HALLOWEEN_TIEM_CONFIG: ItemConfig = {
    // Potions
    hpot1: {
        hold: true,
        replenish: 9999,
    },
    mpot1: {
        hold: true,
        replenish: 9999,
    },

    // Good items
    hdagger: {
        upgradeUntilLevel: 1,
    },

    // Amulets
    dexamulet: SELL,
    intamulet: SELL,
    stramulet: SELL,

    // Belts
    dexbelt: SELL,
    intbelt: SELL,
    strbelt: SELL,

    // Wanderers
    wbreeches: SELL,
    wgloves: SELL,

    // Other halloween items
    gphelmet: SELL,
    phelmet: SELL,
    glolipop: SELL,
    ololipop: SELL,
}

const MERCHANT_HOLD_POSITION: IPosition = { map: "halloween", x: -50, y: 0 }

let currentRegion: ServerRegion = "US"
let currentIdentifier: ServerIdentifier = "I"

type Server = `${ServerRegion}${ServerIdentifier}`
const SERVER_PRIORITY: Server[] = ["USI", "EUI", "USII", "USIII", "EUII", "ASIAI", "USPVP", "EUPVP"]

const activeStrategists: Strategist<PingCompensatedCharacter>[] = []

const ACCEPT_PARTY_REQUEST_STRATEGY = new AcceptPartyRequestStrategy()
const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy()
const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy()
const BASE_STRATEGY = new BaseStrategy(activeStrategists)
const BUY_STRATEGY = new BuyStrategy({
    contexts: activeStrategists,
    itemConfig: HALLOWEEN_TIEM_CONFIG,
})
const CHARGE_STRATEGY = new ChargeStrategy()
const ELIXIR_STRATEGY = new ElixirStrategy("elixirluck")
const GIVE_ROGUE_SPEED_STRATEGY = new GiveRogueSpeedStrategy()
const ITEM_STRATEGY = new ItemStrategy({
    contexts: activeStrategists,
    itemConfig: HALLOWEEN_TIEM_CONFIG,
})
const MAGIPORT_STRATEGY = new MagiportOthersSmartMovingToUsStrategy(activeStrategists)
const MERCHANT_STRATEGY = new NewMerchantStrategy({
    contexts: activeStrategists,
    defaultPosition: MERCHANT_HOLD_POSITION,
    goldToHold: 100_000_000,
    itemConfig: HALLOWEEN_TIEM_CONFIG,
    enableMluck: {
        contexts: true,
        self: true,
        others: true,
        travel: true,
    },
})
const PARTY_HEAL_STRATEGY = new PartyHealStrategy(activeStrategists)
const REQUEST_PARTY_STRATEGY = new RequestPartyStrategy(PARTY_LEADER)
const RESPAWN_STRATEGY = new RespawnStrategy()
const SELL_STRATEGY = new SellStrategy({
    itemConfig: HALLOWEEN_TIEM_CONFIG,
})
const TRACKER_STRATEGY = new TrackerStrategy()
const TOGGLE_STAND_STRATEGY = new ToggleStandStrategy({
    offWhenMoving: true,
    onWhenNear: [{ distance: 10, position: MERCHANT_HOLD_POSITION }],
})

const MAGE_ATTACK_STRATEGY = new MageAttackStrategy({
    contexts: activeStrategists,
    typeList: HALLOWEEN_MONSTERS,
})

const PALADIN_ATTACK_STRATEGY = new PaladinAttackStrategy({
    contexts: activeStrategists,
    typeList: HALLOWEEN_MONSTERS,
})

const PRIEST_ATTACK_STRATEGY = new PriestAttackStrategy({
    contexts: activeStrategists,
    enableHealStrangers: true,
    typeList: HALLOWEEN_MONSTERS,
})

const RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({
    contexts: activeStrategists,
    typeList: HALLOWEEN_MONSTERS,
})

const ROGUE_ATTACK_STRATEGY = new RogueAttackStrategy({
    contexts: activeStrategists,
    typeList: HALLOWEEN_MONSTERS,
})

const WARRIOR_ATTACK_STRATEGY = new WarriorAttackStrategy({
    contexts: activeStrategists,
    typeList: HALLOWEEN_MONSTERS,
})

const MRGREEN_MOVE_STRATEGY = new SpecialMonsterMoveStrategy({ contexts: activeStrategists, typeList: ["mrgreen"] })
const MRPUMPKIN_MOVE_STRATEGY = new SpecialMonsterMoveStrategy({ contexts: activeStrategists, typeList: ["mrpumpkin"] })
const OSNAKE_MOVE_STRATEGY = new SpreadOutImprovedMoveStrategy(["osnake", "snake"], { idlePosition: halloweenGreenJr })

class DisconnectOnCommandStrategy implements Strategy<PingCompensatedCharacter> {
    private onCodeEval: (data: string) => Promise<void>

    public onApply(bot: PingCompensatedCharacter) {
        // eslint-disable-next-line @typescript-eslint/require-await
        this.onCodeEval = async (data: string) => {
            data = data.toLowerCase()
            if (data == "stop" || data == "disconnect") {
                const strategistToStop = activeStrategists.find((s) => s.bot.id === bot.id)
                if (strategistToStop) {
                    // Stop and remove
                    strategistToStop.stop()
                    activeStrategists.splice(activeStrategists.indexOf(strategistToStop), 1)
                }
            }
        }

        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }
}
const DISCONNECT_ON_COMMAND_STRATEGY = new DisconnectOnCommandStrategy()

const startBot = (strategist: Strategist<PingCompensatedCharacter>) => {
    switch (strategist.bot.ctype) {
        case "mage": {
            strategist.applyStrategies([MAGIPORT_STRATEGY, MAGE_ATTACK_STRATEGY])
            break
        }
        case "merchant": {
            strategist.applyStrategies([MERCHANT_STRATEGY, TOGGLE_STAND_STRATEGY])
            break
        }
        case "paladin": {
            strategist.applyStrategies([PALADIN_ATTACK_STRATEGY])
            break
        }
        case "priest": {
            strategist.applyStrategies([PARTY_HEAL_STRATEGY, PRIEST_ATTACK_STRATEGY])
            break
        }
        case "ranger": {
            strategist.applyStrategies([RANGER_ATTACK_STRATEGY])
            break
        }
        case "rogue": {
            strategist.applyStrategies([GIVE_ROGUE_SPEED_STRATEGY, ROGUE_ATTACK_STRATEGY])
            break
        }
        case "warrior": {
            strategist.applyStrategies([CHARGE_STRATEGY, WARRIOR_ATTACK_STRATEGY])
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
        DISCONNECT_ON_COMMAND_STRATEGY,
        ELIXIR_STRATEGY,
        ITEM_STRATEGY,
        RESPAWN_STRATEGY,
        SELL_STRATEGY,
    ])

    // Strategies for attacking bots
    if (strategist.bot.ctype !== "merchant") {
        strategist.applyStrategies([REQUEST_PARTY_STRATEGY, TRACKER_STRATEGY])
    }
}

const logicLoop = async () => {
    let timeoutMs = 10_000
    try {
        const liveHalloweenMonsters = await EntityModel.find({
            type: { $in: HALLOWEEN_EVENT_MONSTERS },
        })
            .lean()
            .exec()

        // Sort monsters by priority
        liveHalloweenMonsters.sort((a, b) => {
            // Prioritize by type
            if (a.type !== b.type)
                return HALLOWEEN_EVENT_MONSTERS.indexOf(a.type) - HALLOWEEN_EVENT_MONSTERS.indexOf(b.type)

            // Prioritize lower HP
            if (a.hp !== b.hp) return a.hp - b.hp

            // Prioritize same server
            const aSameServer = a.serverIdentifier === currentIdentifier && a.serverRegion === currentRegion
            const bSameServer = b.serverIdentifier === currentIdentifier && b.serverRegion === currentRegion
            if (aSameServer && !bSameServer) return -1
            if (!aSameServer && bSameServer) return 1

            // Proritize by server
            const aServer: Server = `${a.serverRegion}${a.serverIdentifier}`
            const bServer: Server = `${b.serverRegion}${b.serverIdentifier}`
            if (aServer !== bServer) return SERVER_PRIORITY.indexOf(aServer) - SERVER_PRIORITY.indexOf(bServer)
        })

        const target =
            liveHalloweenMonsters.length === 0
                ? { serverRegion: currentRegion, serverIdentifier: currentIdentifier, type: HALLOWEEN_IDLE_MONSTER }
                : liveHalloweenMonsters[0]

        if (target.serverRegion !== currentRegion || target.serverIdentifier !== currentIdentifier) {
            // Change server
            for (const strategist of activeStrategists)
                strategist.changeServer(target.serverRegion, target.serverIdentifier).catch(console.error)

            timeoutMs = 60_000

            currentRegion = target.serverRegion
            currentIdentifier = target.serverIdentifier
            return
        }

        // Same characters, just ensure we're using the correct move strategy
        for (const strategist of activeStrategists) {
            if (target.type === "mrpumpkin") {
                if (strategist.hasStrategy(OSNAKE_MOVE_STRATEGY)) strategist.removeStrategy(OSNAKE_MOVE_STRATEGY)
                if (strategist.hasStrategy(MRGREEN_MOVE_STRATEGY)) strategist.removeStrategy(MRGREEN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(MRPUMPKIN_MOVE_STRATEGY)) strategist.applyStrategy(MRPUMPKIN_MOVE_STRATEGY)
            } else if (target.type === "mrgreen") {
                if (strategist.hasStrategy(OSNAKE_MOVE_STRATEGY)) strategist.removeStrategy(OSNAKE_MOVE_STRATEGY)
                if (strategist.hasStrategy(MRPUMPKIN_MOVE_STRATEGY)) strategist.removeStrategy(MRPUMPKIN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(MRGREEN_MOVE_STRATEGY)) strategist.applyStrategy(MRGREEN_MOVE_STRATEGY)
            } else if (target.type === HALLOWEEN_IDLE_MONSTER) {
                if (strategist.hasStrategy(MRGREEN_MOVE_STRATEGY)) strategist.removeStrategy(MRGREEN_MOVE_STRATEGY)
                if (strategist.hasStrategy(MRPUMPKIN_MOVE_STRATEGY)) strategist.removeStrategy(MRPUMPKIN_MOVE_STRATEGY)
                if (!strategist.hasStrategy(OSNAKE_MOVE_STRATEGY)) strategist.applyStrategy(OSNAKE_MOVE_STRATEGY)
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        setTimeout(() => void logicLoop(), timeoutMs)
    }
}
void logicLoop()

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
const port = 80

app.get("/", (_req, res) => {
    res.sendFile(path.join(path.resolve(), "/index.html"))
})
app.get("/m5x7.ttf", (_req, res) => {
    res.sendFile(path.join(path.resolve(), "/m5x7.ttf"))
})

app.post(
    "/",
    body("user").trim().isLength({ max: 16, min: 16 }).withMessage("User IDs are exactly 16 digits."),
    body("user").trim().isNumeric().withMessage("User IDs are numeric."),
    body("auth").trim().isLength({ max: 21, min: 21 }).withMessage("Auth codes are exactly 21 characters."),
    body("auth").trim().isAlphanumeric("en-US", { ignore: /\s/ }).withMessage("Auth codes are alphanumeric."),
    body("char").trim().isLength({ max: 16, min: 16 }).withMessage("Character IDs are exactly 16 digits."),
    body("char").trim().isNumeric().withMessage("Character IDs are numeric."),
    body("char_type")
        .trim()
        .matches(/\b(?:mage|merchant|paladin|priest|ranger|rogue|warrior)\b/)
        .withMessage("Character type not supported."),
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (req, res) => {
        const result = validationResult(req)
        if (!result.isEmpty()) {
            return res.status(400).json({ errors: result.array() })
        }

        const { char_type, auth, char, user } = matchedData(req) as {
            char_type: string
            auth: string
            char: string
            user: string
        }

        try {
            let bot: PingCompensatedCharacter
            switch (char_type) {
                case "mage": {
                    bot = new Mage(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
                case "merchant": {
                    bot = new Merchant(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
                case "paladin": {
                    bot = new Paladin(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
                case "priest": {
                    bot = new Priest(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
                case "ranger": {
                    bot = new Ranger(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
                case "rogue": {
                    bot = new Rogue(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
                case "warrior": {
                    bot = new Warrior(user, auth, char, AL.Game.G, AL.Game.servers.US.I)
                    break
                }
            }

            await bot.connect()
            const strategist = new Strategist(bot)
            startBot(strategist)
            activeStrategists.push(strategist)

            return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
        } catch (e) {
            console.error(e)
            return res.status(500).send(e)
        }
    },
)

app.listen(port, () => {
    console.log(`Ready on port ${port}!`)
})
