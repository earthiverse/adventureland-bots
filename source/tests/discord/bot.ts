import AL from "alclient"
import { Client, IntentsBitField } from "discord.js"
import fs from "fs"
import interactionCreate from "./interactionCreate.js"
import ready from "./listeners/ready.js"

const credentials = JSON.parse(fs.readFileSync("../../../credentials.json", "utf-8"))
await AL.Game.getGData(true, false)
await AL.Game.loginJSONFile("../../../credentials.json")

console.log("Bot is starting...")

const client = new Client({
    intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages, IntentsBitField.Flags.MessageContent]
})

ready(client)
interactionCreate(client)

client.login(credentials.discord.auth)