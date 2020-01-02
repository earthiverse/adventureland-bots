import { Character } from './character'
import { MonsterType } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { getCooldownMS, getAttackingEntities, calculateDamageRange } from './functions';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 500;

class Warrior extends Character {
    targetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": EASY
        },
        "bat": {
            "priority": EASY,
            "stopOnSight": true
        },
        "bee": {
            "priority": EASY
        },
        "crab": {
            "priority": EASY
        },
        "croc": {
            "priority": EASY
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
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
        },
        "osnake": {
            "priority": EASY,
            "stopOnSight": true
        },
        "phoenix": {
            "priority": SPECIAL
        },
        "rat": {
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

    run(): void {
        super.run();
        this.chargeLoop();
    }

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko", "basher", "bataxe", "candycanesword", "swordofthedead", "luckbooster", "goldbooster", "xpbooster"]);
            transferGoldToMerchant("earthMer", 100000);
            sellUnwantedItems();

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    chargeLoop(): void {
        use_skill("charge")
        setTimeout(() => { this.chargeLoop() }, getCooldownMS("charge"));
    }

    hardshellLoop(): void {
        let targets = getAttackingEntities()
        if (parent.character.mp >= 480 // Enough MP
            && targets.length // We have a target
            && distance(targets[0], parent.character) <= targets[0].range // In range of their attacks
            && parent.character.hp < calculateDamageRange(targets[0], parent.character)[1] * 5) { // Not a lot of HP remaining
            use_skill("hardshell")
        }
        setTimeout(() => { this.chargeLoop() }, getCooldownMS("hardshell"));
    }
}

let warrior = new Warrior();
export { warrior }