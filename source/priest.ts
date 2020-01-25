import { Character } from "./character"
import { MonsterType } from "./definitions/adventureland"
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from "./trade"
import { TargetPriorityList } from "./definitions/bots"
import { getCooldownMS } from "./functions"

const DIFFICULT = 10
const MEDIUM = 20
const EASY = 30
const SPECIAL = 500

class Priest extends Character {
    targetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": EASY
        },
        "armadillo": {
            "priority": EASY,
            "stopOnSight": true
        },
        "bat": {
            "priority": EASY,
            "stopOnSight": true,
            "farmingPosition": {
                "map": "cave",
                "x": 300,
                "y": -1100
            }
        },
        "bbpompom": {
            "coop": ["priest"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "winter_cave",
                "x": 50,
                "y": -100
            }
        },
        "bee": {
            "priority": EASY,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "main",
                "x": 200,
                "y": 1500
            }
        },
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "main",
                "x": 1450,
                "y": 30
            }
        },
        "boar": {
            // The ranger is fast enough to kill these without dying too much.
            "coop": ["warrior", "priest"],
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "winterland",
                "x": -50,
                "y": -850
            }
        },
        "booboo": {
            "coop": ["priest", "mage"],
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "spookytown",
                "x": 250,
                "y": -600
            }
        },
        "cgoo": {
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "holdAttackInEntityRange": true,
            "priority": DIFFICULT
        },
        "crab": {
            "priority": EASY
        },
        "crabx": {
            // They can hurt, but they move really slow and they're pretty out of the way.
            "priority": MEDIUM
        },
        "croc": {
            "priority": EASY
        },
        // "dragold": {
        //     "coop": ["warrior"],
        //     "priority": SPECIAL,
        //     "holdAttackWhileMoving": true,
        //     "stopOnSight": true,
        // },
        "frog": {
            "priority": EASY
        },
        "ghost": {
            // Don't attack if we're walking by them, they hurt.
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "goldenbat": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "goo": {
            "priority": EASY,
        },
        "greenjr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "hen": {
            "priority": EASY
        },
        "iceroamer": {
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "stopOnSight": true,
        },
        "jr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "mechagnome": {
            "coop": ["priest", "ranger"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "cyberland",
                "x": 100,
                "y": -150
            }
        },
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
        },
        "mole": {
            "coop": ["priest", "warrior"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "tunnel",
                "x": 50,
                "y": -75
            }
        },
        "mrgreen": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "mrpumpkin": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "mummy": {
            "coop": ["ranger", "priest", "warrior"],
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "spookytown",
                "x": 210,
                "y": -1030
            }
        },
        // "osnake": {
        //     "priority": EASY,
        //     "stopOnSight": true
        // },
        "phoenix": {
            "priority": SPECIAL
        },
        "plantoid": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "stopOnSight": true,
            "holdAttackWhileMoving": true
        },
        "poisio": {
            "priority": EASY
        },
        "porcupine": {
            "priority": EASY
        },
        "prat": {
            // Our plan is to go to a spot on a cliff where they can't attack us, but we can attack them.
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "holdAttackInEntityRange": true,
            "priority": DIFFICULT,
            farmingPosition: {
                "map": "level1",
                "x": -300,
                "y": 536
            }
        },
        "rat": {
            "priority": EASY
        },
        "rooster": {
            "priority": EASY
        },
        "scorpion": {
            "priority": MEDIUM
        },
        "snake": {
            // Farm them on the main map because of the +1000% luck and gold bonus chances
            "priority": EASY,
            farmingPosition: {
                "map": "main",
                "x": -74,
                "y": 1904
            }
        },
        "snowman": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "spider": {
            "priority": MEDIUM
        },
        "squig": {
            "priority": EASY,
        },
        // "squigtoad": {
        //     "priority": EASY
        // },
        // "tortoise": {
        //     "priority": EASY
        // },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "coop": ["warrior", "priest"],
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "winterland",
                "x": -50,
                "y": -1825
            }
        },
        "xscorpion": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "halloween",
                "x": -230,
                "y": 570
            }
        }
    }
    mainTarget: MonsterType = "spider";

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant("earthMer", this.itemsToKeep)
            transferGoldToMerchant("earthMer", 100000)
            sellUnwantedItems(this.itemsToSell)

            super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop() }, 250)
        }
    }

    protected async attackLoop(): Promise<void> {
        try {
            if (parent.character.hp < parent.character.max_hp - parent.character.attack * 0.9) {
                await heal(parent.character)
                setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                return
            }

            // Check if there's any nearby party member that needs healing
            for (const member of parent.party_list || []) {
                if (parent.entities[member]) {
                    if (distance(parent.character, parent.entities[member]) < parent.character.range
                        && !parent.entities[member].rip
                        && parent.entities[member].hp < parent.entities[member].max_hp) {
                        await heal(parent.entities[member])
                        setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                        return
                    }
                }
            }

            // Heal our target's target. (The player the monster we want to attack is attacking)
            const target = this.getTargets(1)
            if (target.length && target[0].target) {
                if (parent.entities[target[0].target]) {
                    const targetTarget = parent.entities[target[0].target]
                    if (targetTarget.hp < targetTarget.max_hp && distance(parent.character, targetTarget) < parent.character.range) {
                        await heal(targetTarget)
                        setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                        return
                    }
                }
            }
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
            return
        }

        super.attackLoop()
    }
}

const priest = new Priest()
export { priest }