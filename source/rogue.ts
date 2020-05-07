import { Character } from "./character"
import { MonsterType } from "./definitions/adventureland"
import { TargetPriorityList } from "./definitions/bots"

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
}

const rogue = new Rogue()
export { rogue }