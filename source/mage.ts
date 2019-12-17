import { Character } from './character'
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { MonsterType } from './definitions/adventureland';
import { getCooldownMS, isAvailable } from './functions';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 500;

class Mage extends Character {
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
            "stopOnSight": true
        },
        "bee": {
            "priority": EASY
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
        },
        "cgoo": {
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "holdAttackInEntityRange": true,
            "priority": DIFFICULT,
            "map": "arena",
            "x": 500,
            "y": -50
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
        "iceroamer": {
            // Don't attack if we're walking by them, they hurt.
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
        "stoneworm": {
            // Don't attack if we're walking by them, they hurt.
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "tortoise": {
            "priority": EASY
        },
        "xscorpion": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "map": "halloween",
            "x": -230,
            "y": 570
        }
    }
    mainTarget: MonsterType = "rat";

    run(): void {
        super.run();
        this.energizeLoop();
    }

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko"]);
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    energizeLoop(): void {
        try {
            // Get nearby party members
            if (isAvailable("energize"))
                for (let id in parent.entities) {
                    if (id == parent.character.name) continue // Don't cast on ourself.
                    if (distance(parent.character, parent.entities[id]) > parent.character.range) continue // Out of range
                    if (!parent.party_list.includes(id)) continue // Not in our party

                    use_skill("energize", parent.entities[id])
                    break;
                }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.energizeLoop() }, getCooldownMS("energize"));
    }
}

let mage = new Mage();
export { mage }