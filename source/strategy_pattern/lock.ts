import { Character, SlotType } from "alclient"

const lockedEquipmentSlots = new Map<string, Set<SlotType>>()

export function lockEquipmentSlot(bot: Character, slot: SlotType): void {
    let slots = lockedEquipmentSlots.get(bot.id)
    if (!slots) {
        slots = new Set<SlotType>()
        lockedEquipmentSlots.set(bot.id, slots)
    }
    slots.add(slot)
}

export function unlockEquipmentSlot(bot: Character, slot: SlotType): void {
    const slots = lockedEquipmentSlots.get(bot.id)
    if (slots) {
        slots.delete(slot)
        if (slots.size === 0) lockedEquipmentSlots.delete(bot.id)
    }
}

export function isEquipmentLocked(bot: Character, slot: SlotType): boolean {
    return lockedEquipmentSlots.get(bot.id)?.has(slot) ?? false
}

export function clearEquipmentLocks(bot: Character): void {
    lockedEquipmentSlots.delete(bot.id)
}

