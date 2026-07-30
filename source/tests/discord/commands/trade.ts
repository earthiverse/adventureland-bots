import AL, { ItemName } from "alclient"
import { Client, ApplicationCommandType, ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js"
import { Command } from "../command.js"
import {
    formatBankSideLines,
    ownerBankPrefix,
    type OwnerTrades,
} from "./tradeBank.js"
import {
    collectMerchantOffers,
    formatMerchantLine,
    mergeMerchantOffers,
    sortMerchantOffers,
    truncateDiscordContent,
} from "./tradeMessage.js"

const ALDATA_BASE_URL = (process.env.ALDATA_URL ?? "https://aldata.earthiverse.ca").replace(/\/$/, "")

// TODO: How do I type this for autocomplete?
export const Trade: Command & { autocomplete: (client: Client, interaction: AutocompleteInteraction) => void } = {
    name: "trade",
    description: `Returns details about trades for an item (Data from ${ALDATA_BASE_URL})`,
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
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
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
            const [merchantsResponse, tradesResponse] = await Promise.all([
                fetch(`${ALDATA_BASE_URL}/merchants/`),
                fetch(`${ALDATA_BASE_URL}/trades`)
            ])

            const merchantsOk = merchantsResponse.status === 200
            const tradesOk = tradesResponse.status === 200

            if (!merchantsOk && !tradesOk) {
                return await interaction.followUp({
                    ephemeral: true,
                    content: `Sorry, I had an error finding data for \`${item}\`. 😥`
                })
            }

            const bankWtsLines: string[] = []
            const bankWtbLines: string[] = []
            let buyingData = sortMerchantOffers([], "buy")
            let sellingData = sortMerchantOffers([], "sell")

            if (merchantsOk) {
                const data = await merchantsResponse.json()
                const collected = collectMerchantOffers(data, String(item))
                buyingData = sortMerchantOffers(mergeMerchantOffers(collected.buying), "buy")
                sellingData = sortMerchantOffers(mergeMerchantOffers(collected.selling), "sell")
            }

            if (tradesOk) {
                const owners = await tradesResponse.json() as OwnerTrades[]
                for (const ownerTrades of owners) {
                    for (const listing of ownerTrades.listings ?? []) {
                        if (listing.name !== item) continue
                        if (listing.wts) {
                            bankWtsLines.push(...formatBankSideLines(ownerBankPrefix(ownerTrades), "WTS", listing, listing.wts))
                        }
                        if (listing.wtb) {
                            bankWtbLines.push(...formatBankSideLines(ownerBankPrefix(ownerTrades), "WTB", listing, listing.wtb))
                        }
                    }
                }
            }

            const hasMerchants = buyingData.length > 0 || sellingData.length > 0
            const hasBank = bankWtsLines.length > 0 || bankWtbLines.length > 0

            if (!hasMerchants && !hasBank) {
                return await interaction.followUp({
                    ephemeral: true,
                    content: `I couldn't find anyone trading \`${item}\` 🥲`
                })
            }

            let content = `The base price, according to \`G\`, is \`${gItem.g}\`.`

            if (sellingData.length) {
                content += `\nI found the following players selling \`${item}\` 🙂\n\`\`\``
                for (const d of sellingData) {
                    content += `\n${formatMerchantLine(d, "selling")}`
                }
                content += "```"
            }

            if (buyingData.length) {
                content += `\nI found the following players buying \`${item}\` 🙂\n\`\`\``
                for (const d of buyingData) {
                    content += `\n${formatMerchantLine(d, "buying")}`
                }
                content += "```"
            }

            if (bankWtsLines.length) {
                content += `\nBank WTS for \`${item}\`:\n\`\`\``
                for (const line of bankWtsLines) {
                    content += `\n${line}`
                }
                content += "```"
            }

            if (bankWtbLines.length) {
                content += `\nBank WTB for \`${item}\`:\n\`\`\``
                for (const line of bankWtbLines) {
                    content += `\n${line}`
                }
                content += "```"
            }

            return await interaction.followUp({
                ephemeral: true,
                content: truncateDiscordContent(content)
            })
        } catch (e) {
            console.error(e)
        }
        return await interaction.followUp({
            ephemeral: true,
            content: `Sorry, I had an error finding data for \`${item}\`. 😥`
        })
    }
}
