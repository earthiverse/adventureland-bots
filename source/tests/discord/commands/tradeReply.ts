/**
 * /trade Discord reply composition: embeds, chunking, icon wiring.
 */
import { AttachmentBuilder, EmbedBuilder } from "discord.js"

import {
    getFullItemName,
    getItemBaseName,
    renderItemIcon,
    type ItemInstanceOpts,
    type ItemTitle,
} from "./itemIcon.js"
import type { DealRow } from "./tradeDeals.js"
import { buildSummaryText, dealsTable, standsTable, variantTable } from "./tradeTables.js"
import type { MergedMerchantOffer } from "./tradeMessage.js"
import {
    groupTradeByVariant,
    listTradeVariants,
    pickTradeIconOverlays,
    type TradeIconG,
    type TradeVariantGroup,
} from "./tradeVariants.js"

export const DISCORD_CONTENT_LIMIT = 2000
/** Discord limit for a single embed description. */
const EMBED_DESCRIPTION_LIMIT = 4096
/** Discord limit for total text across all embeds in one message. */
const EMBED_TOTAL_LIMIT = 6000

const COLOR_STANDS = 0x57f287
const COLOR_DEALS = 0x5865f2

export type TradeReplyMessage = {
    content?: string
    embeds?: EmbedBuilder[]
    files?: AttachmentBuilder[]
}

export type TradeIconOpts = {
    G: TradeIconG
    /** Optional level / title (`p`) overlays — quantity is intentionally not used for /trade. */
    level?: number
    p?: ItemTitle
}

function embedCharCount(embed: EmbedBuilder): number {
    const data = embed.data
    return (data.title?.length ?? 0) + (data.description?.length ?? 0) + (data.footer?.text?.length ?? 0)
}

function composeEmbedDescription(blurb: string, tableBody: string): string {
    const parts = [blurb.trim(), tableBody.trim()].filter(Boolean)
    return parts.join("\n").slice(0, EMBED_DESCRIPTION_LIMIT)
}

async function resolveTradeIcon(
    item: string,
    icon?: TradeIconOpts,
): Promise<{ png: Buffer; filename: string; url: string } | null> {
    if (!icon?.G) return null
    try {
        // Quantity support exists on the renderer but is not used for /trade thumbnails.
        const opts: ItemInstanceOpts = {
            level: icon.level,
            p: icon.p,
            showQuantity: false,
        }
        const rendered = await renderItemIcon(icon.G, item, opts)
        return {
            png: rendered.png,
            filename: rendered.filename,
            url: `attachment://${rendered.filename}`,
        }
    } catch (e) {
        console.error(`Failed to render trade icon for ${item}:`, e)
        return null
    }
}

function withTradeIcon(
    message: TradeReplyMessage,
    thumb: { png: Buffer; filename: string } | null,
): TradeReplyMessage {
    if (!thumb) return message
    return {
        ...message,
        files: [new AttachmentBuilder(thumb.png, { name: thumb.filename })],
    }
}

const MAX_EMBEDS_PER_MESSAGE = 10
const MAX_FILES_PER_MESSAGE = 10

type VariantEmbedPiece = {
    embed: EmbedBuilder
    thumb: { png: Buffer; filename: string } | null
}

/** Pack variant embeds into messages respecting Discord embed/file/char limits. */
function chunkVariantMessages(
    content: string,
    pieces: VariantEmbedPiece[],
): TradeReplyMessage[] {
    const messages: TradeReplyMessage[] = []
    let embeds: EmbedBuilder[] = []
    let files: AttachmentBuilder[] = []
    let chars = 0
    let isFirst = true

    const flush = (continueContent?: string) => {
        if (!embeds.length && !isFirst) return
        const msg: TradeReplyMessage = {
            content: isFirst ? content : continueContent,
            embeds: embeds.length ? embeds : undefined,
            files: files.length ? files : undefined,
        }
        if (msg.content || msg.embeds) messages.push(msg)
        embeds = []
        files = []
        chars = 0
        isFirst = false
    }

    for (const piece of pieces) {
        const pieceChars = embedCharCount(piece.embed)
        const needsFile = !!piece.thumb
        const wouldExceed =
            embeds.length >= MAX_EMBEDS_PER_MESSAGE ||
            (needsFile && files.length >= MAX_FILES_PER_MESSAGE) ||
            (embeds.length > 0 && chars + pieceChars > EMBED_TOTAL_LIMIT)

        if (wouldExceed) flush(`_(continued)_`)

        embeds.push(piece.embed)
        chars += pieceChars
        if (piece.thumb) {
            files.push(new AttachmentBuilder(piece.thumb.png, { name: piece.thumb.filename }))
        }
    }

    flush()
    if (!messages.length) messages.push({ content })
    return messages
}

