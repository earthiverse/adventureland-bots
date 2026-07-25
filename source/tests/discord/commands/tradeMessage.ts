import type { ItemDataTrade } from "alclient"

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
            const cmp = (b.p as string).localeCompare(a.p)
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

export function collectMerchantOffers(
    players: any[],
    item: string,
): { buying: MerchantOffer[]; selling: MerchantOffer[] } {
    const buying: MerchantOffer[] = []
    const selling: MerchantOffer[] = []

    for (const player of players) {
        if (Date.now() - Date.parse(player.lastSeen) > 8.64e7) continue
        for (const slotName in player.slots) {
            const slot = player.slots[slotName] as ItemDataTrade
            if (!slot || slot.name !== item) continue
            if (slot.giveaway) continue

            const base = {
                id: player.id as string,
                level: slot.level,
                price: slot.price,
                q: slot.q,
                serverIdentifier: player.serverIdentifier as string,
                serverRegion: player.serverRegion as string,
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
