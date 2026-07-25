import { AttachmentBuilder, EmbedBuilder } from "discord.js"

import {
    getFullItemName,
    getItemBaseName,
    renderItemIcon,
    type ItemInstanceOpts,
    type ItemTitle,
} from "./itemIcon.js"
import type { MergedMerchantOffer } from "./tradeMessage.js"

export const DISCORD_CONTENT_LIMIT = 2000
/** Discord limit for a single embed description. */
const EMBED_DESCRIPTION_LIMIT = 4096
/** Discord limit for total text across all embeds in one message. */
const EMBED_TOTAL_LIMIT = 6000

const COLOR_STANDS = 0x57f287
const COLOR_DEALS = 0x5865f2

export type ItemRef = { name: string; level?: number; p?: string }
export type TradeOffer = { item: ItemRef; give: number; receive: number; negotiable?: boolean }
export type TradeSide = {
    price?: number
    priceNegotiable?: boolean
    note?: string
    quantity?: number
    trades?: TradeOffer[]
}
export type TradeListing = ItemRef & { note?: string; wts?: TradeSide; wtb?: TradeSide }
export type OwnerTrades = {
    owner: string
    listings?: TradeListing[]
    lastUpdated?: number
    label?: string
    characters?: string[]
    discordName?: string
    discordId?: string
}

export type DealRow = {
    owner: string
    side: "WTS" | "WTB"
    quantity?: number
    price?: number
    priceNegotiable?: boolean
    level?: number
    /** Item title key from AL (`shiny`, `glitched`, …) — field name is `p` in game data. */
    p?: string
    /** Lister-wallet ratio/gold text */
    terms: string
}

export type TradeReplyMessage = {
    content?: string
    embeds?: EmbedBuilder[]
    files?: AttachmentBuilder[]
}

/** G subset needed to crop item icons (alclient GData is compatible). */
export type TradeIconG = Parameters<typeof renderItemIcon>[0]

export type TradeIconOpts = {
    G: TradeIconG
    /** Optional level / title (`p`) overlays — quantity is intentionally not used for /trade. */
    level?: number
    p?: ItemTitle
}

function pad(value: string, width: number): string {
    if (value.length > width) return value.slice(0, Math.max(1, width - 1)) + "…"
    return value.padEnd(width)
}

function formatGold(n: number): string {
    return n.toLocaleString()
}

/** Compact gold for UI (1.46M, 900k, …). */
function formatGoldShort(n: number): string {
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) {
        const v = n / 1_000_000_000
        return `${v >= 10 ? Math.round(v) : +v.toFixed(1)}B`
    }
    if (abs >= 1_000_000) {
        const v = n / 1_000_000
        return `${v >= 10 ? Math.round(v) : +v.toFixed(2)}M`
    }
    if (abs >= 10_000) return `${Math.round(n / 1_000)}k`
    return formatGold(n)
}

export function ownerDealPrefix(ownerTrades: OwnerTrades): string {
    const name = ownerTrades.label || ownerTrades.owner
    const discord = ownerTrades.discordName?.trim()
    if (discord && discord.toLowerCase() !== name.toLowerCase()) {
        return `${name} (@${discord})`
    }
    return name
}

function formatListingMeta(listing: ItemRef): string {
    const parts: string[] = []
    if (listing.level !== undefined) parts.push(`+${listing.level}`)
    if (listing.p) parts.push(listing.p)
    return parts.join(" ")
}

function formatOtherItem(item: ItemRef): string {
    const meta = formatListingMeta(item)
    return meta ? `${meta} ${item.name}` : item.name
}

/** Compact lister-wallet terms for table cells. */
export function formatRatioTerms(listedName: string, side: "WTS" | "WTB", offer: TradeOffer): string {
    const other = formatOtherItem(offer.item)
    const nego = offer.negotiable ? " ~" : ""
    if (side === "WTB") {
        return `${offer.receive} ${other} → ${offer.give} ${listedName}${nego}`
    }
    return `${offer.give} ${listedName} → ${offer.receive} ${other}${nego}`
}

