import express from "express"
import path from "path"
import bodyParser from "body-parser"
import cors from "cors"
import { body, validationResult } from "express-validator"

import AL, { Character, CharacterType, ItemName, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { addSocket, startServer } from "algui"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseAttackStrategy } from "../strategy_pattern/strategies/attack.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { AvoidStackingStrategy } from "../strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { SellStrategy } from "../strategy_pattern/strategies/sell.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"

// Login and get GData
await AL.Game.loginJSONFile("../../credentials.json")
await AL.Game.getGData(true, false)
await AL.Pathfinder.prepare(AL.Game.G)
await startServer(8080, AL.Game.G)

const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "I"

export const MAX_CHARACTERS = 8
const CHARACTERS: PingCompensatedCharacter[] = []
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

export class DisconnectOnCommandStrategy implements Strategy<Character> {
    private onCodeEval: (data: string) => Promise<void>

    public onApply(bot: Character) {
        this.onCodeEval = async (data: string) => {
            if (data == "stop" || data == "disconnect") {
                stopLulzCharacter(bot.characterID).catch(console.error)
            }
        }

        bot.socket.on("code_eval", this.onCodeEval)
    }

    public onRemove(bot: Character) {
        bot.socket.removeListener("code_eval", this.onCodeEval)
    }
}

// Strategies
const baseStrategy = new BaseStrategy(CHARACTERS)
const trackerStrategy = new TrackerStrategy()
const disconnectStrategy = new DisconnectOnCommandStrategy()
const avoidStackingStrategy = new AvoidStackingStrategy()
const partyStrategy = new RequestPartyStrategy("earthMer")
const respawnStrategy = new RespawnStrategy()
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
        ["shield", undefined],
        ["sshield", undefined],
        ["stinger", undefined],
        ["wcap", undefined],
        ["wshoes", undefined],
    ])
})

export async function startLulzCharacter(type: CharacterType, userID: string, userAuth: string, characterID: string, monsters: MonsterName[]) {
    if (CHARACTERS.length >= MAX_CHARACTERS) throw `Too many characters are already running (We only support ${MAX_CHARACTERS} characters simultaneously)`
    for (const character of CHARACTERS) {
        if (character.characterID == characterID) throw `There is a character with the ID '${characterID}' (${character.id}) already running. Stop the character first to change its settings.`
    }

    let bot: PingCompensatedCharacter
    switch (type) {
        case "mage": {
            bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "paladin": {
            bot = new AL.Paladin(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "priest": {
            bot = new AL.Priest(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "ranger": {
            bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "rogue": {
            bot = new AL.Rogue(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
        case "warrior": {
            bot = new AL.Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
            break
        }
    }
    await bot.connect()
    CHARACTERS.push(bot)

    addSocket(bot.id, bot.socket)

    const context = new Strategist(bot, baseStrategy)
    CONTEXTS.push(context)

    context.applyStrategy(disconnectStrategy)

    switch (type) {
        case "mage": {
            context.applyStrategy(new MageAttackStrategy({ characters: CHARACTERS, typeList: monsters }))
            break
        }
        case "ranger": {
            context.applyStrategy(new RangerAttackStrategy({ characters: CHARACTERS, typeList: monsters }))
            break
        }
        default: {
            context.applyStrategy(new BaseAttackStrategy({ characters: CHARACTERS, typeList: monsters }))
            break
        }
    }

    const moveStrategy = new ImprovedMoveStrategy(monsters)
    context.applyStrategy(moveStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(buyStrategy)
    context.applyStrategy(sellStrategy)
    context.applyStrategy(partyStrategy)

    setInterval(async () => {
        // TODO: Move this to a move strategy
        try {
            if (bot.smartMoving) return
            if ((!bot.hasItem("hpot1") || !bot.hasItem("mpot1")) && bot.gold > (AL.Game.G.items.mpot1.g * 100) || bot.isFull()) {
                // Go get potions
                context.removeStrategy(moveStrategy)

                await bot.smartMove("mpot1", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE / 2 })

                let potsToBuy = Math.min(100 - bot.countItem("mpot1"), bot.gold / AL.Game.G.items.mpot1.g)
                if (potsToBuy > 0) await bot.buy("mpot1", potsToBuy)

                potsToBuy = Math.min(100 - bot.countItem("hpot1"), bot.gold / AL.Game.G.items.hpot1.g)
                if (potsToBuy > 0) await bot.buy("hpot1", potsToBuy)
            }
        } catch (e) {
            console.error(e)
        }
        context.applyStrategy(moveStrategy)
    }, 1000)
}

export async function stopLulzCharacter(characterID: string) {
    for (let i = 0; i < CONTEXTS.length; i++) {
        const context = CONTEXTS[i]
        if (context.bot.characterID !== characterID) continue

        // Stop the context, and remove it from our contexts list
        context.stop()
        CONTEXTS.splice(i, 1)[0]
        break
    }
    for (let i = 0; i < CHARACTERS.length; i++) {
        const character = CHARACTERS[i]
        if (character.characterID !== characterID) continue

        // Remove the character from our characters list
        CHARACTERS.splice(i, 1)[0]
        break
    }
}

const app = express()
app.use(express.json())
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
const port = 80

app.get("/", (_req, res) => {
    res.sendFile(path.join(path.resolve(), "/index.html"))
})

app.post("/",
    body("user").trim().isLength({ max: 16, min: 16 }).withMessage("User IDs are exactly 16 digits."),
    body("user").trim().isNumeric().withMessage("User IDs are numeric"),
    body("auth").trim().isLength({ max: 21, min: 21 }).withMessage("Auth codes are exactly 21 characters."),
    body("auth").trim().isAlphanumeric("en-US", { ignore: /\s/ }).withMessage("Auth codes are alphanumeric."),
    body("char").trim().isLength({ max: 16, min: 16 }).withMessage("Character IDs are exactly 16 digits."),
    body("char").trim().isNumeric().withMessage("Character IDs are numeric"),
    async (req, res) => {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }

        try {
            const charType = req.body.char_type
            const monster = req.body.monster

            // Filter out unwanted match-ups
            switch (charType) {
                case "mage": {
                    const mageMonsters: MonsterName[] = ["armadillo", "bee", "crab", "goo"]
                    if (!mageMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                case "ranger": {
                    const rangerMonsters: MonsterName[] = ["armadillo", "bee", "crab", "goo"]
                    if (!rangerMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                case "warrior": {
                    const warriorMonsters: MonsterName[] = ["bee", "crab", "goo"]
                    if (!warriorMonsters.includes(monster)) {
                        return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                    }
                    break
                }
                default: {
                    return res.status(400).send(`This service doesn't currently support ${monster} for ${charType}, sorry!`)
                }
            }

            // It passed the filter, start it up
            await startLulzCharacter(charType, req.body.user, req.body.auth, req.body.char, [monster])
            return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
        } catch (e) {
            return res.status(500).send(e)
        }
        // return res.status(500).send("Something went wrong, your character probably didn't start. Check https://adventure.land/comm to confirm.")
    })

app.listen(port, async () => {
    console.log(`Ready on port ${port}!`)
})