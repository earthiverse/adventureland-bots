locate_item = (itemName, filters) => {
    for (let i = 0; i < character.items.length; i++) {
        const item = character.items[i]
        if (!item) continue // No item in this slot
        if (item.name !== itemName) continue // Different item in this slot
        if (filters?.level !== undefined && item.level !== undefined && filters.level !== item.level) continue // Different level
        return i
    }
    return -1
}
