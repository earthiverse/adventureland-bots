import AL, { BankPackName, ItemData, ServerData, ServerIdentifier, ServerRegion, SlotType } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    // Get data from the DB
    const characters = await AL.PlayerModel.find({
        name: { $in: Object.keys(AL.Game.characters) }
    }).lean().exec()
    const bank = await AL.BankModel.findOne({
        owner: characters[0].owner
    }).lean().exec()

    // Look through bank for better item
    const lookThroughBank = (name: string, item: ItemData) => {
        // TODO: Output only once for the highest level item, not every item of a higher level
        for (const bankPack in bank) {
            if (!bankPack.startsWith("items")) continue
            const bankPackName = bankPack as BankPackName
            for (const bankItem of bank[bankPackName] as ItemData[]) {
                if (!bankItem) continue // No item in this bank slot
                if (bankItem.name !== item.name) continue // Item names don't match
                if (bankItem.level > item.level) {
                    console.debug(`${name} can get a better item`)
                    console.debug(`  equipped: ${JSON.stringify(item)}`)
                    console.debug(`  bank (${bankPackName}): ${JSON.stringify(bankItem)}`)
                }
            }
        }
    }

    for (const character of characters) {
        for (const slotName in character.slots) {
            if (slotName.startsWith("trade")) continue
            const slotType = slotName as SlotType
            const slotItem = character.slots[slotType] as ItemData
            if (!slotItem) continue // No item equipped in this slot
            if (slotItem.level === undefined) continue // Can't get a better item

            lookThroughBank(character.name, slotItem)
        }

        for (const item of character.items as ItemData[]) {
            if (!item) continue
            if (!item.l) continue // Don't consider unlocked items
            if (item.level === undefined) continue // Can't get a better item

            lookThroughBank(character.name, item)
        }
    }

    AL.Database.disconnect()
}
run()