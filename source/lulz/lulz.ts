import express from "express"
import path from "path"
import bodyParser from "body-parser"
import { body, validationResult } from "express-validator"

import AL, { Character, ItemName, Mage, Ranger, Warrior } from "alclient"
import { startLulzMage as startCrabMage, startLulzRanger as startCrabRanger, startLulzWarrior as startCrabWarrior } from "./crabs.js"
import { ItemLevelInfo } from "../definitions/bot.js"

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
const replenishables: [ItemName, number][] = [["hpot1", 2500], ["mpot1", 2500]]
const itemsToSell: ItemLevelInfo = {
    cclaw: 1,
    crabclaw: 1,
    hpamulet: 1,
    hpbelt: 1,
    ringsj: 1,
    wcap: 1,
    wshoes: 1
}

const startRangerLoop = async (userID: string, userAuth: string, characterID: string) => {
    // Start the characters
    const loopBot = async () => {
        try {
            let bot = online[characterID] as Ranger
            if (bot) bot.disconnect()
            bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
            await bot.connect()

            // Rebuild friends
            friends.splice(0, friends.length)
            for (const char in online)friends.push(online[char])

            online[characterID] = bot
            await startCrabRanger(bot, friends, replenishables, itemsToSell)
            bot.socket.on("disconnect", async () => {
                if (online[characterID]) loopBot()
            })
            bot.socket.on("code_eval", (data) => {
                if (data == "stop" || data == "disconnect") {
                    delete online[characterID]
                    const index = friends.indexOf(bot)
                    if (index !== -1) friends.splice(index, 1)
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

const startMageLoop = async (userID: string, userAuth: string, characterID: string) => {
    // Start the characters
    const loopBot = async () => {
        try {
            let bot = online[characterID] as Mage
            if (bot) bot.disconnect()
            bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
            await bot.connect()

            // Rebuild friends
            friends.splice(0, friends.length)
            for (const char in online)friends.push(online[char])

            online[characterID] = bot
            await startCrabMage(bot, friends, replenishables, itemsToSell)
            bot.socket.on("disconnect", async () => {
                if (online[characterID]) loopBot()
            })
            bot.socket.on("code_eval", (data) => {
                if (data == "stop" || data == "disconnect") {
                    delete online[characterID]
                    const index = friends.indexOf(bot)
                    if (index !== -1) friends.splice(index, 1)
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

const startWarriorLoop = async (userID: string, userAuth: string, characterID: string) => {
    // Start the characters
    const loopBot = async () => {
        try {
            let bot = online[characterID] as Warrior
            if (bot) bot.disconnect()
            bot = new AL.Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers["US"]["I"])
            await bot.connect()

            // Rebuild friends
            friends.splice(0, friends.length)
            for (const char in online)friends.push(online[char])

            online[characterID] = bot
            await startCrabWarrior(bot, friends, replenishables, itemsToSell)
            bot.socket.on("disconnect", async () => {
                if (online[characterID]) loopBot()
            })
            bot.socket.on("code_eval", (data) => {
                if (data == "stop" || data == "disconnect") {
                    delete online[characterID]
                    const index = friends.indexOf(bot)
                    if (index !== -1) friends.splice(index, 1)
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
            return res.status(500).send(`There is a character with the ID '${req.body.char}' already running?`)
        }

        if (Object.keys(online).length > MAX_CHARACTERS) {
            return res.status(400).send(`We're already running ${MAX_CHARACTERS} characters.`)
        }

        try {
            if (req.body.char_type == "mage") {
                if (req.body.monster == "crab") {
                    startMageLoop(req.body.user, req.body.auth, req.body.char)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                }
            } else if (req.body.char_type == "ranger") {
                if (req.body.monster == "crab") {
                    startRangerLoop(req.body.user, req.body.auth, req.body.char)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                }
            } else if (req.body.char_type == "warrior") {
                if (req.body.monster == "crab") {
                    startWarriorLoop(req.body.user, req.body.auth, req.body.char)
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