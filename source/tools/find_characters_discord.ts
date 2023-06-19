import AL from "alclient"
import axios from "axios"
import { Client, TextChannel } from "discord.js"
import fs from "fs"
import { getOwner, getPlayerInfo } from "./find.js"

const CREDENTIALS = JSON.parse(fs.readFileSync("../../credentials.json", "utf-8"))
const NEW_PLAYERS_CHANNEL_ID = "839163123499794481"
const JOIN_MESSAGE_REGEX = /([a-zA-Z0-9_]+?) joined Adventure Land! \[([A-Z]+) (.+?)\]/

console.log("Connecting to AL & Database...")
await AL.Game.loginJSONFile("../../credentials.json")

// Connect to Discord
console.log("Connecting to Discord...")
const client = new Client({
    intents: []
})
await client.login(CREDENTIALS.discord.auth)

// Get the new players channel
const channel = (await client.channels.fetch(NEW_PLAYERS_CHANNEL_ID)) as TextChannel

// Create message pointer
let message = await channel.messages
    .fetch({ limit: 1 })
    .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

while (message) {
    const messagePage = await channel.messages.fetch({ limit: 100, before: message.id })

    for (const [id, msg] of messagePage) {
        const match = JOIN_MESSAGE_REGEX.exec(msg.content)

        if (!match) {
            console.log("Couldn't parse:", msg.content)
            continue
        }

        const player = match[1]
        const serverName = match[2]
        const serverIdentifier = match[3]

        console.log(`Researching ${player}...`)
        const data = await axios.get(`http://adventure.land/player/${player}`)
        const playerData = getPlayerInfo(data)

        if (playerData.length === 0) {
            console.log('!', player, serverName, serverIdentifier, "deleted!")

            const old = await AL.PlayerModel.findOne({ name: player })
            if (old && old.owner) {
                const others = await AL.PlayerModel.find({ owner: old.owner })
                const names = []
                for (const other of others) {
                    names.push(other.name)
                }
                console.log("  also associated with:", names.join(', '), `(${names.length})`)
            }

            continue
        }

        const owner = getOwner(data)
        if (!owner) {
            console.log(`${player} is private!`)
            console.log('!', player, serverName, serverIdentifier, "private!")
        }

        const names = []
        for (const playerInfo of playerData) {
            names.push(playerInfo.name)
            if (owner) playerInfo['owner'] = owner
            const result = await AL.PlayerModel.updateOne({
                name: playerInfo.name
            }, playerInfo, { upsert: true }).exec()
        }

        console.log(player, '->', names.join(', '), `(${names.length})`)
    }

    // Update our message pointer to be the last message on the page of messages
    message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
}