export function collectDealRows(owners: OwnerTrades[], item: string): { wts: DealRow[]; wtb: DealRow[] } {
    const wts: DealRow[] = []
    const wtb: DealRow[] = []

    for (const ownerTrades of owners) {
        const owner = ownerDealPrefix(ownerTrades)
        for (const listing of ownerTrades.listings ?? []) {
            if (listing.name !== item) continue
            for (const sideKey of ["wts", "wtb"] as const) {
                const tradeSide = listing[sideKey]
                if (!tradeSide) continue
                const sideLabel = sideKey === "wts" ? "WTS" : "WTB"
                const bucket = sideKey === "wts" ? wts : wtb
                const meta = formatListingMeta(listing)
                const metaSuffix = meta ? ` ${meta}` : ""

                const listingMeta = { level: listing.level, p: listing.p }

                if (tradeSide.price !== undefined) {
                    const nego = tradeSide.priceNegotiable ? " ~" : ""
                    bucket.push({
                        owner,
                        side: sideLabel,
                        quantity: tradeSide.quantity,
                        price: tradeSide.price,
                        priceNegotiable: tradeSide.priceNegotiable,
                        ...listingMeta,
                        terms: `@${formatGoldShort(tradeSide.price)}${metaSuffix}${nego}`,
                    })
                }

                for (const offer of tradeSide.trades ?? []) {
                    bucket.push({
                        owner,
                        side: sideLabel,
                        quantity: tradeSide.quantity,
                        priceNegotiable: offer.negotiable,
                        ...listingMeta,
                        terms: formatRatioTerms(item, sideLabel, offer),
                    })
                }

                if (
                    tradeSide.price === undefined &&
                    !(tradeSide.trades && tradeSide.trades.length) &&
                    (tradeSide.quantity !== undefined || tradeSide.note || listing.note)
                ) {
                    bucket.push({
                        owner,
                        side: sideLabel,
                        quantity: tradeSide.quantity,
                        ...listingMeta,
                        terms: tradeSide.note ?? listing.note ?? "—",
                    })
                }
            }
        }
    }

    return { wts, wtb }
}

function truncateTableLines(lines: string[], maxChars: number): { text: string; omitted: number } {
    if (lines.length === 0) return { text: "", omitted: 0 }

    const kept: string[] = []
    let omitted = 0
    for (let i = 0; i < lines.length; i++) {
        const candidate = [...kept, lines[i]]
        const body = candidate.join("\n")
        const omittedAfter = lines.length - candidate.length
        const footer = omittedAfter > 0 ? `\n… and ${omittedAfter} more` : ""
        if (body.length + footer.length > maxChars) {
            omitted = lines.length - kept.length
            break
        }
        kept.push(lines[i])
    }

    if (kept.length === 0) {
        const footer = lines.length > 1 ? `\n… and ${lines.length - 1} more` : ""
        const budget = Math.max(16, maxChars - footer.length)
        return { text: lines[0].slice(0, budget) + footer, omitted: Math.max(0, lines.length - 1) }
    }

    const footer = omitted > 0 ? `\n… and ${omitted} more` : ""
    return { text: kept.join("\n") + footer, omitted }
}

/**
 * Stack sell/buy sections. Discord embeds are ~55–65 monospace chars wide;
 * dual columns wrap and break alignment.
 */
function stackedSections(
    topTitle: string,
    topLines: string[],
    bottomTitle: string,
    bottomLines: string[],
    budget: number,
): string {
    return multiStackedSections(
        [
            { title: topTitle, lines: topLines },
            { title: bottomTitle, lines: bottomLines },
        ],
        budget,
    )
}

function multiStackedSections(
    sections: Array<{ title: string; lines: string[] }>,
    budget: number,
): string {
    const parts: string[] = []
    for (const section of sections) {
        if (!section.lines.length) continue
        if (parts.length) parts.push("")
        parts.push(section.title, ...section.lines)
    }
    if (!parts.length) return ""
    const { text } = truncateTableLines(parts, Math.max(32, budget - 8))
    return "```\n" + text + "\n```"
}

function offerMeta(offer: { level?: number; p?: string }): string {
    const parts: string[] = []
    if (offer.p) parts.push(offer.p)
    if (offer.level !== undefined && offer.level > 0) parts.push(`+${offer.level}`)
    return parts.join(" ")
}

