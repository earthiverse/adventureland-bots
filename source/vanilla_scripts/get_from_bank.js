async function withdrawAllByName(itemName) {
    const mapPacks = Object.entries(parent.bank_packs)
        .filter(([, info]) => info[0] === character.map)
        .map(([pack]) => pack)

    for (const pack of mapPacks) {
        if (character.esize <= 0) break // No space

        const items = parent.character.bank[pack]
        if (!items) continue // Pack is not unlocked

        for (let i = 0; i < items.length; i++) {
            if (character.esize <= 0) break // No space

            const item = items[i]
            if (item?.name === itemName) {
                await bank_retrieve(pack, i)
            }
        }
    }
}

// Usage:
withdrawAllByName("lmace")
