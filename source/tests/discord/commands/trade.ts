import { CommandInteraction, Client, ApplicationCommandType, ApplicationCommandOptionType } from "discord.js"
import { Command } from "../command.js"

export const Trade: Command = {
    name: "trade",
    description: "Returns details about trades for an item (Data from https://aldata.earthiverse.ca)",
    options: [
        {
            description: "Item Name",
            name: "item",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ],
    type: ApplicationCommandType.ChatInput,
    run: async (client: Client, interaction: CommandInteraction) => {
        const item = interaction.options.get("item").value
        console.log(item)

        try {
            const getData = await fetch("https://aldata.earthiverse.ca/merchants/")

            if (getData.status === 200) {
                const data = await getData.json()
                const parsedData = []
                for (const player of data) {
                    if (Date.now() - Date.parse(player.lastSeen) > 8.64e+7) continue // Haven't seen in a day
                    let buying: boolean
                    let price: number
                    for (const slotName in player.slots) {
                        const slot = player.slots[slotName]
                        if (slot.name == item) {
                            buying = slot.b ?? false
                            price = slot.price
                            break
                        }
                    }
                    if (buying === undefined) continue // They don't have the item we're looking for

                    // Found a player with the item!
                    parsedData.push({
                        id: player.id,
                        buying: buying,
                        price: price
                    })
                }

                if (parsedData.length === 0) {
                    await interaction.followUp({
                        ephemeral: true,
                        content: `I couldn't find anyone trading \`${item}\` 🥲`
                    })
                    return
                }

                let content = `I found the following players trading \`${item}\` 🙂\n\`\`\``
                for (const datum of parsedData) {
                    content += "\n"
                    if (datum.buying) {
                        content += `${datum.id} is buying for ${datum.price}`
                    } else {
                        content += `${datum.id} is selling for ${datum.price}`
                    }
                }
                content += "```"

                await interaction.followUp({
                    ephemeral: true,
                    content: content
                })
            }
        } catch (e) {
            console.error(e)

            await interaction.followUp({
                ephemeral: true,
                content: `Sorry, I had an error finding data for \`${item}\`. 😥`
            })
        }
    }
}
