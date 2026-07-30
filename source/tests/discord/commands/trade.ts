import AL, { ItemName } from "alclient"
import {
    Client,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
} from "discord.js"
import { Command } from "../command.js"
import {
    formatBankSideLines,
    ownerBankPrefix,
    type OwnerTrades,
} from "./tradeBank.js"
import {
    collectMerchantOffers,
    mergeMerchantOffers,
    sortMerchantOffers,
    truncateDiscordContent,
} from "./tradeMessage.js"
import type { GLike } from "./itemIcon.js"
import { buildTradeReply, collectDealRows, pickTradeIconOverlays, type OwnerTrades } from "./tradeReply.js"

/** Adapt alclient GData to the icon/name helper surface used by /trade. */
function asTradeIconG(G: Awaited<ReturnType<typeof AL.Game.getGData>>): GLike {
    return G as GLike
}

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
            type: ApplicationCommandOptionType.String,
        },
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
            .map((choice) => {
                const gName = AL.Game.G.items[choice].name
                return { name: `${choice} (${gName})`, value: choice }
            })
        await interaction.respond(filtered)
    },
    run: async (client: Client, interaction: ChatInputCommandInteraction) => {
        const G = await AL.Game.getGData()

        const item = interaction.options.get("item").value
        console.log(item)

        const gItem = G.items[item as ItemName]
        if (!gItem) {
            return interaction.followUp({
                ephemeral: true,
                content: `I couldn't find \`${item}\` in G (v${G.version}) 🤔`,
            })
        }

        try {
            const [merchantsResponse, tradesResponse] = await Promise.all([
                fetch(`${ALDATA_BASE_URL}/merchants/`),
                fetch(`${ALDATA_BASE_URL}/trades`),
            ])

            const merchantsOk = merchantsResponse.status === 200
            const tradesOk = tradesResponse.status === 200

            if (!merchantsOk && !tradesOk) {
                return await interaction.followUp({
                    ephemeral: true,
                    content: `Sorry, I had an error finding data for \`${item}\`. 😥`,
                })
            }

            let buyingData = sortMerchantOffers([], "buy")
            let sellingData = sortMerchantOffers([], "sell")
            let dealWts = collectDealRows([], String(item)).wts
            let dealWtb = collectDealRows([], String(item)).wtb

            if (merchantsOk) {
                const data = await merchantsResponse.json()
                const collected = collectMerchantOffers(data, String(item))
                buyingData = sortMerchantOffers(mergeMerchantOffers(collected.buying), "buy")
                sellingData = sortMerchantOffers(mergeMerchantOffers(collected.selling), "sell")
            }

            if (tradesOk) {
                const owners = (await tradesResponse.json()) as OwnerTrades[]
                const deals = collectDealRows(owners, String(item))
                dealWts = deals.wts
                dealWtb = deals.wtb
            }

            const hasMerchants = buyingData.length > 0 || sellingData.length > 0
            const hasDeals = dealWts.length > 0 || dealWtb.length > 0

            if (!hasMerchants && !hasDeals) {
                return await interaction.followUp({
                    ephemeral: true,
                    content: `I couldn't find anyone trading \`${item}\` 🥲`,
                })
            }

            const overlays = pickTradeIconOverlays({
                selling: sellingData,
                buying: buyingData,
                dealWts,
                dealWtb,
            })
            const messages = await buildTradeReply({
                item: String(item),
                gPrice: gItem.g,
                selling: sellingData,
                buying: buyingData,
                dealWts,
                dealWtb,
                icon: { G: asTradeIconG(G), ...overlays },
            })

            for (const message of messages) {
                await interaction.followUp({
                    ephemeral: true,
                    content: message.content,
                    embeds: message.embeds,
                    files: message.files,
                })
            }
            return
        } catch (e) {
            console.error(e)
        }
        return await interaction.followUp({
            ephemeral: true,
            content: `Sorry, I had an error finding data for \`${item}\`. 😥`,
        })
    },
}
