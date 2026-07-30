/**
 * Group stand + deal rows by (level, title/`p`) variant.
 */
import { getFullItemName, type GLike, type ItemTitle } from "./itemIcon.js"
import type { DealRow } from "./tradeDeals.js"
import type { MergedMerchantOffer } from "./tradeMessage.js"

/** G subset needed to crop item icons (alclient GData is compatible). */
export type TradeIconG = GLike

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