function merchantLine(offer: MergedMerchantOffer): string {
    const stacks = offer.stacks > 1 ? `(${offer.stacks})` : ""
    const qty = `${offer.quantity.toLocaleString()}${stacks}`
    const server = `${offer.serverRegion} ${offer.serverIdentifier}`
    // Within a single-variant embed Meta is redundant; keep for the family (single-variant) layout.
    return `${pad(offer.id, 12)} ${pad(server, 7)} ${pad(qty, 6)} ${pad(offerMeta(offer) || "—", 10)} ${formatGoldShort(offer.price)}`
}

function merchantLineCompact(offer: MergedMerchantOffer): string {
    const stacks = offer.stacks > 1 ? `(${offer.stacks})` : ""
    const qty = `${offer.quantity.toLocaleString()}${stacks}`
    const server = `${offer.serverRegion} ${offer.serverIdentifier}`
    return `${pad(offer.id, 14)} ${pad(server, 7)} ${pad(qty, 7)} ${formatGoldShort(offer.price)}`
}

function merchantHeader(): string {
    return `${pad("Name", 12)} ${pad("Server", 7)} ${pad("Qty", 6)} ${pad("Meta", 10)} Price`
}

function merchantHeaderCompact(): string {
    return `${pad("Name", 14)} ${pad("Server", 7)} ${pad("Qty", 7)} Price`
}

export type TradeVariantGroup = {
    key: string
    level?: number
    /** Item title key (`shiny`, `glitched`, …) — game field `p`. */
    p?: string
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
}

/** Stable key for (level, title/`p`) variants of one item id. */
export function variantKey(level?: number, p?: string): string {
    return `${p ?? ""}|${level ?? ""}`
}

function ensureVariant(
    map: Map<string, TradeVariantGroup>,
    level?: number,
    p?: string,
): TradeVariantGroup {
    const key = variantKey(level, p)
    let group = map.get(key)
    if (!group) {
        group = {
            key,
            ...(level !== undefined ? { level } : {}),
            ...(p ? { p } : {}),
            selling: [],
            buying: [],
            dealWts: [],
            dealWtb: [],
        }
        map.set(key, group)
    }
    return group
}

/** Group stand + deal rows by (level, p). */
export function groupTradeByVariant(args: {
    selling?: MergedMerchantOffer[]
    buying?: MergedMerchantOffer[]
    dealWts?: DealRow[]
    dealWtb?: DealRow[]
}): TradeVariantGroup[] {
    const map = new Map<string, TradeVariantGroup>()

    for (const offer of args.selling ?? []) {
        ensureVariant(map, offer.level, offer.p).selling.push(offer)
    }
    for (const offer of args.buying ?? []) {
        ensureVariant(map, offer.level, offer.p).buying.push(offer)
    }
    for (const row of args.dealWts ?? []) {
        ensureVariant(map, row.level, row.p).dealWts.push(row)
    }
    for (const row of args.dealWtb ?? []) {
        ensureVariant(map, row.level, row.p).dealWtb.push(row)
    }

    const groups = [...map.values()]
    // Level high→low, then title (`p`) A→Z; untitled after titled at the same level.
    groups.sort((a, b) => {
        const al = a.level ?? -1
        const bl = b.level ?? -1
        if (al !== bl) return bl - al
        if (a.p && !b.p) return -1
        if (!a.p && b.p) return 1
        if (a.p && b.p) return a.p.localeCompare(b.p)
        return 0
    })
    return groups
}

/**
 * Pick a representative level/title for the /trade thumbnail from live offers.
 * Prefers any title (game field `.p`), then the highest level > 0. Quantity is ignored.
 */
export function pickTradeIconOverlays(args: {
    selling?: Array<{ level?: number; p?: string }>
    buying?: Array<{ level?: number; p?: string }>
    dealWts?: Array<{ level?: number; p?: string }>
    dealWtb?: Array<{ level?: number; p?: string }>
}): { level?: number; p?: ItemTitle } {
    const rows = [
        ...(args.selling ?? []),
        ...(args.buying ?? []),
        ...(args.dealWts ?? []),
        ...(args.dealWtb ?? []),
    ]
    let p: ItemTitle | undefined
    let level: number | undefined
    for (const row of rows) {
        if (!p && row.p) p = row.p as ItemTitle
        if (row.level !== undefined && row.level > 0) {
            level = level === undefined ? row.level : Math.max(level, row.level)
        }
    }
    return { ...(level !== undefined ? { level } : {}), ...(p ? { p } : {}) }
}

