import AL, { ItemDataTrade, ItemName } from "alclient"
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
                const buyingData = []
                const sellingData = []
                for (const player of data) {
                    if (Date.now() - Date.parse(player.lastSeen) > 8.64e+7) continue // Haven't seen in a day
                    for (const slotName in player.slots) {
                        const slot = player.slots[slotName] as ItemDataTrade
                        if (slot.name !== item) continue
                        if (slot.giveaway) continue

                        if (slot.b) {
                            buyingData.push({
                                id: player.id,
                                level: slot.level,
                                price: slot.price,
                                q: slot.q,
                                serverIdentifier: player.serverIdentifier,
                                serverRegion: player.serverRegion,
                            })
                        } else {
                            sellingData.push({
                                id: player.id,
                                level: slot.level,
                                p: slot.p,
                                price: slot.price,
                                q: slot.q,
                                serverIdentifier: player.serverIdentifier,
                                serverRegion: player.serverRegion,
                            })
                        }
                    }
                }

                if (buyingData.length === 0 && sellingData.length === 0) {
                    return await interaction.followUp({
                        ephemeral: true,
                        content: `I couldn't find anyone trading \`${item}\` 🥲`
                    })
                }

                let content = `The base price, according to \`G\`, is \`${gItem.g}\`.`

                if (sellingData.length) {
                    // Sort selling data
                    sellingData.sort((a, b) => {
                        // Sort lowest level first
                        if (a.level && b.level) {
                            return b.level - a.level
                        }

                        // Sort titled items first
                        if (a.p && !b.p) return -1
                        if (!a.p && b.p) return 1
                        if (a.p && b.p) return (b.p as string).localeCompare(a.p)

                        // Sort cheapest first
                        return b.price - a.price
                    })

                    content += `\nI found the following players selling \`${item}\` 🙂\n\`\`\``
                    for (const d of sellingData) {
                        const quantity = d.q === undefined ? "" : `${d.q}`
                        const title = d.p ? ` ${d.p}` : ""
                        const level = d.level === undefined ? "" : ` level ${d.level}`
                        const price = `${d.price}`
                        content += `\n${d.id} (${d.serverRegion} ${d.serverIdentifier}) is selling ${quantity}${title}${level} @ ${price}`
                    }
                    content += "```"
                }

                if (buyingData.length) {
                    // Sort buying data
                    buyingData.sort((a, b) => {
                        // Sort lowest level first
                        if (a.level && b.level) {
                            return b.level - a.level
                        }

                        // Sort titled items first
                        if (a.p && !b.p) return -1
                        if (!a.p && b.p) return 1
                        if (a.p && b.p) return (b.p as string).localeCompare(a.p)

                        // Sort cheapest first
                        return b.price - a.price
                    })

                    content += `\nI found the following players buying \`${item}\` 🙂\n\`\`\``
                    for (const d of buyingData) {
                        const quantity = `${d.q}`
                        const level = d.level === undefined ? "" : ` level ${d.level}`
                        const price = `${d.price}`
                        content += `\n${d.id} (${d.serverRegion} ${d.serverIdentifier}) is buying ${quantity}${level} @ ${price}`
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
