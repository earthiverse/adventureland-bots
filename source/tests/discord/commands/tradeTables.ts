/**
 * ASCII table builders, blurbs, and summary text for /trade embeds.
 */
import type { DealRow } from "./tradeDeals.js"
import { formatGold, formatGoldShort } from "./tradeDeals.js"
import type { MergedMerchantOffer } from "./tradeMessage.js"
import type { TradeVariantGroup } from "./tradeVariants.js"

export { formatGold, formatGoldShort }

export function pad(value: string, width: number): string {
    if (value.length > width) return value.slice(0, Math.max(1, width - 1)) + "…"
    return value.padEnd(width)
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

/** Shared deal blurb used by dealsTable and variantTable. */
function formatDealBlurb(wts: DealRow[], wtb: DealRow[]): string {
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
    return bits.join(" · ")
}

function standBlurbs(
    selling: MergedMerchantOffer[],
    buying: MergedMerchantOffer[],
    g: number | null,
): string[] {
    const sellStats = standPriceStats(selling)
    const buyStats = standPriceStats(buying)
    const blurbs: string[] = []
    if (sellStats) blurbs.push(formatStandBlurb("Sell", sellStats, g))
    if (buyStats) blurbs.push(formatStandBlurb("Buy", buyStats, g))
    return blurbs
}

export function standsTable(
    selling: MergedMerchantOffer[],
    buying: MergedMerchantOffer[],
    budget: number,
    g: number | null,
    opts?: { compact?: boolean },
): { body: string; blurb: string } {
    const lineFn = opts?.compact ? merchantLineCompact : merchantLine
    const header = opts?.compact ? merchantHeaderCompact() : merchantHeader()
    const sellLines = selling.length ? [header, ...selling.map(lineFn)] : []
    const buyLines = buying.length ? [header, ...buying.map(lineFn)] : []
    return {
        body: stackedSections("▸ Selling", sellLines, "▸ Buying", buyLines, budget),
        blurb: standBlurbs(selling, buying, g).join("\n"),
    }
}

export function dealsTable(wts: DealRow[], wtb: DealRow[], budget: number): { body: string; blurb: string } {
    const wtsLines = wts.length ? [dealHeader(), ...wts.map(dealLine)] : []
    const wtbLines = wtb.length ? [dealHeader(), ...wtb.map(dealLine)] : []
    return {
        body: stackedSections("▸ WTS", wtsLines, "▸ WTB", wtbLines, budget),
        blurb: formatDealBlurb(wts, wtb),
    }
}

/** Combined stands + deals for one variant embed. */
export function variantTable(
    group: TradeVariantGroup,
    budget: number,
    g: number | null,
): { body: string; blurb: string } {
    const blurbs = standBlurbs(group.selling, group.buying, g)
    const dealBlurb = formatDealBlurb(group.dealWts, group.dealWtb)
    if (dealBlurb) blurbs.push(dealBlurb)

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

export function buildSummaryText(args: {
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
