import { LocateItemFilters } from "alclient"
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