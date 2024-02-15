import AL, { Attribute, BankPackName, Item, ItemData, ItemType, ServerData, ServerIdentifier, ServerRegion, SlotType } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    const attribute: Attribute = "resistance"

    // Get data from the DB
    const characters = await AL.PlayerModel.find({
        name: { $in: Object.keys(AL.Game.characters) }
    }).lean().exec()
    const bank = await AL.BankModel.findOne({
        owner: characters[0].owner
    }).lean().exec()

    const items: { [T in ItemType]?: [Item, string][] } = {}

    // Look through bank for better item
    const addToItems = (itemData: ItemData, location: string) => {
        const item = new Item(itemData, AL.Game.G)
        if (item[attribute] <= 0) return
        if (!items[item.type]) items[item.type] = []
        items[item.type].push([item, location])
    }

    // Add items from bank
    for (const bankPack in bank) {
        if (!bankPack.startsWith("items")) continue
        const bankPackName = bankPack as BankPackName
        for (let slot = 0; slot < bank[bankPackName].length; slot++) {
            const bankItem = bank[bankPackName][slot]
            if (!bankItem) continue
            addToItems(bankItem, `bank-${bankPack}-${slot}`)
        }
    }

    // Add items from characters
    for (const character of characters) {
        // From equipped slots
        for (const slotName in character.slots) {
            if (slotName.startsWith("trade")) continue
            const slotType = slotName as SlotType
            const slotItem = character.slots[slotType] as ItemData
            if (!slotItem) continue // No item equipped in this slot

            addToItems(slotItem, `${character.name}-slots-${slotName}`)
        }

        // From inventory
        for (let slot = 0; slot < character.items.length; slot++) {
            const item = character.items[slot]
            if (!item) continue
            addToItems(item, `${character.name}-items-${slot}`)
        }
    }

    // TODO: Sort items by attribute
    for (const type in items) {
        items[type as ItemType].sort((a, b) => {
            return b[0][attribute] - a[0][attribute]
        })
    }

    for (const type in items) {
        console.debug(type)
        for (const [item, location] of items[type as ItemType]) {
            console.debug(`  ${location} (${item[attribute]} ${attribute}) ${item.name}`)
        }
    }

    AL.Database.disconnect()
}
run()