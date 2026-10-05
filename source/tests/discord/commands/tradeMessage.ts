import { formatRatioTerms, type DealRow, type ItemRef } from "./tradeDeals.js"

const DISCORD_CONTENT_LIMIT = 2000
const DAY_MS = 8.64e7

export function truncateDiscordContent(content: string): string {
    if (content.length <= DISCORD_CONTENT_LIMIT) return content
    const suffix = "\n… (truncated)"
    return content.slice(0, DISCORD_CONTENT_LIMIT - suffix.length) + suffix
}

export type MerchantOffer = {
    id: string
    level?: number
    p?: string
    price: number
    q?: number
    serverIdentifier: string
    serverRegion: string
}

export type MergedMerchantOffer = MerchantOffer & {
    /** Total items across merged slots */
    quantity: number
    /** Number of stand slots merged into this line */
    stacks: number
}

/** Item-for-item want from `pull_merchants` / `trade_offer` slots. */
export type TradeWantRef = ItemRef & { q?: number }

type MerchantTradeSlot = {
    name?: string
    level?: number
    p?: string
    q?: number
    price?: number
    b?: boolean
    giveaway?: unknown
    want?: unknown
}

type MerchantPlayer = {
    id: string
    lastSeen: string
    serverIdentifier: string
    serverRegion: string
    slots: Record<string, unknown>
}

/** Group key: same merchant, server, price, level, and title → one line. */
export function merchantOfferKey(offer: MerchantOffer): string {
    return [
        offer.id,
        offer.serverRegion,
        offer.serverIdentifier,
        String(offer.price),
        offer.level ?? "",
        offer.p ?? "",
    ].join("|")
}

/**
 * Merge identical merchant listings (same seller/server/price/level/title).
 * Sums quantity and counts how many stand slots were combined.
 */
export function mergeMerchantOffers(offers: MerchantOffer[]): MergedMerchantOffer[] {
    const byKey = new Map<string, MergedMerchantOffer>()

    for (const offer of offers) {
        const key = merchantOfferKey(offer)
        const qty = offer.q ?? 1
        const existing = byKey.get(key)
        if (!existing) {
            byKey.set(key, {
                ...offer,
                quantity: qty,
                stacks: 1,
            })
            continue
        }
        existing.quantity += qty
        existing.stacks += 1
    }

    return [...byKey.values()]
}

export function sortMerchantOffers(offers: MergedMerchantOffer[], side: "sell" | "buy"): MergedMerchantOffer[] {
    const sorted = [...offers]
    sorted.sort((a, b) => {
        if (a.level !== undefined && b.level !== undefined && a.level !== b.level) {
            return b.level - a.level
        }
        if (a.p && !b.p) return -1
        if (!a.p && b.p) return 1
        if (a.p && b.p) {
            const cmp = b.p.localeCompare(a.p)
            if (cmp !== 0) return cmp
        }
        // Sell: cheapest first. Buy: highest first.
        return side === "sell" ? a.price - b.price : b.price - a.price
    })
    return sorted
}

export function formatMerchantLine(offer: MergedMerchantOffer, verb: "selling" | "buying"): string {
    const title = offer.p ? `${offer.p} ` : ""
    const level = offer.level === undefined ? "" : `level ${offer.level} `
    const stacks = offer.stacks > 1 ? ` (${offer.stacks} stacks)` : ""
    return `${offer.id} (${offer.serverRegion} ${offer.serverIdentifier}) is ${verb} ${offer.quantity.toLocaleString()} ${title}${level}@ ${offer.price.toLocaleString()}${stacks}`
}

export function normalizeTradeWant(want: unknown): TradeWantRef | null {
    if (typeof want === "string") {
        if (!want) return null
        return { name: want }
    }
    if (!want || typeof want !== "object") return null
    const record = want as Record<string, unknown>
    if (typeof record.name !== "string" || !record.name) return null
    return {
        name: record.name,
        ...(typeof record.level === "number" ? { level: record.level } : {}),
        ...(typeof record.p === "string" && record.p ? { p: record.p } : {}),
        ...(typeof record.q === "number" ? { q: record.q } : {}),
    }
}

function merchantOwnerLabel(player: MerchantPlayer): string {
    return `${player.id} (${player.serverRegion} ${player.serverIdentifier})`
}

function coerceLastSeen(value: unknown): string | null {
    if (typeof value === "string" && value) return value
    if (typeof value === "number" && Number.isFinite(value)) {
        return new Date(value).toISOString()
    }
    return null
}

function isFreshMerchant(lastSeen: string, now = Date.now()): boolean {
    const seen = Date.parse(lastSeen)
    return Number.isFinite(seen) && now - seen <= DAY_MS
}

