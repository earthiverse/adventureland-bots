import { Attribute, Character, Game, Item, ItemData, ItemName, ItemType, LocateItemFilters, SlotType, WeaponType } from "alclient"
import { EnsureEquipped, EnsureEquippedSlot } from "../strategies/attack"

export const RETURN_HIGHEST: LocateItemFilters = { returnHighestLevel: true }
export const UNEQUIP: EnsureEquippedSlot = { name: undefined, unequip: true }

export const MAGE_ARMOR: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "tigercape", filters: RETURN_HIGHEST },
    chest: { name: "harmor", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "hgloves", filters: RETURN_HIGHEST },
    helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
    offhand: { name: "wbookhs", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "hpants", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "vboots", filters: RETURN_HIGHEST },
}

export const MAGE_NORMAL: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "tigercape", filters: RETURN_HIGHEST },
    chest: { name: "wattire", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "wgloves", filters: RETURN_HIGHEST },
    helmet: { name: "wcap", filters: RETURN_HIGHEST },
    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
    offhand: { name: "wbook1", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "wbreeches", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "wshoes", filters: RETURN_HIGHEST },
}

export const MAGE_SPLASH: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "tigercape", filters: RETURN_HIGHEST },
    chest: { name: "harmor", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "hgloves", filters: RETURN_HIGHEST },
    helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
    mainhand: { name: "gstaff", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "hpants", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "vboots", filters: RETURN_HIGHEST },
}

export const MAGE_FAST: EnsureEquipped = {
    ...MAGE_NORMAL,
    mainhand: { name: "pinkie", filters: RETURN_HIGHEST },
}

export const PRIEST_ARMOR: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "angelwings", filters: RETURN_HIGHEST },
    chest: { name: "vattire", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "vgloves", filters: RETURN_HIGHEST },
    helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
    offhand: { name: "tigershield", filters: RETURN_HIGHEST },
    orb: { name: "tigerstone", filters: RETURN_HIGHEST },
    pants: { name: "hpants", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "hboots", filters: RETURN_HIGHEST },
}

export const PRIEST_NORMAL: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "angelwings", filters: RETURN_HIGHEST },
    chest: { name: "vattire", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "vgloves", filters: RETURN_HIGHEST },
    helmet: { name: "hhelmet", filters: RETURN_HIGHEST },
    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
    offhand: { name: "wbookhs", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "hpants", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "hboots", filters: RETURN_HIGHEST },
}

export const PRIEST_LUCK: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "angelwings", filters: RETURN_HIGHEST },
    chest: { name: "tshirt88", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "dexearringx", filters: RETURN_HIGHEST },
    gloves: { name: "wgloves", filters: RETURN_HIGHEST },
    helmet: { name: "wcap", filters: RETURN_HIGHEST },
    mainhand: { name: "lmace", filters: RETURN_HIGHEST },
    offhand: { name: "mshield", filters: RETURN_HIGHEST },
    orb: { name: "rabbitsfoot", filters: RETURN_HIGHEST },
    pants: { name: "wbreeches", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "ringofluck", filters: RETURN_HIGHEST },
    shoes: { name: "wingedboots", filters: RETURN_HIGHEST },
}

export const PRIEST_FAST: EnsureEquipped = {
    ...PRIEST_NORMAL,
    mainhand: { name: "wand", filters: RETURN_HIGHEST },
}
delete PRIEST_FAST.offhand

export const WARRIOR_NORMAL: EnsureEquipped = {
    amulet: { name: "snring", filters: RETURN_HIGHEST },
    belt: { name: "strbelt", filters: RETURN_HIGHEST },
    cape: { name: "bcape", filters: RETURN_HIGHEST },
    chest: { name: "coat1", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "gloves1", filters: RETURN_HIGHEST },
    helmet: { name: "helmet1", filters: RETURN_HIGHEST },
    mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
    offhand: { name: "fireblade", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "pants1", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "strring", filters: RETURN_HIGHEST },
    shoes: { name: "wingedboots", filters: RETURN_HIGHEST },
}

