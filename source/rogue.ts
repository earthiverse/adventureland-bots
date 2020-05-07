import { Character } from "./character"
import { MonsterType } from "./definitions/adventureland"
import { TargetPriorityList } from "./definitions/bots"
import { transferItemsToMerchant, transferGoldToMerchant, sellUnwantedItems } from "./trade"

class Rogue extends Character {
    targetPriority: TargetPriorityList = {
        "bee": {
            "priority": 100,
            "equip": ["daggerofthedead"]
        },
        "goo": {
            "priority": 100,
            "equip": ["daggerofthedead"]
        }
    }
    mainTarget: MonsterType = "goo"

    constructor() {
        super()
        // TODO: change this to levels like items to sell
        this.itemsToKeep.push(
            // Daggers
            "daggerofthedead"
        )
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant(process.env.MERCHANT, this.itemsToKeep)
            transferGoldToMerchant(process.env.MERCHANT, 100000)
            sellUnwantedItems(this.itemsToSell)

            super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop() }, 250)
        }
    }
}

const rogue = new Rogue()
export { rogue }