import { Character } from "./character"
import { MonsterType } from "./definitions/adventureland"
import { TargetPriorityList } from "./definitions/bots"

class Rogue extends Character {
    targetPriority: TargetPriorityList = {
        "goo": {
            "priority": -50,
            "equip": ["t2bow", "t2quiver"]
        }
    }
    mainTarget: MonsterType = "goo"
    startTime = Date.now()
}

const rogue = new Rogue()
export { rogue }