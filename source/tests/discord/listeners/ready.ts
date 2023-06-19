import AL from "alclient"
import axios from "axios"
import { Client } from "discord.js"
import { Commands } from "../commands.js"
import { getOwner, getPlayerInfo } from "../../../tools/find.js"

export default (client: Client): void => {
    client.on("ready", async () => {
        if (!client.user || !client.application) {
            return
        }

        await client.application.commands.set(Commands)

        console.log(`${client.user.username} is online`)
        console.log(`We have ${Commands.length} commands!`)
    })

    const JOIN_MESSAGE_REGEX = /([a-zA-Z0-9_]+?) joined Adventure Land! \[([A-Z]+) (.+?)\]/

    client.on('messageCreate', async (message) => {
        switch (message.channelId) {
            case '839163123499794481':
                // #new_players
                const match = JOIN_MESSAGE_REGEX.exec(message.content)

                if (!match[0]) {
                    console.warn("Couldn't parse new_players message:", message.content)
                    return
                }

                const player = match[1]
                const serverName = match[2]
                const serverIdentifier = match[3]

                console.log(`Researching new player: ${player} (${serverName} ${serverIdentifier})...`)
                const data = await axios.get(`http://adventure.land/player/${player}`)
                const playerData = getPlayerInfo(data)
                const owner = getOwner(data)

                for (const playerInfo of playerData) {
                    if (owner) {
                        playerInfo['owner'] = owner
                        console.log(`  Associated ${player} with ${owner}!`)
                    } else {
                        console.warn(`  Could not associate ${player} with an owner!`)
                    }
                    await AL.PlayerModel.updateOne({
                        name: playerInfo.name
                    }, playerInfo, { upsert: true }).exec()
                }
                break
            case '404333059018719233':
                // #game_events
                // TODO: Parse messages like `earthMer received a Fiery Throwing Stars`
                break
        }
    })
}