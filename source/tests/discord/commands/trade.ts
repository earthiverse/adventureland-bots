import AL, { ItemName } from "alclient"
import { Client, ApplicationCommandType, ApplicationCommandOptionType, AutocompleteInteraction, ChatInputCommandInteraction } from "discord.js"
import { Command } from "../command.js"
import {
    collectMerchantOffers,
    formatMerchantLine,
    mergeMerchantOffers,
    sortMerchantOffers,
} from "./tradeMessage.js"

type ItemRef = { name: string; level?: number; p?: string }
type TradeOffer = { item: ItemRef; give: number; receive: number; negotiable?: boolean }
type TradeSide = {
    price?: number
    priceNegotiable?: boolean
    note?: string
    quantity?: number
    trades?: TradeOffer[]
}
type TradeListing = ItemRef & { note?: string; wts?: TradeSide; wtb?: TradeSide }
type OwnerTrades = {
    owner: string
    listings: TradeListing[]
    lastUpdated?: number
    label?: string
    characters?: string[]
    discordName?: string
    discordId?: string
}

const DISCORD_CONTENT_LIMIT = 2000
const ALDATA_BASE_URL = (process.env.ALDATA_URL ?? "https://aldata.earthiverse.ca").replace(/\/$/, "")

function ownerDisplayName(ownerTrades: OwnerTrades): string {
    if (ownerTrades.label) return ownerTrades.label
    return ownerTrades.owner
}

/**
 * Plain-text owner prefix for bank lines.
 * Never emit `<@id>` / mention syntax — the /trade bot must not ping listing owners.
 * Only append Discord when it differs from the display label (avoids "earthiverse (Discord: earthiverse)").
 */
function ownerBankPrefix(ownerTrades: OwnerTrades): string {
    const name = ownerDisplayName(ownerTrades)
    const discord = ownerTrades.discordName?.trim()
    if (discord && discord.toLowerCase() !== name.toLowerCase()) {
        return `${name} (@${discord})`
    }
    return name
}

function truncateDiscordContent(content: string): string {
    if (content.length <= DISCORD_CONTENT_LIMIT) return content
    const suffix = "\n… (truncated)"
    return content.slice(0, DISCORD_CONTENT_LIMIT - suffix.length) + suffix
}

function formatListingMeta(listing: ItemRef): string {
    const parts: string[] = []
    if (listing.level !== undefined) parts.push(`level ${listing.level}`)
    if (listing.p) parts.push(listing.p)
    return parts.join(" ")
}

function formatBankSideLines(owner: string, sideLabel: "WTS" | "WTB", listing: TradeListing, side: TradeSide): string[] {
    const lines: string[] = []
    const quantity = side.quantity === undefined ? "" : `${side.quantity} `
    const meta = formatListingMeta(listing)
    const metaPart = meta ? `${meta} ` : ""
    const note = side.note ?? listing.note

    if (side.price !== undefined) {
        const negotiable = side.priceNegotiable ? " (negotiable)" : ""
        const notePart = note ? ` — ${note}` : ""
        lines.push(`${owner} ${sideLabel} ${quantity}${metaPart}@ ${side.price.toLocaleString()}${negotiable}${notePart}`)
    }

    if (side.trades) {
        for (const offer of side.trades) {
            const negotiable = offer.negotiable ? " (negotiable)" : ""
            const offerMeta = formatListingMeta(offer.item)
            const forItem = offerMeta ? `${offerMeta} ${offer.item.name}` : offer.item.name
            lines.push(`${owner} ${sideLabel} ${quantity}${offer.give}:${offer.receive} for ${forItem}${negotiable}`)
        }
    }

    return lines
}

// TODO: How do I type this for autocomplete?
export const Trade: Command & { autocomplete: (client: Client, interaction: AutocompleteInteraction) => void } = {
    name: "trade",
    description: "Returns details about trades for an item (Data from ALData)",
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