/** Distinct variants for summary labels (includes plain when grouped). */
export function listTradeVariants(args: {
    G?: TradeIconG
    item: string
    selling?: MergedMerchantOffer[]
    buying?: MergedMerchantOffer[]
    dealWts?: DealRow[]
    dealWtb?: DealRow[]
}): string[] {
    const groups = groupTradeByVariant(args)
    return groups.map((group) => {
        if (args.G) {
            return getFullItemName(args.G, args.item, { level: group.level, p: group.p })
        }
        const bits: string[] = []
        if (group.p) bits.push(group.p)
        if (group.level !== undefined && group.level > 0) bits.push(`+${group.level}`)
        if (group.level === 0) bits.push("+0")
        return bits.length ? bits.join(" ") : args.item
    })
}

function dealLine(row: DealRow): string {
    const qty = row.quantity !== undefined ? String(row.quantity) : "—"
    return `${pad(row.owner, 12)} ${pad(qty, 4)} ${row.terms}`
}

function dealHeader(): string {
    return `${pad("Owner", 12)} ${pad("Qty", 4)} Terms`
}

/** Qty-weighted stand price stats. */
function standPriceStats(offers: MergedMerchantOffer[]): {
    min: number
    max: number
    avg: number
    qty: number
} | null {
    if (!offers.length) return null
    let min = Infinity
    let max = -Infinity
    let qty = 0
    let weighted = 0
    for (const offer of offers) {
        min = Math.min(min, offer.price)
        max = Math.max(max, offer.price)
        qty += offer.quantity
        weighted += offer.price * offer.quantity
    }
    return { min, max, avg: Math.round(weighted / qty), qty }
}

function dealGoldStats(rows: DealRow[]): { min: number; max: number; avg: number; count: number } | null {
    const priced = rows.filter((r) => r.price !== undefined) as Array<DealRow & { price: number }>
    if (!priced.length) return null
    let min = Infinity
    let max = -Infinity
    let sum = 0
    for (const row of priced) {
        min = Math.min(min, row.price)
        max = Math.max(max, row.price)
        sum += row.price
    }
    return { min, max, avg: Math.round(sum / priced.length), count: priced.length }
}

function formatVsG(price: number, g: number): string {
    const ratio = price / g
    if (ratio >= 10) return `${Math.round(ratio)}×`
    if (ratio >= 1) return `${ratio.toFixed(1)}×`
    return `${ratio.toFixed(2)}×`
}

function formatStandBlurb(
    label: string,
    stats: { min: number; max: number; avg: number; qty: number },
    g: number | null,
): string {
    const range =
        stats.min === stats.max
            ? `**${formatGoldShort(stats.min)}**`
            : `**${formatGoldShort(stats.min)}**–**${formatGoldShort(stats.max)}**`
    const avg = stats.min !== stats.max ? ` · avg **${formatGoldShort(stats.avg)}**` : ""
    const vsG = g ? ` (${formatVsG(stats.min, g)}G)` : ""
    return `${label} ${range}${avg}${vsG} · **${formatGold(stats.qty)}** avail`
}

function standsTable(
    selling: MergedMerchantOffer[],
    buying: MergedMerchantOffer[],
    budget: number,
    g: number | null,
    opts?: { compact?: boolean },
): { body: string; blurb: string } {
    const sellStats = standPriceStats(selling)
    const buyStats = standPriceStats(buying)
    const blurbs: string[] = []
    if (sellStats) blurbs.push(formatStandBlurb("Sell", sellStats, g))
    if (buyStats) blurbs.push(formatStandBlurb("Buy", buyStats, g))

    const lineFn = opts?.compact ? merchantLineCompact : merchantLine
    const header = opts?.compact ? merchantHeaderCompact() : merchantHeader()
    const sellLines = selling.length ? [header, ...selling.map(lineFn)] : []
    const buyLines = buying.length ? [header, ...buying.map(lineFn)] : []
    return {
        body: stackedSections("▸ Selling", sellLines, "▸ Buying", buyLines, budget),
        blurb: blurbs.join("\n"),
    }
}

