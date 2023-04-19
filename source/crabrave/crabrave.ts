import AL, { CharacterType, ItemName, Mage, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { ChargeStrategy } from "../strategy_pattern/strategies/charge.js"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { ElixirStrategy } from "../strategy_pattern/strategies/elixir.js"
import { OptimizeItemsStrategy } from "../strategy_pattern/strategies/item.js"
import { MagiportOthersSmartMovingToUsStrategy } from "../strategy_pattern/strategies/magiport.js"
import { RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { PartyHealStrategy } from "../strategy_pattern/strategies/partyheal.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"

import bodyParser from "body-parser"
import cors from "cors"
import express from "express"
import path from "path"
import { body, validationResult } from "express-validator"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategy_pattern/strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategy_pattern/strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategy_pattern/strategies/attack_warrior.js"
import { GetHolidaySpiritStrategy, GetReplenishablesStrategy, ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { MoveToBankAndDepositStuffStrategy } from "../strategy_pattern/strategies/bank.js"
import { getMsToNextMinute } from "../base/general.js"
import { BaseAttackStrategy } from "../strategy_pattern/strategies/attack.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G, { cheat: true })

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []
const MAX_CHARS = 9
const PARTY_LEADER = "earthMer"
const SERVER_REGION: ServerRegion = "US"
const SERVER_IDENTIFIER: ServerIdentifier = "I"
const REPLENISHABLES = new Map<ItemName, number>([
    ["hpot1", 2500],
    ["mpot1", 2500],
])

const avoidStackingStrategy = new AvoidStackingStrategy()
const bankStrategy = new MoveToBankAndDepositStuffStrategy({ map: "bank" })
const baseStrategy = new BaseStrategy(CONTEXTS)
const buyStrategy = new BuyStrategy({
    contexts: CONTEXTS,
    buyMap: undefined,
    replenishables: REPLENISHABLES
})
const chargeStrategy = new ChargeStrategy()
const elixirStrategy = new ElixirStrategy("elixirluck")
const getHolidaySpiritStrategy = new GetHolidaySpiritStrategy()
const getReplenishablesStrategy = new GetReplenishablesStrategy({
    contexts: CONTEXTS,
    replenishables: REPLENISHABLES
})
const itemStrategy = new OptimizeItemsStrategy({ contexts: CONTEXTS })
const magiportStrategy = new MagiportOthersSmartMovingToUsStrategy(CONTEXTS)
const moveStrategy = new ImprovedMoveStrategy("crab")
const partyHealStrategy = new PartyHealStrategy(CONTEXTS)
const partyRequestStrategy = new RequestPartyStrategy(PARTY_LEADER)
const respawnStrategy = new RespawnStrategy()
const rspeedStrategy = new GiveRogueSpeedStrategy()
const sellStrategy = new SellStrategy({
    sellMap: new Map<ItemName, [number, number][]>([
        ["cclaw", undefined],
        ["crabclaw", undefined],
        ["ringsj", undefined],
        ["hpamulet", undefined],
        ["hpbelt", undefined],
        ["wcap", undefined],
        ["wshoes", undefined],
    ])
})

class DisconnectOnCommandStrategy implements Strategy<PingCompensatedCharacter> {
    private onCodeEval: (data: string) => Promise<void>

    public onApply(bot: PingCompensatedCharacter) {
        this.onCodeEval = async (data: string) => {
            data = data.toLowerCase()
            if (data == "stop" || data == "disconnect") {
                stopRaving(bot.characterID).catch(console.error)
            }
        }

        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: PingCompensatedCharacter) {
        if (this.onCodeEval) bot.socket.removeListener("code_eval", this.onCodeEval)
    }
}
const disconnectOnCommandStrategy = new DisconnectOnCommandStrategy()

async function startShared(context: Strategist<PingCompensatedCharacter>, attackStrategy: BaseAttackStrategy<PingCompensatedCharacter>) {
    context.applyStrategy(partyRequestStrategy)

    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(elixirStrategy)
    context.applyStrategy(itemStrategy)

    let lastMoveStrategy: Strategy<PingCompensatedCharacter>
    let lastAttackStrategy: Strategy<PingCompensatedCharacter>
    const logicLoop = async () => {
        try {
            if (!context.isReady() || !context.bot.ready || context.bot.rip) {
                setTimeout(async () => { logicLoop() }, 1000)
                return // Not ready
            }
            if (context.bot.S.holidayseason && !context.bot.s.holidayspirit) {
                if (moveStrategy) {
                    context.removeStrategy(moveStrategy)
                    lastMoveStrategy = undefined
                }
                context.applyStrategy(getHolidaySpiritStrategy)
                setTimeout(async () => { logicLoop() }, 1000)
                return
            }
            if (context.hasStrategy(getHolidaySpiritStrategy)) context.removeStrategy(getHolidaySpiritStrategy)

            if (context.bot.ctype !== "merchant" && context.bot.esize == 0) {
                // We're full, go deposit items in the bank
                if (attackStrategy) {
                    context.removeStrategy(attackStrategy)
                    lastAttackStrategy = undefined
                }
                if (moveStrategy) {
                    context.removeStrategy(moveStrategy)
                    lastMoveStrategy = undefined
                }

                context.applyStrategy(bankStrategy)
                setTimeout(async () => { logicLoop() }, getMsToNextMinute() + 60_000)
                return
            }
            if (context.hasStrategy(bankStrategy)) context.removeStrategy(bankStrategy)

            // Check if we need to go get replenishables
            for (const [item, numHold] of REPLENISHABLES) {
                const numHas = context.bot.countItem(item, context.bot.items)
                if (numHas > (numHold / 4)) continue // We have more 25% of the amount we want
                const numWant = numHold - numHas
                if (!context.bot.canBuy(item, { ignoreLocation: true, quantity: numWant })) continue // We can't buy enough, don't go to buy them

                if (attackStrategy) {
                    context.removeStrategy(attackStrategy)
                    lastAttackStrategy = undefined
                }
                if (moveStrategy) {
                    context.removeStrategy(moveStrategy)
                    lastMoveStrategy = undefined
                }

                context.applyStrategy(getReplenishablesStrategy)
                setTimeout(async () => { logicLoop() }, 1000)
                return
            }
            if (context.hasStrategy(getReplenishablesStrategy)) context.removeStrategy(getReplenishablesStrategy)

            // Defaults
            if (moveStrategy && moveStrategy !== lastMoveStrategy) {
                context.applyStrategy(moveStrategy)
                lastMoveStrategy = moveStrategy
            }
            if (attackStrategy && attackStrategy !== lastAttackStrategy) {
                context.applyStrategy(attackStrategy)
                lastAttackStrategy = attackStrategy
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { logicLoop() }, 1000)
    }
    logicLoop()

    context.applyStrategy(disconnectOnCommandStrategy)

    CONTEXTS.push(context)
}

async function startMage(context: Strategist<Mage>) {
    startShared(context, new MageAttackStrategy({ contexts: CONTEXTS, type: "crab" }))
    context.applyStrategy(magiportStrategy)
}

async function startPaladin(context: Strategist<Paladin>) {
    startShared(context, new PaladinAttackStrategy({ contexts: CONTEXTS, type: "crab" }))
}

async function startPriest(context: Strategist<Priest>) {
    startShared(context, new PriestAttackStrategy({ contexts: CONTEXTS, disableCurse: true, type: "crab" }))
    context.applyStrategy(partyHealStrategy)
}

async function startRanger(context: Strategist<Ranger>) {
    startShared(context, new RangerAttackStrategy({ contexts: CONTEXTS, disableHuntersMark: true, type: "crab" }))
}

async function startRogue(context: Strategist<Rogue>) {
    startShared(context, new RogueAttackStrategy({ contexts: CONTEXTS, type: "crab" }))
    context.applyStrategy(rspeedStrategy)
}

// Warrior setup
async function startWarrior(context: Strategist<Warrior>) {
    startShared(context, new WarriorAttackStrategy({ contexts: CONTEXTS, disableAgitate: true, type: "crab" }))
    context.applyStrategy(chargeStrategy)
}

const stopRaving = async (characterID: string) => {
    let context: Strategist<PingCompensatedCharacter>
    for (const find of CONTEXTS) {
        if (find.bot.characterID !== characterID) continue
        context = find
        break
    }

    if (!context) return // Couldn't find context

    const publicIndex = CONTEXTS.indexOf(context)
    context.stop()
    CONTEXTS.splice(publicIndex, 1)
}

const startRaving = async (type: CharacterType, userID: string, userAuth: string, characterID: string, attemptNum = 0) => {
    // Remove stopped contexts
    for (let i = 0; i < CONTEXTS.length; i++) {
        const context = CONTEXTS[i]
        if (context.isStopped() && context.bot.characterID) {
            await stopRaving(context.bot.characterID)
            i -= 1
        }
    }

    // Checks
    if (CONTEXTS.length >= MAX_CHARS) throw `Too many characters are already running (We only support ${MAX_CHARS} characters)`
    for (const context of CONTEXTS) {
        const character = context.bot
        if (character.characterID == characterID) throw `There is a character with the ID '${characterID}' (${character.id}) already running. Stop the character first to change its settings.`
    }

    let bot: PingCompensatedCharacter
    try {
        switch (type) {
            case "mage": {
                bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_IDENTIFIER])
                break
            }
            case "paladin": {
                bot = new AL.Paladin(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_IDENTIFIER])
                break
            }
            case "priest": {
                bot = new AL.Priest(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_IDENTIFIER])
                break
            }
            case "ranger": {
                bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_IDENTIFIER])
                break
            }
            case "rogue": {
                bot = new AL.Rogue(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_IDENTIFIER])
                break
            }
            case "warrior": {
                bot = new AL.Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_IDENTIFIER])
                break
            }
            default: {
                throw new Error(`Unsupported character type: ${type}`)
            }
        }
        await bot.connect()
    } catch (e) {
        if (bot) bot.disconnect()
        console.error(e)
        if (/nouser/.test(e)) {
            throw new Error(`Authorization failed for ${characterID}!`)
        }
        attemptNum += 1
        if (attemptNum < 2) {
            setTimeout(startRaving, 1_000, type, userID, userAuth, characterID, attemptNum)
        } else {
            throw new Error(`Failed starting ${characterID}!`)
        }
        return
    }

    let context: Strategist<PingCompensatedCharacter>
    switch (type) {
        case "mage": {
            context = new Strategist<Mage>(bot as Mage, baseStrategy)
            startMage(context as Strategist<Mage>).catch(console.error)
            break
        }
        case "paladin": {
            context = new Strategist<Paladin>(bot as Paladin, baseStrategy)
            startPaladin(context as Strategist<Paladin>).catch(console.error)
            break
        }
        case "priest": {
            context = new Strategist<Priest>(bot as Priest, baseStrategy)
            startPriest(context as Strategist<Priest>).catch(console.error)
            break
        }
        case "ranger": {
            context = new Strategist<Ranger>(bot as Ranger, baseStrategy)
            startRanger(context as Strategist<Ranger>).catch(console.error)
            break
        }
        case "rogue": {
            context = new Strategist<Rogue>(bot as Rogue, baseStrategy)
            startRogue(context as Strategist<Rogue>).catch(console.error)
            break
        }
        case "warrior": {
            context = new Strategist<Warrior>(bot as Warrior, baseStrategy)
            startWarrior(context as Strategist<Warrior>).catch(console.error)
            break
        }
    }
}

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
const port = 80