/** Single-variant UX: separate stands + deals embeds. */
async function buildStandsDealsMessages(args: {
    item: string
    content: string
    embedLabel: string
    g: number | null
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    icon?: TradeIconOpts
}): Promise<TradeReplyMessage[]> {
    const { item, content, embedLabel, g, selling, buying, dealWts, dealWtb, icon } = args
    const hasStands = selling.length > 0 || buying.length > 0
    const hasDeals = dealWts.length > 0 || dealWtb.length > 0
    const perEmbedBudget = Math.min(EMBED_DESCRIPTION_LIMIT - 120, 3400)

    const stands = hasStands ? standsTable(selling, buying, perEmbedBudget, g) : null
    const deals = hasDeals ? dealsTable(dealWts, dealWtb, perEmbedBudget) : null
    const thumb = await resolveTradeIcon(item, icon)

    const standsEmbed = stands
        ? new EmbedBuilder()
              .setTitle(`Stands · ${embedLabel}`)
              .setColor(COLOR_STANDS)
              .setDescription(composeEmbedDescription(stands.blurb, stands.body))
        : null

    const dealsEmbed = deals
        ? new EmbedBuilder()
              .setTitle(`Deals · ${embedLabel}`)
              .setColor(COLOR_DEALS)
              .setDescription(composeEmbedDescription(deals.blurb, deals.body))
        : null

    if (thumb) {
        standsEmbed?.setThumbnail(thumb.url)
        dealsEmbed?.setThumbnail(thumb.url)
    }

    const messages: TradeReplyMessage[] = []

    if (standsEmbed && dealsEmbed) {
        const total = embedCharCount(standsEmbed) + embedCharCount(dealsEmbed)
        if (total <= EMBED_TOTAL_LIMIT) {
            messages.push(withTradeIcon({ content, embeds: [standsEmbed, dealsEmbed] }, thumb))
        } else {
            messages.push(withTradeIcon({ content, embeds: [standsEmbed] }, thumb))
            messages.push(
                withTradeIcon(
                    {
                        content: `**Deals · ${embedLabel}** (\`${item}\`)`,
                        embeds: [dealsEmbed],
                    },
                    thumb,
                ),
            )
        }
    } else if (standsEmbed) {
        messages.push(withTradeIcon({ content, embeds: [standsEmbed] }, thumb))
    } else if (dealsEmbed) {
        messages.push(withTradeIcon({ content, embeds: [dealsEmbed] }, thumb))
    } else {
        messages.push({ content })
    }

    return messages
}

/** Multi-variant: one embed per group; icons rendered in parallel. */
async function buildVariantGroupMessages(args: {
    item: string
    content: string
    groups: TradeVariantGroup[]
    g: number | null
    G: TradeIconG
}): Promise<TradeReplyMessage[]> {
    const { item, content, groups, g, G } = args
    const perEmbedBudget = Math.min(EMBED_DESCRIPTION_LIMIT - 120, 3400)

    const pieces: VariantEmbedPiece[] = await Promise.all(
        groups.map(async (group) => {
            const label = getFullItemName(G, item, { level: group.level, p: group.p })
            const table = variantTable(group, perEmbedBudget, g)
            const hasStands = group.selling.length > 0 || group.buying.length > 0
            const color = hasStands ? COLOR_STANDS : COLOR_DEALS
            const thumb = await resolveTradeIcon(item, {
                G,
                level: group.level,
                p: group.p,
            })
            const embed = new EmbedBuilder()
                .setTitle(label)
                .setColor(color)
                .setDescription(composeEmbedDescription(table.blurb, table.body))
            if (thumb) embed.setThumbnail(thumb.url)
            return { embed, thumb }
        }),
    )

    return chunkVariantMessages(content, pieces)
}

/**
 * Short summary in message content + stacked ASCII tables in embeds.
 * Always groups by variant. One group → stands/deals embeds; multiple → one embed each.
 */
export async function buildTradeReply(args: {
    item: string
    gPrice: number | string
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    footer?: string
    contentPrefix?: string
    icon?: TradeIconOpts
}): Promise<TradeReplyMessage[]> {
    const { item, gPrice, selling, buying, dealWts, dealWtb, footer, contentPrefix, icon } = args
    const gNum = typeof gPrice === "number" ? gPrice : Number(gPrice)
    const g = Number.isFinite(gNum) && gNum > 0 ? gNum : null

    const displayName = icon?.G ? getItemBaseName(icon.G, item) : item
    const groups = groupTradeByVariant({ selling, buying, dealWts, dealWtb })
    const variants = listTradeVariants({
        G: icon?.G,
        item,
        selling,
        buying,
        dealWts,
        dealWtb,
    })

    const summary = buildSummaryText({
        item,
        displayName,
        variants,
        gPrice,
        selling,
        buying,
        dealWts,
        dealWtb,
        footer,
    })
    const content = [contentPrefix?.trim(), summary].filter(Boolean).join("\n").slice(0, DISCORD_CONTENT_LIMIT)

    if (groups.length > 1 && icon?.G) {
        return buildVariantGroupMessages({
            item,
            content,
            groups,
            g,
            G: icon.G,
        })
    }

    const overlays =
        icon?.level !== undefined || icon?.p
            ? { level: icon?.level, p: icon?.p }
            : pickTradeIconOverlays({ selling, buying, dealWts, dealWtb })
    const titledName =
        icon?.G && (overlays.level || overlays.p)
            ? getFullItemName(icon.G, item, overlays)
            : displayName
    const embedLabel = titledName !== displayName ? titledName : displayName

    return buildStandsDealsMessages({
        item,
        content,
        embedLabel,
        g,
        selling,
        buying,
        dealWts,
        dealWtb,
        icon: icon?.G ? { G: icon.G, ...overlays } : undefined,
    })
}

// Re-exports for existing imports (trade.ts / simulate scripts)
export {
    collectDealRows,
    formatRatioTerms,
    ownerDealPrefix,
    type DealRow,
    type ItemRef,
    type OwnerTrades,
    type TradeListing,
    type TradeOffer,
    type TradeSide,
} from "./tradeDeals.js"
export {
    groupTradeByVariant,
    listTradeVariants,
    pickTradeIconOverlays,
    variantKey,
    type TradeIconG,
    type TradeVariantGroup,
} from "./tradeVariants.js"
