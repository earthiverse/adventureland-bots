import AL from "alclient"
import { Client } from "discord.js"
import fs from "fs"
import interactionCreate from "./interactionCreate.js"
import ready from "./listeners/ready.js"

const credentials = JSON.parse(fs.readFileSync("../../../credentials.json", "utf-8"))
await AL.Game.getGData(true, false)

console.log("Bot is starting...")

const client = new Client({
    intents: []
})

ready(client)
interactionCreate(client)

client.login(credentials.discord.auth)