import { Attribute, Character, Game, Item, ItemData, ItemType, LocateItemFilters, SkillName, SlotType, WeaponType } from "alclient"
import { EnsureEquipped, EnsureEquippedSlot } from "../strategies/attack"

export const RETURN_HIGHEST: LocateItemFilters = { returnHighestLevel: true }
export const UNEQUIP: EnsureEquippedSlot = { name: undefined, unequip: true }

export const ZAPPER_CRING: EnsureEquipped = {
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
}

export const ZAPPER_STRRING: EnsureEquipped = {
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "strring", filters: RETURN_HIGHEST },
}

export const BLASTER: EnsureEquipped = {
    mainhand: { name: "gstaff", filters: RETURN_HIGHEST },
    offhand: UNEQUIP,
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
    offhand: UNEQUIP,
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "hpants", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "vboots", filters: RETURN_HIGHEST },
}

export const MAGE_FAST: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "tigercape", filters: RETURN_HIGHEST },
    chest: { name: "wattire", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "wgloves", filters: RETURN_HIGHEST },
    helmet: { name: "wcap", filters: RETURN_HIGHEST },
    mainhand: { name: "pinkie", filters: RETURN_HIGHEST },
    offhand: { name: "wbook1", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "wbreeches", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "wshoes", filters: RETURN_HIGHEST },
}

export const PRIEST_ARMOR: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "angelwings", filters: RETURN_HIGHEST },
    chest: { name: "vattire", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "vgloves", filters: RETURN_HIGHEST },
    helmet: { name: "xhelmet", filters: RETURN_HIGHEST },
    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
    offhand: { name: "tigershield", filters: RETURN_HIGHEST },
    orb: { name: "tigerstone", filters: RETURN_HIGHEST },
    pants: { name: "xpants", filters: RETURN_HIGHEST },
    ring1: { name: "zapper", filters: RETURN_HIGHEST },
    ring2: { name: "cring", filters: RETURN_HIGHEST },
    shoes: { name: "hboots", filters: RETURN_HIGHEST },
}

export const PRIEST_NORMAL: EnsureEquipped = {
    amulet: { name: "intamulet", filters: RETURN_HIGHEST },
    belt: { name: "intbelt", filters: RETURN_HIGHEST },
    cape: { name: "angelwings", filters: RETURN_HIGHEST },
    chest: { name: "wattire", filters: RETURN_HIGHEST },
    earring1: { name: "cearring", filters: RETURN_HIGHEST },
    earring2: { name: "cearring", filters: RETURN_HIGHEST },
    gloves: { name: "vgloves", filters: RETURN_HIGHEST },
    helmet: { name: "wcap", filters: RETURN_HIGHEST },
    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
    offhand: { name: "wbookhs", filters: RETURN_HIGHEST },
    orb: { name: "jacko", filters: RETURN_HIGHEST },
    pants: { name: "wbreeches", filters: RETURN_HIGHEST },
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
    offhand: UNEQUIP
}

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
    offhand: UNEQUIP,
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

export type GenerateEnsureEquipped = {
    /** Which attributes should be prioritized? */
    attributes?: Attribute[]
    /** Which attributes should we avoid? */
    avoidAttributes?: Attribute[]
    /** If we have the given item, equip it */
    prefer?: EnsureEquipped
    /** 
     * If set, we will try to generate a layout that gives access to the given skill
     * 
     * TODO: If we have `skills: ["quickstab", "freeze"], we might equip two items that both give quickstab instead of 1 of each
     *       ["burn", "quickstab"] might equip two fireblades, etc.
     */
    skills?: (SkillName | "burn" | "freeze" | "poke" | "posion" | "restore_mp" | "secondchance" | "sugarrush" | "weave")[]
}

/**
 * Generates an ensured equipped loadout for a given bot
 * 
 * @param bot The bot that we are generating a loadout for
 * @param attributes The attributes to prioritize when generating a loadout
 * @param ensure Anything set here will be added or will override what was generated
 * @returns 
 */
