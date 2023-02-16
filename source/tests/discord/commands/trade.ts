import AL, { ItemName } from "alclient"
import { CommandInteraction, Client, ApplicationCommandType, ApplicationCommandOptionType, AutocompleteInteraction } from "discord.js"
import { Command } from "../command.js"

// TODO: How do I type this for autocomplete?
export const Trade: Command & { autocomplete: (client: Client, interaction: AutocompleteInteraction) => void } = {
    name: "trade",
    description: "Returns details about trades for an item (Data from https://aldata.earthiverse.ca)",
    options: [
        {
            autocomplete: true,
            description: "Item Name",
            name: "item",
            required: true,
            type: ApplicationCommandOptionType.String
        }
    ],
    type: ApplicationCommandType.ChatInput,
    autocomplete: async (client: Client, interaction: AutocompleteInteraction) => {
        const G = await AL.Game.getGData()
        const filtered = Object.keys(G.items).filter(itemName => itemName.startsWith(interaction.options.getFocused()))
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })).splice(0, 25),
        )
    },
    run: async (client: Client, interaction: CommandInteraction) => {
        const G = await AL.Game.getGData()

        const item = interaction.options.get("item").value
        console.log(item)

        const gItem = G.items[item as ItemName]
        if (!gItem) {
            return interaction.followUp({
                ephemeral: true,
                content: `I couldn't find \`${item}\` in G (v${G.version}) 🤔`
            })
        }

        try {
            const getData = await fetch("https://aldata.earthiverse.ca/merchants/")

            if (getData.status === 200) {
                const data = await getData.json()
                const parsedData = []
                for (const player of data) {
                    if (Date.now() - Date.parse(player.lastSeen) > 8.64e+7) continue // Haven't seen in a day
                    let buying: boolean
                    let price: number
                    let q: number
                    for (const slotName in player.slots) {
                        const slot = player.slots[slotName]
                        if (slot.name == item) {
                            buying = slot.b ?? false
                            price = slot.price
                            q = slot.q
                            break
                        }
                    }
                    if (buying === undefined) continue // They don't have the item we're looking for

                    // Found a player with the item!
                    parsedData.push({
                        id: player.id,
                        serverIdentifier: player.serverIdentifier,
                        serverRegion: player.serverRegion,
                        buying: buying,
                        price: price,
                        q: q
                    })
                }

                if (parsedData.length === 0) {
                    return await interaction.followUp({
                        ephemeral: true,
                        content: `I couldn't find anyone trading \`${item}\` 🥲`
                    })
                }

                let content = `I found the following players trading \`${item}\` 🙂\n\`\`\``
                for (const datum of parsedData) {
                    content += "\n"
                    if (datum.buying) {
                        if (datum.q) {
                            content += `${datum.id} (${datum.serverRegion} ${datum.serverIdentifier}) is buying ${datum.q} @ ${datum.price}`
                        } else {
                            content += `${datum.id} (${datum.serverRegion} ${datum.serverIdentifier}) is buying @ ${datum.price}`
                        }
                    } else {
                        if (datum.q) {
                            content += `${datum.id} (${datum.serverRegion} ${datum.serverIdentifier}) is selling ${datum.q} @ ${datum.price}`
                        } else {
                            content += `${datum.id} (${datum.serverRegion} ${datum.serverIdentifier}) is selling @ ${datum.price}`
                        }
                    }
                }
                content += "```"
                content += `\nThe base price, according to G, is \`${gItem.g}\`.`

                await interaction.followUp({
                    ephemeral: true,
                    content: content
                })
            }
        } catch (e) {
            console.error(e)

            return await interaction.followUp({
                ephemeral: true,
                content: `Sorry, I had an error finding data for \`${item}\`. 😥`
            })
        }
    }
}
