import { Character } from "./character"
import { MonsterName } from "./definitions/adventureland"
import { TargetPriorityList } from "./definitions/bots"
import { transferItemsToMerchant, transferGoldToMerchant, sellUnwantedItems } from "./trade"
import { getEntities, isAvailable, calculateDamageRange, getCooldownMS } from "./functions"

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
    mainTarget: MonsterName = "goo"

    constructor() {
        super()
        // TODO: change this to levels like items to sell
        this.itemsToKeep.push(
            // Daggers
            "daggerofthedead"
        )
    }

    run(): void {
        super.run()
        this.quickStabLoop()
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant(process.env.MERCHANT, this.itemsToKeep)
            transferGoldToMerchant(process.env.MERCHANT, 100000)
            sellUnwantedItems(this.itemsToSell)

            await super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(async () => { this.mainLoop() }, 250)
        }
    }

    async quickStabLoop(): Promise<void> {
        const targets = getEntities({ isRIP: false, isMonster: true, isWithinDistance: parent.character.range * G.skills["quickstab"].range_multiplier })
        if (isAvailable("quickstab") && targets.length) {
            if (targets[0].hp <= calculateDamageRange(parent.character, targets[0])[0] * G.skills["quickstab"].damage_multiplier) {
                // We can kill it with one stab, do it.
                use_skill("quickstab", targets[0])
                reduce_cooldown("quickstab", Math.min(...parent.pings))
            }
        }

        setTimeout(() => { this.quickStabLoop() }, getCooldownMS("quickstab"))
    }
}

const rogue = new Rogue()
export { rogue }