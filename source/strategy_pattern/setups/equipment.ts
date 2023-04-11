import { EnsureEquipped } from "../strategies/attack"

export const MAGE_ARMOR: EnsureEquipped = {
    amulet: { name: "intamulet", filters: { returnHighestLevel: true } },
    belt: { name: "intbelt", filters: { returnHighestLevel: true } },
    cape: { name: "tigercape", filters: { returnHighestLevel: true } },
    chest: { name: "harmor", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "hgloves", filters: { returnHighestLevel: true } },
    helmet: { name: "hhelmet", filters: { returnHighestLevel: true } },
    mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
    offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "hpants", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "cring", filters: { returnHighestLevel: true } },
    shoes: { name: "vboots", filters: { returnHighestLevel: true } },
}

export const MAGE_NORMAL: EnsureEquipped = {
    amulet: { name: "intamulet", filters: { returnHighestLevel: true } },
    belt: { name: "intbelt", filters: { returnHighestLevel: true } },
    cape: { name: "tigercape", filters: { returnHighestLevel: true } },
    chest: { name: "wattire", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "wgloves", filters: { returnHighestLevel: true } },
    helmet: { name: "wcap", filters: { returnHighestLevel: true } },
    mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
    offhand: { name: "wbook1", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "wbreeches", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "cring", filters: { returnHighestLevel: true } },
    shoes: { name: "wshoes", filters: { returnHighestLevel: true } },
}

export const MAGE_SPLASH: EnsureEquipped = {
    amulet: { name: "intamulet", filters: { returnHighestLevel: true } },
    belt: { name: "intbelt", filters: { returnHighestLevel: true } },
    cape: { name: "tigercape", filters: { returnHighestLevel: true } },
    chest: { name: "harmor", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "hgloves", filters: { returnHighestLevel: true } },
    helmet: { name: "hhelmet", filters: { returnHighestLevel: true } },
    mainhand: { name: "gstaff", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "hpants", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "cring", filters: { returnHighestLevel: true } },
    shoes: { name: "vboots", filters: { returnHighestLevel: true } },
}

export const MAGE_FAST: EnsureEquipped = {
    ...MAGE_NORMAL,
    mainhand: { name: "pinkie", filters: { returnHighestLevel: true } },
}

export const PRIEST_ARMOR: EnsureEquipped = {
    amulet: { name: "intamulet", filters: { returnHighestLevel: true } },
    belt: { name: "intbelt", filters: { returnHighestLevel: true } },
    cape: { name: "angelwings", filters: { returnHighestLevel: true } },
    chest: { name: "vattire", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "vgloves", filters: { returnHighestLevel: true } },
    helmet: { name: "hhelmet", filters: { returnHighestLevel: true } },
    mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
    offhand: { name: "tigershield", filters: { returnHighestLevel: true } },
    orb: { name: "tigerstone", filters: { returnHighestLevel: true } },
    pants: { name: "hpants", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "cring", filters: { returnHighestLevel: true } },
    shoes: { name: "hboots", filters: { returnHighestLevel: true } },
}

export const PRIEST_NORMAL: EnsureEquipped = {
    amulet: { name: "intamulet", filters: { returnHighestLevel: true } },
    belt: { name: "intbelt", filters: { returnHighestLevel: true } },
    cape: { name: "angelwings", filters: { returnHighestLevel: true } },
    chest: { name: "vattire", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "vgloves", filters: { returnHighestLevel: true } },
    helmet: { name: "hhelmet", filters: { returnHighestLevel: true } },
    mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
    offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "hpants", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "cring", filters: { returnHighestLevel: true } },
    shoes: { name: "hboots", filters: { returnHighestLevel: true } },
}

