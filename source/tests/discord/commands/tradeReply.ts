/** Compact trade tables with a per-variant heading and top-right icon, green for native listings and blue for Earth's posted trades. */
import { AttachmentBuilder, EmbedBuilder, escapeMarkdown, type MessageMentionOptions } from "discord.js"
import stringWidth from "string-width"
import { getItemBaseName, renderItemIcon, type ItemTitle } from "./itemIcon.js"
import { formatGold, type DealRow, type ItemRef } from "./tradeDeals.js"
import type { MergedMerchantOffer } from "./tradeMessage.js"
import { compareTradeVariants, type TradeIconG } from "./tradeVariants.js"

const DISCORD_CONTENT_LIMIT = 2000
const DESCRIPTION_LIMIT = 3800
const EMBED_DESCRIPTION_LIMIT = 4096
const EMBED_TOTAL_LIMIT = 6000
const COLOR_STANDS = 0x57f287
const COLOR_DEALS = 0x5865f2
// Preserve every price digit while using K/M/B/T suffixes instead of long gold amounts.
const GOLD_FORMAT = new Intl.NumberFormat("en-US", {
    notation: "compact", maximumSignificantDigits: 21, useGrouping: false,
})

type TableAction = "Selling" | "Buying" | "Trading"
type TableRow = string[]
type TableKind = {
    nameHeader: "Name (Server)" | "Name (Discord)"
    column: "Price" | "Wants" | "Terms"
}
type TradeTable = TableKind & {
    action: TableAction
    icon: ItemRef
    rows: TableRow[]
    /** Sum of the Qty column for rows with a known quantity. */
    volume: number
    /** Rows without a quantity cannot contribute to the volume total. */
    unknownQuantity: number
}
type TradeEmbedPiece = { embed: EmbedBuilder; icon: ItemRef; heading: string }

export type TradeReplyMessage = {
    content?: string
    embeds?: EmbedBuilder[]
    files?: AttachmentBuilder[]
    allowedMentions?: MessageMentionOptions
}

export type TradeIconOpts = {
    G: TradeIconG
    level?: number
    p?: ItemTitle
}

function text(value: string): string {
    return escapeMarkdown(value.replace(/[\r\n]+/g, " "), {
        maskedLink: true, heading: true, bulletedList: true, numberedList: true,
    })
}

