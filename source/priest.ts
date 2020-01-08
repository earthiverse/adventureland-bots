import { Character } from './character'
import { MonsterType } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { getCooldownMS } from './functions';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 500;

class Priest extends Character {
    targets: TargetPriorityList = {
        "arcticbee": {
            "priority": EASY
        },
        "armadillo": {
            "priority": EASY,
            "stopOnSight": true
        },
        "bat": {
            "priority": EASY,
            "stopOnSight": true
        },
        "bee": {
            "priority": EASY,
            "holdPositionFarm": true,
            "map": "main",
            "x": 200,
            "y": 1500
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
        "jr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
        },
        "mrgreen": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "mrpumpkin": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "osnake": {
            "priority": EASY,
            "stopOnSight": true
        },
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
            "map": "level1",
            "x": -300,
            "y": 536,
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
            "map": "main",
            "x": -74,
            "y": 1904
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
        "squigtoad": {
            "priority": EASY
        },
        "tortoise": {
            "priority": EASY
        }
    }
    mainTarget: MonsterType = "spider";

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", this.itemsToKeep);
            transferGoldToMerchant("earthMer", 100000);
            sellUnwantedItems(this.itemsToSell);

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    protected async attackLoop(): Promise<void> {
        try {
            if (parent.character.hp < parent.character.max_hp - parent.character.attack * 0.9) {
                heal(parent.character)
                setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                return
            }

            // Check if there's any nearby party member that needs healing
            for (let member of parent.party_list || []) {
                if (parent.entities[member]) {
                    if (distance(parent.character, parent.entities[member]) < parent.character.range
                        && parent.entities[member].hp <= parent.entities[member].max_hp - parent.character.attack * 0.9) {
                        heal(parent.entities[member])
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

        super.attackLoop();
    }
}

let priest = new Priest();
export { priest }