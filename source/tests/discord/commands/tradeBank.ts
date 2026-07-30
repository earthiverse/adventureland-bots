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
    listings: TradeListing[]
    lastUpdated?: number
    label?: string
    characters?: string[]
    discordName?: string
    discordId?: string
}

export function ownerDisplayName(ownerTrades: OwnerTrades): string {
    if (ownerTrades.label) return ownerTrades.label
    return ownerTrades.owner
}

/**
 * Plain-text owner prefix for bank lines.
 * Never emit `<@id>` / mention syntax — the /trade bot must not ping listing owners.
 * Only append Discord when it differs from the display label (avoids "earthiverse (Discord: earthiverse)").
 */
export function ownerBankPrefix(ownerTrades: OwnerTrades): string {
    const name = ownerDisplayName(ownerTrades)
    const discord = ownerTrades.discordName?.trim()
    if (discord && discord.toLowerCase() !== name.toLowerCase()) {
        return `${name} (@${discord})`
    }
    return name
}

export function formatListingMeta(listing: ItemRef): string {
    const parts: string[] = []
    if (listing.level !== undefined) parts.push(`level ${listing.level}`)
    if (listing.p) parts.push(listing.p)
    return parts.join(" ")
}

export function formatBankSideLines(owner: string, sideLabel: "WTS" | "WTB", listing: TradeListing, side: TradeSide): string[] {
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