// Code fences and control characters in public labels must not break out of a table row.
function cell(value: string): string {
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/`/g, "ˋ")
}

function itemLabel(item: ItemRef, G?: TradeIconG): string {
    const parts: string[] = []
    if (item.level !== undefined) parts.push(`+${item.level}`)
    if (item.p) parts.push(G?.titles?.[item.p]?.title ?? item.p)
    parts.push(G ? getItemBaseName(G, item.name) : item.name)
    return parts.join(" ")
}

function iconKey(icon: ItemRef): string {
    return `${icon.name}|${icon.level ?? ""}|${icon.p ?? ""}`
}

function tableKindKey(kind: TableKind): string {
    return `${kind.nameHeader}|${kind.column}`
}

/** Keep one table per variant, action, and column layout so rows never mix variants. */
function addRow(
    tables: TradeTable[],
    action: TableAction,
    kind: TableKind,
    icon: ItemRef,
    row: TableRow,
    quantity?: number,
): void {
    const key = `${action}|${tableKindKey(kind)}|${iconKey(icon)}`
    let table = tables.find(table => `${table.action}|${tableKindKey(table)}|${iconKey(table.icon)}` === key)
    if (!table) {
        table = { action, ...kind, icon, rows: [], volume: 0, unknownQuantity: 0 }
        tables.push(table)
    }
    table.rows.push(row.map(cell))
    if (quantity === undefined) table.unknownQuantity += 1
    else table.volume += quantity
}

function standTables(tables: TradeTable[], offers: MergedMerchantOffer[], action: "Selling" | "Buying", item: string): void {
    for (const offer of offers) {
        const icon = { name: item, level: offer.level, p: offer.p }
        addRow(tables, action, { nameHeader: "Name (Server)", column: "Price" }, icon, [
            `${offer.id} (${offer.serverRegion} ${offer.serverIdentifier})`,
            formatGold(offer.quantity),
            GOLD_FORMAT.format(offer.price),
        ], offer.quantity)
    }
}

/** Both APIs use owner-perspective offered/wanted lots, so the row format is identical. */
function dealTables(tables: TradeTable[], rows: DealRow[], action: TableAction, item: string, native: boolean, G?: TradeIconG): void {
    const nameHeader = native ? "Name (Server)" : "Name (Discord)"
    const seen = new Set<DealRow["exchange"]>()
    for (const row of rows) {
        if (row.exchange) {
            // A same-item native swap can match both sides of the search.
            if (seen.has(row.exchange)) continue
            seen.add(row.exchange)
            const { offered, wanted } = row.exchange
            const wants = `${itemLabel(wanted, G)} x${formatGold(wanted.q)}`
            addRow(tables, "Trading", { nameHeader, column: "Wants" }, offered, [
                row.owner,
                formatGold(offered.q),
                wants,
            ], offered.q)
        } else {
            const icon = { name: item, level: row.level, p: row.p }
            const quantity = row.quantity === undefined ? "—" : formatGold(row.quantity)
            const priced = row.price !== undefined
            const terms = row.price !== undefined ? GOLD_FORMAT.format(row.price) : row.terms
            addRow(tables, action, { nameHeader, column: priced ? "Price" : "Terms" }, icon, [row.owner, quantity, terms], row.quantity)
        }
    }
}

/** Amount available next to the action title; a trailing + marks a partial total. */
function volumeLabel(table: TradeTable): string {
    if (!table.volume) return ""
    const amount = table.unknownQuantity > 0 ? `${formatGold(table.volume)}+` : formatGold(table.volume)
    return ` · **${amount}** avail`
}

/** Align visible columns without shortening names, including wide Unicode display names. */
function tablePages(table: TradeTable, descriptionLimit: number): string[] {
    const headers: TableRow = [
        table.nameHeader,
        "Qty",
        table.column,
    ]
    const aligns: Array<"left" | "right"> = ["left", "right"]
    aligns.push(table.column === "Price" ? "right" : "left")
    const valueIndex = 2
    const rows = table.rows.map(row => {
        // Only unbounded free-text terms can be shortened; names and quantities stay intact.
        const value = row[valueIndex]
        const cells = [...row]
        if (value.length > 2800) cells[valueIndex] = value.slice(0, 2770) + "… (terms shortened)"
        return cells
    })
    const widths = headers.map(header => stringWidth(header))
    for (const row of rows) {
        for (let index = 0; index < row.length; index++) {
            widths[index] = Math.max(widths[index], stringWidth(row[index]))
        }
    }
    const line = (row: TableRow) => row.map((value, index) => {
        const padding = " ".repeat(widths[index] - stringWidth(value))
        // The last left-aligned column ends the line without trailing spaces.
        if (index === row.length - 1 && aligns[index] === "left") return value
        return aligns[index] === "right" ? padding + value : value + padding
    }).join("      ")
    const startPrefix = `**${text(table.action)}**${volumeLabel(table)}\n\`\`\`\n`
    const end = "\n```"
    // A long untrusted owner label widens every column; keep the header and rows inside the page budget.
    const header = line(headers).slice(0, Math.max(0, descriptionLimit - startPrefix.length - end.length))
    const start = startPrefix + header
    const lineBudget = descriptionLimit - start.length - end.length - 1
    const pages: string[] = []
    let page = start
    for (const row of rows) {
        let value = line(row)
        if (value.length > lineBudget) value = value.slice(0, Math.max(0, lineBudget - 1)) + "…"
        const entry = "\n" + value
        if (page.length + entry.length + end.length > descriptionLimit) {
            pages.push(page + end)
            page = start
        }
        page += entry
    }
    if (page !== start) pages.push(page + end)
    return pages
}

