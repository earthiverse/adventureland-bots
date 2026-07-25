/**
 * Render Adventure Land item instances for Discord embeds.
 *
 * Mirrors market-tracker `ItemInstance` + `ItemImage`:
 * - crop skin tile from packed sheets via G.positions / G.imagesets
 * - title (`.p`) colored border
 * - level badge (upgrade/compound letters + colors)
 * - optional quantity badge
 */
import AL, { type ItemName } from "alclient"
import sharp from "sharp"

const AL_ORIGIN = "https://adventure.land"

/** Native inventory icon size used by ItemImage / ItemInstance. */
const NATIVE_ICON = 40
const NATIVE_BORDER = 2
const NATIVE_PAD = 1
const NATIVE_BADGE = 18

type Imageset = {
    size: number
    rows: number
    columns: number
    file: string
}

type GItemLike = {
    skin?: string
    skin_a?: string
    upgrade?: unknown
    compound?: unknown
    name?: string
}

type GLike = {
    items: Record<string, GItemLike | undefined>
    positions: Record<string, [string, number, number] | undefined>
    imagesets: Record<string, Imageset | undefined>
    titles?: Record<string, { title?: string } | undefined>
}

export type ItemTitle =
    | "festive"
    | "firehazard"
    | "glitched"
    | "gooped"
    | "legacy"
    | "lucky"
    | "shiny"
    | "superfast"
    | string

/** Special t-shirt display names — same map as market-tracker ItemDisplay. */
const TSHIRT_NAMES: Record<string, string> = {
    tshirt88: "Lucky",
    tshirt9: "Manasteal",
    tshirt3: "XP",
    tshirt8: "Attack MP",
    tshirt7: "Armor piercing",
    tshirt6: "Res. piercing",
    tshirt4: "Speed",
}

export function getItemBaseName(G: GLike, itemKey: string): string {
    const gItem = G.items[itemKey]
    const base = gItem?.name ?? itemKey
    const prefix = TSHIRT_NAMES[itemKey]
    return prefix ? `${prefix} ${base}` : base
}

export function getTitleName(G: GLike, p?: string): string {
    if (!p) return ""
    return G.titles?.[p]?.title ?? ""
}

/**
 * Market-tracker `getFullItemName` / ItemDisplay formatting:
 * `+9 Glitched Pink Wand`
 */
export function getFullItemName(
    G: GLike,
    itemKey: string,
    opts?: { level?: number; p?: string },
): string {
    const gItem = G.items[itemKey] ?? {}
    const titleName = getTitleName(G, opts?.p)
    const itemName = getItemBaseName(G, itemKey)
    const level = opts?.level
    const levelString = getLevelString(gItem, level)
    const levelPrefix =
        levelString !== undefined && level !== undefined && level > 0
            ? `+${levelString} `
            : level !== undefined && level > 0
              ? `+${level} `
              : ""
    return `${levelPrefix}${titleName ? `${titleName} ` : ""}${itemName}`
}

export type ItemInstanceOpts = {
    level?: number
    /** Item title key (`shiny`, `festive`, …) — game field `p`. */
    p?: ItemTitle
    quantity?: number
    showQuantity?: boolean
    showTitleBorder?: boolean
    /** Output scale vs native 40px ItemInstance (default 2 → ~92px). */
    scale?: number
    active?: boolean
}

const sheetCache = new Map<string, Promise<Buffer>>()

const TITLE_BORDER: Record<string, string> = {
    festive: "#79ff7e",
    firehazard: "#f79b11",
    glitched: "#6b7280",
    gooped: "#64B867",
    legacy: "#ffffff",
    lucky: "#00f3ff",
    shiny: "#99b2d8",
    superfast: "#c681dc",
}

/** Absolute sheet URL, preserving `?v=` so cache busts when G bumps the pack version. */
function absoluteSheetUrl(file: string): string {
    if (file.startsWith("http")) return file
    return `${AL_ORIGIN}${file.startsWith("/") ? file : `/${file}`}`
}

async function fetchSheet(file: string): Promise<Buffer> {
    // Key + fetch include `?v=` — AL bumps that when the pack PNG changes at the same path.
    const url = absoluteSheetUrl(file)
    let pending = sheetCache.get(url)
    if (!pending) {
        pending = (async () => {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`Failed to fetch sheet ${url}: ${res.status}`)
            return Buffer.from(await res.arrayBuffer())
        })()
        sheetCache.set(url, pending)
    }
    return pending
}

export function resolveItemSkin(G: GLike, itemName: string, opts?: { active?: boolean }): string {
    const gItem = G.items[itemName]
    if (!gItem) return "placeholder"
    if (opts?.active && gItem.skin_a) return gItem.skin_a
    return gItem.skin ?? itemName
}

export function resolveSkinCrop(G: GLike, skin: string): {
    pack: Imageset
    packKey: string
    col: number
    row: number
    size: number
    sheetUrl: string
} {
    const pos = G.positions[skin] ?? G.positions.placeholder
    if (!pos) throw new Error(`No G.positions entry for skin ${skin}`)
    const packKey = pos[0] || "pack_20"
    const pack = G.imagesets[packKey]
    if (!pack) throw new Error(`No G.imagesets entry for ${packKey}`)
    return {
        pack,
        packKey,
        col: pos[1],
        row: pos[2],
        size: pack.size,
        sheetUrl: absoluteSheetUrl(pack.file),
    }
}

