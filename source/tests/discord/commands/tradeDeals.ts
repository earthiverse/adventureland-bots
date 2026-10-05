/**
 * Deal listing types and collectors for /trade replies.
 */

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
    /** Reduced item-for-item ratio matching arrow order (`1:3`). */
    ratio?: string
}

export function formatGold(n: number): string {
    return n.toLocaleString()
}

/** Compact gold for UI (1.46M, 900k, …). */
export function formatGoldShort(n: number): string {
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

function gcd(a: number, b: number): number {
    let x = Math.abs(Math.trunc(a))
    let y = Math.abs(Math.trunc(b))
    while (y) {
        const t = y
        y = x % y
        x = t
    }
    return x || 1
}

/** Reduced left:right ratio for item-for-item terms (matches arrow order). */
export function formatQuantityRatio(left: number, right: number): string {
    const l = Number.isFinite(left) && left > 0 ? left : 1
    const r = Number.isFinite(right) && right > 0 ? right : 1
    const g = gcd(l, r)
    return `${l / g}:${r / g}`
}

/** Compact lister-wallet terms + reduced ratio for table cells. */
export function formatRatioTerms(
    listedName: string,
    side: "WTS" | "WTB",
    offer: TradeOffer,
): { terms: string; ratio: string } {
    const other = formatOtherItem(offer.item)
    const nego = offer.negotiable ? " ~" : ""
    if (side === "WTB") {
        return {
            terms: `${offer.receive} ${other} → ${offer.give} ${listedName}${nego}`,
            ratio: formatQuantityRatio(offer.receive, offer.give),
        }
    }
    return {
        terms: `${offer.give} ${listedName} → ${offer.receive} ${other}${nego}`,
        ratio: formatQuantityRatio(offer.give, offer.receive),
    }
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
                    const formatted = formatRatioTerms(item, sideLabel, offer)
                    bucket.push({
                        owner,
                        side: sideLabel,
                        quantity: tradeSide.quantity,
                        priceNegotiable: offer.negotiable,
                        ...listingMeta,
                        terms: formatted.terms,
                        ratio: formatted.ratio,
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
