import { Character } from "./character"
import { MonsterType } from "./definitions/adventureland"
import { TargetPriorityList } from "./definitions/bots"
import { transferItemsToMerchant, transferGoldToMerchant, sellUnwantedItems } from "./trade"

class Rogue extends Character {
    targetPriority: TargetPriorityList = {
        "bee": {
            "priority": 100
        },
        "crab": {
            "priority": 100
        },
        "goo": {
            "priority": 100
        },
        "osnake": {
            "priority": 100
        },
        "snake": {
            "priority": 100
        },
        "squig": {
            "priority": 100
        },
        "squigtoad": {
            "priority": 100
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