export const WARRIOR_SPLASH: EnsureEquipped = {
    amulet: { name: "snring", filters: RETURN_HIGHEST },
    belt: { name: "strbelt", filters: RETURN_HIGHEST },
    cape: { name: "bcape", filters: RETURN_HIGHEST },
    chest: { name: "coat1", filters: RETURN_HIGHEST },
    gloves: { name: "gloves1", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    helmet: { name: "helmet1", filters: RETURN_HIGHEST },
    mainhand: { name: "vhammer", filters: RETURN_HIGHEST },
    offhand: { name: "ololipop", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "pants1", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "strring", filters: RETURN_HIGHEST },
    shoes: { name: "wingedboots", filters: RETURN_HIGHEST },
}

export const WARRIOR_STOMP: EnsureEquipped = {
    amulet: { name: "snring", filters: RETURN_HIGHEST },
    belt: { name: "strbelt", filters: RETURN_HIGHEST },
    cape: { name: "bcape", filters: RETURN_HIGHEST },
    chest: { name: "coat1", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "gloves1", filters: RETURN_HIGHEST },
    helmet: { name: "helmet1", filters: RETURN_HIGHEST },
    mainhand: { name: "basher", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "pants1", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "strring", filters: RETURN_HIGHEST },
    shoes: { name: "wingedboots", filters: RETURN_HIGHEST },
}

export const UNEQUIP_EVERYTHING: EnsureEquipped = {
    amulet: UNEQUIP,
    belt: UNEQUIP,
    cape: UNEQUIP,
    chest: UNEQUIP,
    earring1: UNEQUIP,
    earring2: UNEQUIP,
    gloves: UNEQUIP,
    helmet: UNEQUIP,
    mainhand: UNEQUIP,
    offhand: UNEQUIP,
    orb: UNEQUIP,
    pants: UNEQUIP,
    ring1: UNEQUIP,
    ring2: UNEQUIP,
    shoes: UNEQUIP,
}

/**
 * Generates an ensured equipped loadout for a given bot
 * 
 * @param bot The bot that we are generating a loadout for
 * @param attributes The attributes to prioritize when generating a loadout
 * @param ensure Anything set here will be added or will override what was generated
 * @returns 
 */
export function generateEnsureEquippedFromAttribute(bot: Character, attributes: Attribute[], ensure?: EnsureEquipped): EnsureEquipped {
    const equippableMainhand = Object.keys(Game.G.classes[bot.ctype].mainhand) as WeaponType[]
    const equippableDoublehand = Object.keys(Game.G.classes[bot.ctype].doublehand) as WeaponType[]
    const equippableOffhand = Object.keys(Game.G.classes[bot.ctype].offhand) as WeaponType[]
    const equippableArmor: ItemType[] = ["amulet", "belt", "chest", "earring", "gloves", "helmet", "orb", "ring", "shoes"]
    const equippableItemTypes: (ItemType | WeaponType)[] = [...equippableMainhand, ...equippableOffhand, ...equippableDoublehand, ...equippableArmor]

    const options: {
        [T in (ItemType | WeaponType)]?: ItemData[]
    } = {}

    const addOption = (item: ItemData) => {
        const gItem = Game.G.items[item.name]
        const type = gItem.type
        if (!options[type]) options[type] = []
        options[type].push(item)
    }

    // Add what we already have equipped as options
    for (const slotName in bot.slots) {
        const slotType = slotName as SlotType
        const slotInfo = bot.slots[slotType]
        if (!slotInfo || slotName.startsWith("trade")) continue

        addOption(slotInfo)
    }

    // Add what we have in our inventory as options
    for (let i = 0; i < bot.isize; i++) {
        const item = bot.items[i]
        if (!item) continue
        const gItem = Game.G.items[item.name]
        if (gItem.class && !gItem.class.includes(bot.ctype)) continue // Our class can't equip it

        if (equippableItemTypes.includes(gItem.type) || equippableItemTypes.includes(gItem.wtype)) addOption(item)
    }

    const sortHighestAttributeFirst = (a: ItemData, b: ItemData) => {
        const itemDataA = new Item(a)
        const itemDataB = new Item(b)

        let sumA = 0
        let sumB = 0
        for (const attribute of attributes) {
            sumA += itemDataA[attribute]
            sumB += itemDataB[attribute]
        }
        return sumB - sumA
    }
    for (const optionName in options) options[optionName as (ItemType | WeaponType)].sort(sortHighestAttributeFirst)

    const best: { [T in SlotType]?: ItemData } = {}
    const addBest = (slot: SlotType, item: ItemData) => {
        const existing = best[slot]
        if (existing) {
            if (sortHighestAttributeFirst(best[slot], item) < 0) {
                best[slot] = item
            }
        } else {
            best[slot] = item
        }
    }

    for (const optionName in options) {
        for (const option of options[optionName as (ItemType | WeaponType)]) {
            if (equippableMainhand.includes(optionName as WeaponType)) {
                addBest("mainhand", option)
                continue
            } else if (equippableOffhand.includes(optionName as WeaponType)) {
                addBest("offhand", option)
            } else if (equippableDoublehand.includes(optionName as WeaponType)) {
                // TODO: Add support for doublehand
            } else if (equippableArmor.includes(optionName as ItemType)) {
                if (optionName === "earring") {
                    if (!best["earring1"]) addBest("earring1", option)
                    else if (!best["earring2"]) addBest("earring2", option)
                } else if (optionName == "ring") {
                    if (!best["ring1"]) addBest("ring1", option)
                    else if (!best["ring2"]) addBest("ring2", option)
                } else {
                    addBest(optionName as SlotType, option)
                }
            }
        }
    }

    const toEquip: EnsureEquipped = {}
    for (const slotName in best) {
        const slotType = slotName as SlotType
        const item = best[slotType]
        const filters: LocateItemFilters = {}
        if (item.stat_type) filters.statType = item.stat_type
        if (item.p) filters.special = item.p
        toEquip[slotType] = { name: item.name, filters: filters }
    }

    if (ensure) {
        // Add / override what was specified
        for (const slotName in ensure) {
            const slotType = slotName as SlotType
            toEquip[slotType] = ensure[slotType]
        }
    }

    return toEquip
}