function dealsTable(wts: DealRow[], wtb: DealRow[], budget: number): { body: string; blurb: string } {
    const sellGold = dealGoldStats(wts)
    const buyGold = dealGoldStats(wtb)
    const barter =
        wts.filter((r) => r.price === undefined).length + wtb.filter((r) => r.price === undefined).length
    const bits: string[] = []
    if (sellGold) {
        bits.push(
            sellGold.min === sellGold.max
                ? `WTS **${formatGoldShort(sellGold.min)}**`
                : `WTS **${formatGoldShort(sellGold.min)}**–**${formatGoldShort(sellGold.max)}**`,
        )
    }
    if (buyGold) {
        bits.push(
            buyGold.min === buyGold.max
                ? `WTB **${formatGoldShort(buyGold.max)}**`
                : `WTB **${formatGoldShort(buyGold.min)}**–**${formatGoldShort(buyGold.max)}**`,
        )
    }
    if (barter) bits.push(`${barter} item trade${barter === 1 ? "" : "s"}`)

    const wtsLines = wts.length ? [dealHeader(), ...wts.map(dealLine)] : []
    const wtbLines = wtb.length ? [dealHeader(), ...wtb.map(dealLine)] : []
    return {
        body: stackedSections("▸ WTS", wtsLines, "▸ WTB", wtbLines, budget),
        blurb: bits.join(" · "),
    }
}

/** Combined stands + deals for one variant embed. */
function variantTable(
    group: TradeVariantGroup,
    budget: number,
    g: number | null,
): { body: string; blurb: string } {
    const sellStats = standPriceStats(group.selling)
    const buyStats = standPriceStats(group.buying)
    const blurbs: string[] = []
    if (sellStats) blurbs.push(formatStandBlurb("Sell", sellStats, g))
    if (buyStats) blurbs.push(formatStandBlurb("Buy", buyStats, g))

    const sellGold = dealGoldStats(group.dealWts)
    const buyGold = dealGoldStats(group.dealWtb)
    const barter =
        group.dealWts.filter((r) => r.price === undefined).length +
        group.dealWtb.filter((r) => r.price === undefined).length
    const dealBits: string[] = []
    if (sellGold) {
        dealBits.push(
            sellGold.min === sellGold.max
                ? `WTS **${formatGoldShort(sellGold.min)}**`
                : `WTS **${formatGoldShort(sellGold.min)}**–**${formatGoldShort(sellGold.max)}**`,
        )
    }
    if (buyGold) {
        dealBits.push(
            buyGold.min === buyGold.max
                ? `WTB **${formatGoldShort(buyGold.max)}**`
                : `WTB **${formatGoldShort(buyGold.min)}**–**${formatGoldShort(buyGold.max)}**`,
        )
    }
    if (barter) dealBits.push(`${barter} item trade${barter === 1 ? "" : "s"}`)
    if (dealBits.length) blurbs.push(dealBits.join(" · "))

    const sellLines = group.selling.length
        ? [merchantHeaderCompact(), ...group.selling.map(merchantLineCompact)]
        : []
    const buyLines = group.buying.length
        ? [merchantHeaderCompact(), ...group.buying.map(merchantLineCompact)]
        : []
    const wtsLines = group.dealWts.length ? [dealHeader(), ...group.dealWts.map(dealLine)] : []
    const wtbLines = group.dealWtb.length ? [dealHeader(), ...group.dealWtb.map(dealLine)] : []

    return {
        body: multiStackedSections(
            [
                { title: "▸ Selling", lines: sellLines },
                { title: "▸ Buying", lines: buyLines },
                { title: "▸ WTS", lines: wtsLines },
                { title: "▸ WTB", lines: wtbLines },
            ],
            budget,
        ),
        blurb: blurbs.join("\n"),
    }
}

