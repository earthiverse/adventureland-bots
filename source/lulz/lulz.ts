import express from "express"
import path from "path"
import bodyParser from "body-parser"
import { body, validationResult } from "express-validator"

import AL from "alclient"
import { startLulzCharacter } from "../strategy_pattern/lulz.js"

const app = express()
app.use(express.json())
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
            if (["mage", "ranger", "warrior"].includes(charType)) {
                if (["bee", "crab", "goo"].includes(monster)) {
                    startLulzCharacter(charType, req.body.user, req.body.auth, req.body.char, [monster])
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