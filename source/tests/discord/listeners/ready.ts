import AL from "alclient"
import axios from "axios"
import { Client } from "discord.js"
import { Commands } from "../commands.js"
import { getOwner, getPlayerInfo } from "../../../tools/find.js"

const JOIN_MESSAGE_REGEX = /^([a-zA-Z0-9_]+) joined Adventure Land! \[([A-Z]+) (.+?)\]/
const GAME_EVENTS_ITEM_REGEX = /^([a-zA-Z0-9_]+) (?:lost|received|found) (?:a|an) (.+?)(?:$|\+(\d+)$)/
const GAME_EVENTS_LEVEL_REGEX = /^([a-zA-Z0-9_]+) is now level (\d+)(?:!| \[([A-Z]+) (.+?)\])$/
const players = new Set<string>()
async function researchPlayer(player: string) {
    if (players.has(player)) return // Already researched

    console.log(`Researching new player: ${player}...`)
    const data = await axios.get(`http://adventure.land/player/${player}`)
    const playerData = getPlayerInfo(data)
    const owner = getOwner(data)

    for (const playerInfo of playerData) {
        if (owner) {
            playerInfo['owner'] = owner
            console.log(`  Associated ${playerInfo.name} with ${owner}!`)
        } else {
            console.warn(`  Could not associate ${player} with an owner!`)
        }
        await AL.PlayerModel.updateOne({
            name: playerInfo.name
        }, playerInfo, { upsert: true }).exec()

        players.add(playerInfo.name)
    }
}

export default (client: Client): void => {
    client.on("ready", async () => {
        if (!client.user || !client.application) {
            return
        }

        await client.application.commands.set(Commands)

        console.log(`${client.user.username} is online`)
        console.log(`We have ${Commands.length} commands!`)
    })


    client.on('messageCreate', async (message) => {
        switch (message.channelId) {
            case '839163123499794481': {
                // #new_players
                const match = JOIN_MESSAGE_REGEX.exec(message.content)
                if (match) {
                    // New player greeting
                    const player = match[1]
                    const serverRegion = match[2]
                    const serverIdentifier = match[3]
                    await researchPlayer(player).catch(console.error)
                    return
                }

                console.warn("Couldn't parse new_players message:", message.content)
            }
            case '404333059018719233': {
                // #game_events
                let match = GAME_EVENTS_ITEM_REGEX.exec(message.content)
                if (match) {
                    // Item information for a player who lost or received a "good" item
                    const player = match[1]
                    const item = match[2]
                    const level = match[3]
                    await researchPlayer(player).catch(console.error)
                    return
                }

                match = GAME_EVENTS_LEVEL_REGEX.exec(message.content)
                if (match) {
                    // Level up message for a player who's >= level 70
                    const player = match[1]
                    const level = match[2]
                    const serverRegion = match[3]
                    const serverIdentifier = match[4]
                    await researchPlayer(player).catch(console.error)
                    return
                }
            }
        }
    })
}