app.get("/", (_req, res) => { res.sendFile(path.join(path.resolve(), "/index.html")) })
app.get("/m5x7.ttf", (_req, res) => { res.sendFile(path.join(path.resolve(), "/m5x7.ttf")) })

app.post("/",
    body("user").trim().isLength({ max: 16, min: 16 }).withMessage("User IDs are exactly 16 digits."),
    body("user").trim().isNumeric().withMessage("User IDs are numeric."),
    body("auth").trim().isLength({ max: 21, min: 21 }).withMessage("Auth codes are exactly 21 characters."),
    body("auth").trim().isAlphanumeric("en-US", { ignore: /\s/ }).withMessage("Auth codes are alphanumeric."),
    body("char").trim().isLength({ max: 16, min: 16 }).withMessage("Character IDs are exactly 16 digits."),
    body("char").trim().isNumeric().withMessage("Character IDs are numeric."),
    body("char_type").trim().matches(/\b(?:mage|paladin|priest|ranger|rogue|warrior)\b/).withMessage("Character type not supported."),
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        try {
            const charType = req.body.char_type.trim()
            const userID = req.body.user.trim()
            const userAuth = req.body.auth.trim()
            const characterID = req.body.char.trim()

            startRaving(charType, userID, userAuth, characterID)
            return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
        } catch (e) {
            return res.status(500).send(e)
        }
    })

app.listen(port, async () => {
    console.log(`Ready on port ${port}!`)
})