export const PRIEST_LUCK: EnsureEquipped = {
    amulet: { name: "intamulet", filters: { returnHighestLevel: true } },
    belt: { name: "intbelt", filters: { returnHighestLevel: true } },
    cape: { name: "angelwings", filters: { returnHighestLevel: true } },
    chest: { name: "tshirt88", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "dexearringx", filters: { returnHighestLevel: true } },
    gloves: { name: "wgloves", filters: { returnHighestLevel: true } },
    helmet: { name: "wcap", filters: { returnHighestLevel: true } },
    mainhand: { name: "lmace", filters: { returnHighestLevel: true } },
    offhand: { name: "mshield", filters: { returnHighestLevel: true } },
    orb: { name: "rabbitsfoot", filters: { returnHighestLevel: true } },
    pants: { name: "wbreeches", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "ringofluck", filters: { returnHighestLevel: true } },
    shoes: { name: "wingedboots", filters: { returnHighestLevel: true } },
}

export const PRIEST_FAST: EnsureEquipped = {
    ...PRIEST_NORMAL,
    mainhand: { name: "wand", filters: { returnHighestLevel: true } },
}
delete PRIEST_FAST.offhand

export const WARRIOR_NORMAL: EnsureEquipped = {
    amulet: { name: "snring", filters: { returnHighestLevel: true } },
    belt: { name: "strbelt", filters: { returnHighestLevel: true } },
    cape: { name: "bcape", filters: { returnHighestLevel: true } },
    chest: { name: "coat1", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "gloves1", filters: { returnHighestLevel: true } },
    helmet: { name: "helmet1", filters: { returnHighestLevel: true } },
    mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
    offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "pants1", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "strring", filters: { returnHighestLevel: true } },
    shoes: { name: "wingedboots", filters: { returnHighestLevel: true } },
}

export const WARRIOR_SPLASH: EnsureEquipped = {
    amulet: { name: "snring", filters: { returnHighestLevel: true } },
    belt: { name: "strbelt", filters: { returnHighestLevel: true } },
    cape: { name: "bcape", filters: { returnHighestLevel: true } },
    chest: { name: "coat1", filters: { returnHighestLevel: true } },
    gloves: { name: "gloves1", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    helmet: { name: "helmet1", filters: { returnHighestLevel: true } },
    mainhand: { name: "vhammer", filters: { returnHighestLevel: true } },
    offhand: { name: "ololipop", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "pants1", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "strring", filters: { returnHighestLevel: true } },
    shoes: { name: "wingedboots", filters: { returnHighestLevel: true } },
}

export const WARRIOR_STOMP: EnsureEquipped = {
    amulet: { name: "snring", filters: { returnHighestLevel: true } },
    belt: { name: "strbelt", filters: { returnHighestLevel: true } },
    cape: { name: "bcape", filters: { returnHighestLevel: true } },
    chest: { name: "coat1", filters: { returnHighestLevel: true } },
    earring1: { name: "cearring", filters: { returnHighestLevel: true } },
    earring2: { name: "cearring", filters: { returnHighestLevel: true } },
    gloves: { name: "gloves1", filters: { returnHighestLevel: true } },
    helmet: { name: "helmet1", filters: { returnHighestLevel: true } },
    mainhand: { name: "basher", filters: { returnHighestLevel: true } },
    orb: { name: "jacko", filters: { returnHighestLevel: true } },
    pants: { name: "pants1", filters: { returnHighestLevel: true } },
    ring1: { name: "zapper", filters: { returnHighestLevel: true } },
    ring2: { name: "strring", filters: { returnHighestLevel: true } },
    shoes: { name: "wingedboots", filters: { returnHighestLevel: true } },
}

export const UNEQUIP_EVERYTHING: EnsureEquipped = {
    amulet: { name: undefined, unequip: true },
    belt: { name: undefined, unequip: true },
    cape: { name: undefined, unequip: true },
    chest: { name: undefined, unequip: true },
    earring1: { name: undefined, unequip: true },
    earring2: { name: undefined, unequip: true },
    gloves: { name: undefined, unequip: true },
    helmet: { name: undefined, unequip: true },
    mainhand: { name: undefined, unequip: true },
    offhand: { name: undefined, unequip: true },
    orb: { name: undefined, unequip: true },
    pants: { name: undefined, unequip: true },
    ring1: { name: undefined, unequip: true },
    ring2: { name: undefined, unequip: true },
    shoes: { name: undefined, unequip: true },
}