/** Count displayed rows by action; native swaps and Earth deals both appear as trades. */
function sourceSummary(tables: TradeTable[]): string {
    const counts: Record<TableAction, number> = { Selling: 0, Buying: 0, Trading: 0 }
    for (const table of tables) counts[table.action] += table.rows.length
    const parts: string[] = []
    if (counts.Selling) parts.push(`**${formatGold(counts.Selling)}** selling`)
    if (counts.Buying) parts.push(`**${formatGold(counts.Buying)}** buying`)
    if (counts.Trading) {
        parts.push(`**${formatGold(counts.Trading)}** ${counts.Trading === 1 ? "trade" : "trades"}`)
    }
    return parts.join(" · ")
}

/** Pack each variant's tables together so its heading and icon stay with its tables. */
function sourcePieces(tables: TradeTable[], color: number, G?: TradeIconG): { summary: string; pieces: TradeEmbedPiece[] } {
    const summary = sourceSummary(tables)
    const groups = new Map<string, { icon: ItemRef; tables: TradeTable[] }>()
    for (const table of tables) {
        const key = iconKey(table.icon)
        let group = groups.get(key)
        if (!group) {
            group = { icon: table.icon, tables: [] }
            groups.set(key, group)
        }
        group.tables.push(table)
    }

    const pieces: TradeEmbedPiece[] = []
    // Same variant order as the Before layout: level high→low, then title A→Z.
    const ordered = [...groups.values()].sort((a, b) => compareTradeVariants(a.icon, b.icon))
    for (const group of ordered) {
        const heading = itemLabel(group.icon, G)
        // Reserve the heading, summary, and the padding line that clears the icon.
        const descriptionLimit = DESCRIPTION_LIMIT - heading.length - summary.length - 3
        const embeds: EmbedBuilder[] = []
        let description = ""
        for (const table of group.tables) {
            for (const page of tablePages(table, descriptionLimit)) {
                if (description && description.length + page.length + 1 > descriptionLimit) {
                    embeds.push(new EmbedBuilder().setColor(color).setDescription(description))
                    description = ""
                }
                description += (description ? "\n" : "") + page
            }
        }
        if (description) embeds.push(new EmbedBuilder().setColor(color).setDescription(description))
        for (const embed of embeds) pieces.push({ embed, icon: group.icon, heading })
    }
    return { summary, pieces }
}

/** Render one icon per variant; continuation pages reuse the same attachment. */
async function sourceIcons(pieces: TradeEmbedPiece[], G?: TradeIconG): Promise<Map<string, { png: Buffer; filename: string }>> {
    const icons = new Map<string, { png: Buffer; filename: string }>()
    if (!G) return icons
    const unique = new Map<string, ItemRef>()
    for (const piece of pieces) {
        const key = iconKey(piece.icon)
        if (!unique.has(key)) unique.set(key, piece.icon)
    }
    await Promise.all([...unique].map(async ([key, icon]) => {
        const thumb = await tradeIcon(icon.name, { G, level: icon.level, p: icon.p })
        if (thumb) icons.set(key, thumb)
    }))
    return icons
}

/** Render the item's level/title overlays, including the colored title border. */
async function tradeIcon(item: string, icon?: TradeIconOpts): Promise<{ png: Buffer; filename: string } | null> {
    if (!icon) return null
    try {
        // A 54px thumbnail is large enough to read while one padding line keeps it clear of the table.
        return await renderItemIcon(icon.G, item, { level: icon.level, p: icon.p, showQuantity: false, scale: 1.2 })
    } catch (error) {
        console.error(`Failed to render trade icon for ${item}:`, error)
        return null
    }
}

