import express from "express"
import path from "path"
import bodyParser from "body-parser"
import { body, validationResult } from "express-validator"

import AL, { Character, CharacterType, ItemName, Ranger } from "alclient"
import { startLulzCrabMage, startLulzCrabRanger, startLulzCrabWarrior } from "./crabs.js"
import { ItemLevelInfo } from "../definitions/bot.js"
import { startLulzBeeMage, startLulzBeeRanger, startLulzBeeWarrior } from "./bees.js"
import { startLulzGooMage, startLulzGooRanger, startLulzGooWarrior } from "./goos.js"

const MAX_CHARACTERS = 8

const app = express()
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))
const port = 80

app.get("/", (_req, res) => {
    res.sendFile(path.join(path.resolve(), "/index.html"))
})

const online: { [T in string]?: Character } = {}
const friends: Character[] = []
function rebuildFriends() {
    friends.splice(0, friends.length)
    for (const char in online) friends.push(online[char])
}
const replenishables: [ItemName, number][] = [["hpot1", 2500], ["mpot1", 2500]]
const itemsToSell: ItemLevelInfo = {
    beewings: 1,
    cclaw: 1,
    crabclaw: 1,
    gslime: 1,
    gstaff: 1,
    hpamulet: 1,
    hpbelt: 1,
    ringsj: 1,
    stinger: 1,
    wcap: 1,
    wshoes: 1
}

const startCharacterLoop = async (type: CharacterType, userID: string, userAuth: string, characterID: string, script: (bot: Character, friends: Character[], replenishables: [ItemName, number][], itemsToSell: ItemLevelInfo) => Promise<void>) => {
    const loopBot = async () => {
        try {
            let bot = online[characterID]
            if (bot) bot.disconnect()
            switch (type) {
                case "mage":
                    bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
                    break
                case "paladin":
                    bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
                    break
                case "priest":
                    bot = new AL.Priest(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
                    break
                case "ranger":
                    bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
                    break
                case "rogue":
                    bot = new AL.Rogue(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
                    break
                case "warrior":
                    bot = new AL.Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
                    break
                default:
                    throw `Unsupported character type: ${type}`
            }
            await bot.connect()

            online[characterID] = bot

            // Rebuild friends
            rebuildFriends()

            online[characterID] = bot
            await script(bot, friends, replenishables, itemsToSell)
            bot.socket.on("disconnect", async () => {
                if (online[characterID]) loopBot()
            })
            bot.socket.on("code_eval", (data) => {
                if (data == "stop" || data == "disconnect") {
                    delete online[characterID]
                    rebuildFriends()
                    bot.disconnect()
                }
            })
        } catch (e) {
            console.error(e)
            const bot = online[characterID] as Ranger
            if (bot) bot.disconnect()
            const wait = /wait_(\d+)_second/.exec(e)
            if (wait && wait[1]) {
                setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
            } else if (/limits/.test(e)) {
                setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
            } else if (/ingame/.test(e)) {
                setTimeout(async () => { loopBot() }, 500)
            } else {
                setTimeout(async () => { loopBot() }, 10000)
            }
        }
    }
    loopBot()
}

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

        if (online[req.body.char]) {
            return res.status(200).send(`There is a character with the ID '${req.body.char}' already running. Stop the character first to change its settings.`)
        }

        if (Object.keys(online).length > MAX_CHARACTERS) {
            return res.status(400).send(`We're already running ${MAX_CHARACTERS} characters.`)
        }

        try {
            const charType = req.body.char_type
            const monster = req.body.monster
            if (charType == "mage") {
                if (monster == "bee") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzBeeMage)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                } else if (monster == "crab") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzCrabMage)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                } else if (monster == "goo") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzGooMage)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                }
            } else if (charType == "ranger") {
                if (monster == "bee") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzBeeRanger)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                } else if (monster == "crab") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzCrabRanger)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                } else if (monster == "goo") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzGooRanger)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                }
            } else if (charType == "warrior") {
                if (monster == "bee") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzBeeWarrior)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                } else if (monster == "crab") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzCrabWarrior)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                } else if (monster == "goo") {
                    await startCharacterLoop(charType, req.body.user, req.body.auth, req.body.char, startLulzGooWarrior)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                }
            }
        } catch (e) {
            return res.status(500).send(e)
        }

        return res.status(500).send("Something went wrong, your character probably didn't start. Check https://adventure.land/comm to confirm.")
    })

app.listen(port, async () => {
    console.log("Preparing...")
    await AL.Game.loginJSONFile("../../credentials.json")
    await AL.Game.getGData(true, false)
    await AL.Pathfinder.prepare(AL.Game.G)

    console.log(`Ready on port ${port}!`)
})