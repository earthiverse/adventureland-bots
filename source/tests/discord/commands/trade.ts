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
        const item = interaction.options.getFocused()
        const filtered = Object.keys(G.items)
            .filter((itemName) => {
                if (itemName.includes(item)) return true
                if (AL.Game.G.items[itemName].name.toLowerCase().includes(item.toLowerCase())) return true
            })
            .sort()
            .splice(0, 25)
            .map(choice => {
                const gName = AL.Game.G.items[choice].name
                return { name: `${choice} (${gName})`, value: choice }
            })
        await interaction.respond(
            filtered,
        )
    },
    run: async (client: Client, interaction: CommandInteraction) => {
        const G = await AL.Game.getGData()

        const item = interaction.options.get("item").value
        console.log(item)

        const gItem = G.items[item as ItemName]
        if (!gItem) {
            const content = `I couldn't find \`${item}\` in G (v${G.version}) 🤔`
            return interaction.followUp({
                ephemeral: true,
                content: content
            })
        }

        try {
            const getData = await fetch("https://aldata.earthiverse.ca/merchants/")

            if (getData.status === 200) {
                const data = await getData.json()
                const buyingDataAll = []
                const sellingDataAll = []
                for (const player of data) {
                    if (Date.now() - Date.parse(player.lastSeen) > 8.64e+7) continue // Haven't seen in a day
                    const buyingData = {
                        id: player.id,
                        price: Number.MAX_VALUE,
                        q: 0,
                        serverIdentifier: player.serverIdentifier,
                        serverRegion: player.serverRegion,
                    }
                    const sellingData = {
                        id: player.id,
                        price: 0,
                        q: 0,
                        serverIdentifier: player.serverIdentifier,
                        serverRegion: player.serverRegion,
                    }
                    for (const slotName in player.slots) {
                        const slot = player.slots[slotName]
                        if (slot.name !== item) continue

                        if (slot.b) {
                            buyingData.q += slot.q ?? 1
                            buyingData.price = Math.min(slot.price, buyingData.price)
                        } else {
                            sellingData.q += slot.q ?? 1
                            sellingData.price = Math.max(slot.price, sellingData.price)
                        }
                    }

                    if (buyingData.q) {
                        buyingDataAll.push(buyingData)
                    }
                    if (sellingData.q)
                        sellingDataAll.push(sellingData)
                }

                if (buyingDataAll.length === 0 && sellingDataAll.length === 0) {
                    return await interaction.followUp({
                        ephemeral: true,
                        content: `I couldn't find anyone trading \`${item}\` 🥲`
                    })
                }

                let content = `The base price, according to \`G\`, is \`${gItem.g}\`.`

                if (sellingDataAll.length) {
                    content += `\nI found the following players selling \`${item}\` 🙂\n\`\`\``
                    for (const d of sellingDataAll) {
                        content += `\n${d.id} (${d.serverRegion} ${d.serverIdentifier}) is selling ${d.q} @ ${d.price}`
                    }
                    content += "```"
                }

                if (buyingDataAll.length) {
                    content += `\nI found the following players buying \`${item}\` 🙂\n\`\`\``
                    for (const d of buyingDataAll) {
                        content += `\n${d.id} (${d.serverRegion} ${d.serverIdentifier}) is buying ${d.q} @ ${d.price}`
                    }
                    content += "```"
                }

                return await interaction.followUp({
                    ephemeral: true,
                    content: content
                })
            }
        } catch (e) {
            console.error(e)
        }
        return await interaction.followUp({
            ephemeral: true,
            content: `Sorry, I had an error finding data for \`${item}\`. 😥`
        })
    }
}