export function generateEnsureEquipped(bot: Character, generate: GenerateEnsureEquipped): EnsureEquipped {
    if (!generate.skills) generate.skills = []
    if (!generate.attributes) generate.attributes = []
    if (!generate.avoidAttributes) generate.avoidAttributes = []

    const equippableMainhand = Object.keys(Game.G.classes[bot.ctype].mainhand) as WeaponType[]
    const equippableDoublehand = Object.keys(Game.G.classes[bot.ctype].doublehand) as WeaponType[]
    const equippableOffhand = Object.keys(Game.G.classes[bot.ctype].offhand) as WeaponType[]
    const equippableArmor: ItemType[] = ["amulet", "belt", "chest", "earring", "gloves", "helmet", "orb", "ring", "shoes"]
    const equippableItemTypes: (ItemType | WeaponType)[] = [...equippableMainhand, ...equippableOffhand, ...equippableDoublehand, ...equippableArmor]

    // Fix blast and explosion if we're on PVP
    if (bot.isPVP()) generate.attributes.filter(a => (a !== "blast" && a !== "explosion"))
    if (bot.isPVP()) generate.avoidAttributes = ["blast", "explosion"]

    const options: {
        [T in (ItemType | WeaponType)]?: ItemData[]
    } = {}

    const addOption = (item: ItemData) => {
        const gItem = Game.G.items[item.name]
        const type = gItem.type === "weapon" ? gItem.wtype : gItem.type
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

        const type = gItem.type === "weapon" ? gItem.wtype : gItem.type
        if (equippableItemTypes.includes(type)) addOption(item)
    }

    const calculateCtypeAttributes = (item: Item, attribute: Attribute) => {
        const gInfo = Game.G.classes[bot.ctype]
        let change = 0
        if (item.wtype && gInfo.mainhand[item.wtype]) change += gInfo.mainhand[item.wtype][attribute] ?? 0
        if (item.wtype && gInfo.offhand[item.wtype]) change += gInfo.offhand[item.wtype][attribute] ?? 0
        if (item.wtype && gInfo.doublehand[item.wtype]) change += gInfo.doublehand[item.wtype][attribute] ?? 0
        return change
    }

    const sortBest = (a: ItemData, b: ItemData) => {
        const itemDataA = new Item(a, Game.G)
        const itemDataB = new Item(b, Game.G)

        let sumA = 0
        let sumB = 0

        if (generate.skills) {
            // Prefer the items that give us the skills we want
            let itemAGivesSkill = generate.skills.includes(itemDataA.ability)
            let itemBGivesSkill = generate.skills.includes(itemDataB.ability)
            if (itemDataA.wtype !== itemDataB.wtype) {
                for (const skill of generate.skills) {
                    const gAbility = Game.G.skills[skill]
                    if (Array.isArray(gAbility.wtype)) {
                        for (const wtype of gAbility.wtype) {
                            if (wtype === itemDataA.wtype) itemAGivesSkill = true
                            if (wtype === itemDataB.wtype) itemBGivesSkill = true
                        }
                    } else {
                        if (gAbility.wtype === itemDataA.wtype) itemAGivesSkill = true
                        if (gAbility.wtype === itemDataB.wtype) itemBGivesSkill = true
                    }
                }
            }
            if (itemAGivesSkill && !itemBGivesSkill) return -1
            if (itemBGivesSkill && !itemAGivesSkill) return 1
        }

        for (const attribute of generate.avoidAttributes) {
            sumA -= (itemDataA[attribute] ?? 0) + calculateCtypeAttributes(itemDataA, attribute)
            sumB -= (itemDataB[attribute] ?? 0) + calculateCtypeAttributes(itemDataB, attribute)
        }
        if (sumA !== sumB) return sumB - sumA

        for (const attribute of generate.attributes) {
            sumA += (itemDataA[attribute] ?? 0) + calculateCtypeAttributes(itemDataA, attribute)
            sumB += (itemDataB[attribute] ?? 0) + calculateCtypeAttributes(itemDataB, attribute)
        }
        if (sumA !== sumB) return sumB - sumA

        if (itemDataA.level && itemDataB.level) return itemDataB.level - itemDataA.level

        return 0
    }
    for (const optionName in options) options[optionName as (ItemType | WeaponType)].sort(sortBest)

    const best: { [T in SlotType]?: ItemData } = {}
    const addBest = (slot: SlotType, item: ItemData): boolean => {
        const existing = best[slot]
        if (existing && sortBest(existing, item) <= 0) return false // It's not better
        best[slot] = item
        return true
    }

    for (const optionName in options) {
        // This is the best option for the given item or weapon type
        let bestOption = options[optionName as (ItemType | WeaponType)][0]

        if (equippableMainhand.includes(optionName as WeaponType) && addBest("mainhand", bestOption)) {
            // Get second best for potential offhand
            bestOption = options[optionName as (ItemType | WeaponType)][1]
            if (!bestOption) continue
        }
        if (equippableOffhand.includes(optionName as WeaponType) && addBest("offhand", bestOption)) continue
        // if (equippableDoublehand.includes(optionName as WeaponType) && addBest("mainhand", bestOption)) continue
        if (equippableArmor.includes(optionName as ItemType)) {
            if (optionName === "earring") {
                if (addBest("earring1", bestOption)) {
                    // Get second best for potential earring2
                    bestOption = options[optionName as (ItemType | WeaponType)][1]
                    if (!bestOption) continue
                    addBest("earring2", bestOption)
                }
            } else if (optionName === "ring") {
                if (addBest("ring1", bestOption)) {
                    // Get second best for potential ring2
                    bestOption = options[optionName as (ItemType | WeaponType)][1]
                    if (!bestOption) continue
                    addBest("ring2", bestOption)
                }
            } else {
                addBest(optionName as SlotType, bestOption)
            }
        }
    }

    const toEquip: EnsureEquipped = {}
    for (const slotName in best) {
        const slotType = slotName as SlotType
        const item = best[slotType]
        const filters: LocateItemFilters = {}
        if (typeof item.level === "number") filters.returnHighestLevel = true
        if (item.stat_type) filters.statType = item.stat_type
        if (item.p) filters.special = item.p
        toEquip[slotType] = { name: item.name, filters: filters }
    }

    if (generate.prefer) {
        // Add / override what was specified
        for (const slotName in generate.prefer) {
            const slotType = slotName as SlotType
            const ensureEquippedSlot = generate.prefer[slotType]

            if (ensureEquippedSlot.unequip) {
                // We don't want anything in this slot
                toEquip[slotType] = ensureEquippedSlot
                continue
            }

            if (
                !bot.isEquipped(ensureEquippedSlot.name)
                && !bot.hasItem(ensureEquippedSlot.name, bot.items, ensureEquippedSlot.filters)
            ) {
                // We don't have the item
                continue
            }
            toEquip[slotType] = ensureEquippedSlot
        }
    }

    // Remove elixir
    delete toEquip["elixir"]

    // Swap slots if we already have them equipped in different slots
    for (const [slot1, slot2] of [["earring1", "earring2"], ["ring1", "ring2"], ["mainhand", "offhand"]]) {
        const slot1Equipped = bot.slots[slot1]
        const slot2Equipped = bot.slots[slot2]
        const slot1ToEquip = toEquip[slot1]
        const slot2ToEquip = toEquip[slot2]
        if (!slot1Equipped && slot2Equipped && slot1ToEquip && !slot2ToEquip) {
            // We only have one of the two, and we're already wearing it in slot 2
            toEquip[slot2] = toEquip[slot1]
            delete toEquip[slot1]
        } else if (
            slot1Equipped && slot2Equipped
            && slot1ToEquip && slot2ToEquip
            && slot1ToEquip.name !== slot2ToEquip.name
            && slot1Equipped.name === slot2ToEquip.name
            && slot2Equipped.name === slot1ToEquip.name
        ) {
            // We have them in their opposite slot
            const temp = toEquip[slot1]
            toEquip[slot1] = toEquip[slot2]
            toEquip[slot2] = temp
        }
    }

    // Swap slots if throwing stars are in mainhand, but not in offhand
    if (
        toEquip["mainhand"] && toEquip["offhand"]
        && !toEquip["mainhand"].unequip && !toEquip["offhand"].unequip
    ) {
        const mainhandType = Game.G.items[toEquip["mainhand"].name].wtype
        const offhandType = Game.G.items[toEquip["offhand"].name].wtype
        if (
            mainhandType == "stars"
            && offhandType !== "stars"
            && equippableMainhand.includes(offhandType)
            && equippableOffhand.includes(mainhandType)
        ) {
            const temp = toEquip["mainhand"]
            toEquip["mainhand"] = toEquip["offhand"]
            toEquip["offhand"] = temp
        }
    }

    // Make sure offhand is `unequip` if our mainhand is `doublehand`
    if (toEquip["mainhand"]) {
        const mainhandType = Game.G.items[toEquip["mainhand"].name].wtype
        if (equippableDoublehand.includes(mainhandType)) toEquip["offhand"] = UNEQUIP
    }

    return toEquip
}