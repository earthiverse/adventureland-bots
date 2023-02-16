import { Client } from "discord.js"
import { Commands } from "../commands.js"

export default (client: Client): void => {
    client.on("ready", async () => {
        if (!client.user || !client.application) {
            return
        }

        await client.application.commands.set(Commands)

        console.log(`${client.user.username} is online`)
        console.log(`We have ${Commands.length} commands!`)
    })
}