function buildSummaryText(args: {
    item: string
    displayName: string
    variants: string[]
    gPrice: number | string
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    footer?: string
}): string {
    const { item, displayName, variants, gPrice, selling, buying, dealWts, dealWtb, footer } = args
    const gNum = typeof gPrice === "number" ? gPrice : Number(gPrice)
    const g = Number.isFinite(gNum) && gNum > 0 ? gNum : null
    const gLabel = typeof gPrice === "number" ? formatGold(gPrice) : String(gPrice)

    const namePart = displayName !== item ? `**${displayName}** (\`${item}\`)` : `**${displayName}**`
    const lines = [`**/trade** ${namePart} — base \`G\` **${gLabel}**`]

    if (variants.length > 1) {
        lines.push(`variants: ${variants.map((v) => `**${v}**`).join(" · ")}`)
    }

    const sellStats = standPriceStats(selling)
    const buyStats = standPriceStats(buying)

    const market: string[] = []
    if (sellStats) {
        market.push(
            `sell from **${formatGoldShort(sellStats.min)}**${g ? ` (${formatVsG(sellStats.min, g)}G)` : ""}`,
        )
    }
    if (buyStats) {
        market.push(
            `buy to **${formatGoldShort(buyStats.max)}**${g ? ` (${formatVsG(buyStats.max, g)}G)` : ""}`,
        )
    }
    if (sellStats && buyStats) {
        const spread = sellStats.min - buyStats.max
        if (spread > 0) market.push(`spread **${formatGoldShort(spread)}**`)
        else if (spread < 0) market.push(`overlap **${formatGoldShort(-spread)}**`)
    }
    if (market.length) lines.push(market.join(" · "))

    const dealCount = dealWts.length + dealWtb.length
    lines.push(
        `**${selling.length}** selling · **${buying.length}** buying · **${dealCount}** deal${dealCount === 1 ? "" : "s"}`,
    )

    if (footer) lines.push(`_${footer}_`)
    return lines.join("\n")
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

async function buildSingleVariantReply(args: {
    item: string
    displayName: string
    titledName: string
    variants: string[]
    gPrice: number | string
    g: number | null
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    footer?: string
    contentPrefix?: string
    icon?: TradeIconOpts
}): Promise<TradeReplyMessage[]> {
    const {
        item,
        displayName,
        titledName,
        variants,
        gPrice,
        g,
        selling,
        buying,
        dealWts,
        dealWtb,
        footer,
        contentPrefix,
        icon,
    } = args

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

    const hasStands = selling.length > 0 || buying.length > 0
    const hasDeals = dealWts.length > 0 || dealWtb.length > 0
    const perEmbedBudget = Math.min(EMBED_DESCRIPTION_LIMIT - 120, 3400)

    const stands = hasStands ? standsTable(selling, buying, perEmbedBudget, g) : null
    const deals = hasDeals ? dealsTable(dealWts, dealWtb, perEmbedBudget) : null
    const thumb = await resolveTradeIcon(item, icon)

    const embedLabel = titledName !== displayName ? titledName : displayName

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

async function buildMultiVariantReply(args: {
    item: string
    displayName: string
    variants: string[]
    groups: TradeVariantGroup[]
    gPrice: number | string
    g: number | null
    selling: MergedMerchantOffer[]
    buying: MergedMerchantOffer[]
    dealWts: DealRow[]
    dealWtb: DealRow[]
    footer?: string
    contentPrefix?: string
    G: TradeIconG
}): Promise<TradeReplyMessage[]> {
    const {
        item,
        displayName,
        variants,
        groups,
        gPrice,
        g,
        selling,
        buying,
        dealWts,
        dealWtb,
        footer,
        contentPrefix,
        G,
    } = args

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
    const perEmbedBudget = Math.min(EMBED_DESCRIPTION_LIMIT - 120, 3400)

    const pieces: VariantEmbedPiece[] = []
    for (const group of groups) {
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
        pieces.push({ embed, thumb })
    }

    return chunkVariantMessages(content, pieces)
}

/**
 * Short summary in message content + stacked ASCII tables in embeds.
 * Multiple (level, title) variants → one embed each with matching icon.
 * Single variant → stands embed + deals embed (legacy layout).
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

    if (groups.length > 1 && icon?.G) {
        return buildMultiVariantReply({
            item,
            displayName,
            variants,
            groups,
            gPrice,
            g,
            selling,
            buying,
            dealWts,
            dealWtb,
            footer,
            contentPrefix,
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

    return buildSingleVariantReply({
        item,
        displayName,
        titledName,
        variants,
        gPrice,
        g,
        selling,
        buying,
        dealWts,
        dealWtb,
        footer,
        contentPrefix,
        icon: icon?.G ? { G: icon.G, ...overlays } : undefined,
    })
}