/** Each source gets its own messages; color alone identifies native versus Earth API listings. */
export async function buildTradeReply(args: {
    item: string
    gPrice: number | string
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    swapOffering?: DealRow[]
    swapWanting?: DealRow[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    footer?: string
    contentPrefix?: string
    icon?: TradeIconOpts
}): Promise<TradeReplyMessage[]> {
    const { item, gPrice, selling, buying, dealWts, dealWtb, icon } = args
    const G = icon?.G
    const name = G ? getItemBaseName(G, item) : item
    const itemName = name === item ? `**${text(name)}**` : `**${text(name)}** (\`${item}\`)`
    const basePrice = typeof gPrice === "number" ? formatGold(gPrice) : text(String(gPrice))
    const content = [args.contentPrefix?.trim(), `${itemName} — base \`G\` **${basePrice}**`, args.footer ? text(args.footer) : undefined]
        .filter(Boolean).join("\n").slice(0, DISCORD_CONTENT_LIMIT)

    const native: TradeTable[] = []
    standTables(native, selling, "Selling", item)
    standTables(native, buying, "Buying", item)
    dealTables(native, [...(args.swapOffering ?? []), ...(args.swapWanting ?? [])], "Trading", item, true, G)

    const posted: TradeTable[] = []
    dealTables(posted, dealWts.filter(row => !row.exchange), "Selling", item, false, G)
    dealTables(posted, dealWtb.filter(row => !row.exchange), "Buying", item, false, G)
    dealTables(posted, [...dealWts, ...dealWtb].filter(row => row.exchange), "Trading", item, false, G)
    // Green native messages always precede blue posted messages; variants inside each are level-sorted.
    const sources = [sourcePieces(native, COLOR_STANDS, G), sourcePieces(posted, COLOR_DEALS, G)]
    if (!sources.some(source => source.pieces.length)) {
        const empty = "\nNo listings found."
        return [{ content: content.slice(0, DISCORD_CONTENT_LIMIT - empty.length) + empty, allowedMentions: { parse: [] } }]
    }

    const icons = await sourceIcons(sources.flatMap(source => source.pieces), G)
    const messages: TradeReplyMessage[] = []
    for (const source of sources) {
        let embeds: EmbedBuilder[] = []
        let files = new Map<string, AttachmentBuilder>()
        let chars = 0
        const flush = () => {
            if (!embeds.length) return
            messages.push({
                content: messages.length ? undefined : content,
                embeds,
                files: files.size ? [...files.values()] : undefined,
                allowedMentions: { parse: [] },
            })
            embeds = []
            files = new Map()
            chars = 0
        }
        for (const piece of source.pieces) {
            const thumb = icons.get(iconKey(piece.icon))
            const body = piece.embed.data.description!
            const heading = `**${text(piece.heading)}**`
            // Reserve the summary so a flush never pushes the first description past its limit.
            const pieceLength = heading.length + body.length + source.summary.length + 3
            const needsFile = thumb && !files.has(thumb.filename)
            if (embeds.length >= 10 || chars + pieceLength > EMBED_TOTAL_LIMIT || (needsFile && files.size >= 10)) flush()
            // The heading and summary sit above one padding line that clears the top-right icon.
            const firstInMessage = embeds.length === 0
            const description = firstInMessage
                ? `${heading}\n${source.summary}\n\n${body}`
                : `${heading}\n\n${body}`
            // Last-resort cap: an unbounded owner label must never make Discord reject the whole reply.
            piece.embed.setDescription(description.slice(0, EMBED_DESCRIPTION_LIMIT))
            if (thumb) piece.embed.setThumbnail(`attachment://${thumb.filename}`)
            if (thumb && !files.has(thumb.filename)) {
                files.set(thumb.filename, new AttachmentBuilder(thumb.png, { name: thumb.filename }))
            }
            embeds.push(piece.embed)
            chars += piece.embed.data.description!.length
        }
        flush()
    }
    return messages
}
