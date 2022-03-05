import express from "express"
import path from "path"
import bodyParser from "body-parser"
import { body, validationResult } from "express-validator"

import AL, { Character } from "alclient"
import { startSharedMage as startCrabMage, startSharedRanger as startCrabRanger } from "../crabs/runners.js"

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
            if (req.body.char_type == "ranger") {
                const ranger = new AL.Ranger(req.body.user, req.body.auth, req.body.char, AL.Game.G, AL.Game.servers["US"]["I"])
                await ranger.connect()
                ranger.socket.on("disconnect", () => {
                    delete online[req.body.char]
                    const index = friends.indexOf(ranger)
                    if (index !== -1) friends.splice(index, 1)
                })
                online[req.body.char] = ranger
                friends.push(ranger)
                if (req.body.monster == "crab") {
                    startCrabRanger(ranger, friends)
                    return res.status(200).send("Go to https://adventure.land/comm to observer your character.")
                }
            }
            if (req.body.char_type == "mage") {
                const mage = new AL.Mage(req.body.user, req.body.auth, req.body.char, AL.Game.G, AL.Game.servers["US"]["I"])
                await mage.connect()
                mage.socket.on("disconnect", () => {
                    delete online[req.body.char]
                    const index = friends.indexOf(mage)
                    if (index !== -1) friends.splice(index, 1)
                })
                online[req.body.char] = mage
                friends.push(mage)
                if (req.body.monster == "crab") {
                    startCrabMage(mage, friends)
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