/** Port of market-tracker `getLevelString`. */
export function getLevelString(gItem: GItemLike, level?: number): string | number | undefined {
    if (gItem.upgrade) {
        const capped = Math.min(level ?? 0, 13)
        switch (capped) {
            case 12:
                return "Z"
            case 11:
                return "Y"
            case 10:
                return "X"
            default:
                return capped
        }
    }
    if (gItem.compound) {
        let capped = level ?? 0
        if (capped > 7) capped = 7
        switch (capped) {
            case 7:
                return "R"
            case 6:
                return "S"
            case 5:
                return "V"
            default:
                return capped
        }
    }
    return undefined
}

function levelTextColor(gItem: GItemLike, level: number): string {
    if (gItem.compound) {
        if (level === 4) return "#FFC949"
        if (level === 5) return "#B753C7"
        return "#d1d5db"
    }
    if (gItem.upgrade) {
        if (level === 8) return "#FFC949"
        if (level === 9) return "#E64D31"
        if (level >= 10) return "#B753C7"
        return "#d1d5db"
    }
    return "#d1d5db"
}

function abbreviateNumber(number: number): string {
    const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"]
    const tier = (Math.log10(Math.abs(number)) / 3) | 0
    if (tier === 0) return String(number)
    const suffix = SI_SYMBOL[tier] ?? ""
    const scaled = number / 10 ** (tier * 3)
    return scaled.toFixed(1) + suffix
}

function titleBorderColor(p: string | undefined, show: boolean): string | null {
    if (!show || !p) return null
    return TITLE_BORDER[p] ?? null
}

/** Render like market-tracker ItemInstance for Discord attachment thumbnails. */
export async function renderItemIcon(
    G: GLike,
    itemName: string,
    opts: ItemInstanceOpts = {},
): Promise<{ png: Buffer; filename: string; skin: string; sheetUrl: string }> {
    const gItem = G.items[itemName] ?? {}
    const scale = opts.scale ?? 2
    const iconSize = NATIVE_ICON * scale
    const border = NATIVE_BORDER * scale
    const pad = NATIVE_PAD * scale
    const badge = NATIVE_BADGE * scale
    const canvas = iconSize + 2 * border + 2 * pad

    const showTitleBorder = opts.showTitleBorder ?? !!opts.p
    const borderColor = titleBorderColor(opts.p, showTitleBorder)

    const skin = resolveItemSkin(G, itemName, { active: opts.active })
    const crop = resolveSkinCrop(G, skin)
    const sheet = await fetchSheet(crop.pack.file)
    const left = crop.col * crop.size
    const top = crop.row * crop.size

    const iconPng = await sharp(sheet)
        .extract({ left, top, width: crop.size, height: crop.size })
        .resize(iconSize, iconSize, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer()

    const composites: Array<{ input: Buffer; left: number; top: number }> = [
        {
            input: iconPng,
            left: border + pad,
            top: border + pad,
        },
    ]

    const level = opts.level ?? 0
    const levelString = getLevelString(gItem, level)
    const showLevel =
        level > 0 && (!!gItem.upgrade || !!gItem.compound || levelString !== undefined)
    if (showLevel) {
        const label =
            levelString !== undefined ? String(levelString) : String(level)
        composites.push({
            input: Buffer.from(levelBadgeSvg(label, levelTextColor(gItem, level), badge, canvas)),
            left: border,
            top: canvas - border - badge,
        })
    }

    const showQty = opts.showQuantity ?? (opts.quantity !== undefined && opts.quantity > 1)
    if (showQty && opts.quantity !== undefined && opts.quantity > 0) {
        const qtyLabel = abbreviateNumber(opts.quantity)
        const qtyW = Math.min(canvas - border * 2, Math.max(badge, Math.round(badge * 0.55 * qtyLabel.length + 8)))
        composites.push({
            input: Buffer.from(quantityBadgeSvg(qtyLabel, qtyW, badge)),
            left: canvas - border - qtyW,
            top: canvas - border - badge,
        })
    }

    // Transparent canvas + optional title border (ItemInstance border-2)
    const svgFrame = `<svg width="${canvas}" height="${canvas}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${canvas}" height="${canvas}" fill="none"
    stroke="${borderColor ?? "transparent"}" stroke-width="${borderColor ? border : 0}"/>
</svg>`

    const png = await sharp({
        create: {
            width: canvas,
            height: canvas,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([
            { input: Buffer.from(svgFrame), left: 0, top: 0 },
            ...composites,
        ])
        .png()
        .toBuffer()

    const parts = [itemName]
    if (opts.level !== undefined && opts.level > 0) parts.push(`l${opts.level}`)
    if (opts.p) parts.push(String(opts.p))
    if (showQty && opts.quantity) parts.push(`q${opts.quantity}`)
    const filename = `${parts.join("_")}.png`.replace(/[^a-zA-Z0-9._-]/g, "_")

    return { png, filename, skin, sheetUrl: crop.sheetUrl }
}

function levelBadgeSvg(label: string, color: string, size: number, _canvas: number): string {
    const fontSize = Math.max(10, Math.round(size * 0.68))
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000ca" stroke="#1f2937" stroke-width="1"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" fill="${color}">${escapeXml(
        label,
    )}</text>
</svg>`
}

function quantityBadgeSvg(label: string, width: number, height: number): string {
    const fontSize = Math.max(10, Math.round(height * 0.675))
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#00000071" stroke="#1f2937" stroke-width="0.5"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" fill="#e5e7eb">${escapeXml(label)}</text>
</svg>`
}

function escapeXml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Convenience: load G via alclient then render. */
export async function renderItemIconByName(itemName: ItemName | string, opts?: ItemInstanceOpts) {
    const G = (await AL.Game.getGData()) as unknown as GLike
    return renderItemIcon(G, itemName, opts)
}