function readMerchantPlayers(players: unknown): MerchantPlayer[] {
    if (!Array.isArray(players)) return []
    const out: MerchantPlayer[] = []
    for (const player of players) {
        if (!player || typeof player !== "object") continue
        const record = player as Record<string, unknown>
        const id =
            typeof record.id === "string" && record.id
                ? record.id
                : typeof record.name === "string" && record.name
                    ? record.name
                    : null
        const lastSeen = coerceLastSeen(record.lastSeen)
        if (!id || !lastSeen) continue
        if (typeof record.serverIdentifier !== "string" || typeof record.serverRegion !== "string") continue
        if (!record.slots || typeof record.slots !== "object") continue
        out.push({
            id,
            lastSeen,
            serverIdentifier: record.serverIdentifier,
            serverRegion: record.serverRegion,
            slots: record.slots as Record<string, unknown>,
        })
    }
    return out
}

function readTradeSlot(value: unknown): MerchantTradeSlot | null {
    if (!value || typeof value !== "object") return null
    const record = value as Record<string, unknown>
    if (typeof record.name !== "string") return null
    return {
        name: record.name,
        ...(typeof record.level === "number" ? { level: record.level } : {}),
        ...(typeof record.p === "string" ? { p: record.p } : {}),
        ...(typeof record.q === "number" ? { q: record.q } : {}),
        ...(typeof record.price === "number" ? { price: record.price } : {}),
        ...(record.b === true ? { b: true } : {}),
        ...(record.giveaway !== undefined ? { giveaway: record.giveaway } : {}),
        ...(record.want !== undefined ? { want: record.want } : {}),
    }
}

/**
 * Gold buy/sell stand listings from `pull_merchants`.
 * Skips giveaways and item-for-item `want` swaps (see {@link collectMerchantSwapDealRows}).
 */
export function collectMerchantOffers(
    players: unknown,
    item: string,
): { buying: MerchantOffer[]; selling: MerchantOffer[] } {
    const buying: MerchantOffer[] = []
    const selling: MerchantOffer[] = []

    for (const player of readMerchantPlayers(players)) {
        if (!isFreshMerchant(player.lastSeen)) continue
        for (const slotName in player.slots) {
            const slot = readTradeSlot(player.slots[slotName])
            if (!slot || slot.name !== item) continue
            if (slot.giveaway) continue
            // Item-for-item trade_swap listings have `want` and no gold price.
            if (slot.want !== undefined) continue
            if (typeof slot.price !== "number" || !Number.isFinite(slot.price)) continue

            const base: MerchantOffer = {
                id: player.id,
                level: slot.level,
                price: slot.price,
                q: slot.q,
                serverIdentifier: player.serverIdentifier,
                serverRegion: player.serverRegion,
            }

            if (slot.b) {
                buying.push(base)
            } else {
                selling.push({
                    ...base,
                    p: slot.p,
                })
            }
        }
    }

    return { buying, selling }
}

/**
 * In-game item-for-item stand swaps from `/merchants` (`trade_offer` / `trade_swap`).
 * Separate from Earthiverse `/trades` bank deals.
 * - slot.name === item → offering (merchant lists the item for `want`)
 * - want.name === item → wanting (merchant wants the item for slot.name)
 */
export function collectMerchantSwapDealRows(
    players: unknown,
    item: string,
): { offering: DealRow[]; wanting: DealRow[] } {
    const offering: DealRow[] = []
    const wanting: DealRow[] = []

    for (const player of readMerchantPlayers(players)) {
        if (!isFreshMerchant(player.lastSeen)) continue
        const owner = merchantOwnerLabel(player)

        for (const slotName in player.slots) {
            const slot = readTradeSlot(player.slots[slotName])
            if (!slot?.name || slot.giveaway) continue
            const want = normalizeTradeWant(slot.want)
            if (!want) continue

            const listedQty = slot.q ?? 1
            const wantQty = want.q ?? 1
            const listed: ItemRef = {
                name: slot.name,
                ...(slot.level !== undefined ? { level: slot.level } : {}),
                ...(slot.p ? { p: slot.p } : {}),
            }
            const wanted: ItemRef = {
                name: want.name,
                ...(want.level !== undefined ? { level: want.level } : {}),
                ...(want.p ? { p: want.p } : {}),
            }

            if (slot.name === item) {
                const formatted = formatRatioTerms(item, "WTS", {
                    item: wanted,
                    give: listedQty,
                    receive: wantQty,
                })
                offering.push({
                    owner,
                    side: "WTS",
                    quantity: listedQty,
                    ...(slot.level !== undefined ? { level: slot.level } : {}),
                    ...(slot.p ? { p: slot.p } : {}),
                    terms: formatted.terms,
                    ratio: formatted.ratio,
                })
            }

            if (want.name === item) {
                const formatted = formatRatioTerms(item, "WTB", {
                    item: listed,
                    give: wantQty,
                    receive: listedQty,
                })
                wanting.push({
                    owner,
                    side: "WTB",
                    quantity: wantQty,
                    ...(want.level !== undefined ? { level: want.level } : {}),
                    ...(want.p ? { p: want.p } : {}),
                    terms: formatted.terms,
                    ratio: formatted.ratio,
                })
            }
        }
    }

    return { offering, wanting }
}
