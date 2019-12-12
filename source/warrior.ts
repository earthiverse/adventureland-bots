import { Character } from './character'
import { MonsterType } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { getCooldownMS, getAttackingEntities } from './functions';

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
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
        },
        "osnake": {
            "priority": EASY
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
            "priority": EASY
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
    mainTarget: MonsterType = "rat";

    run(): void {
        super.run();
        this.chargeLoop();
    }

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko"]);
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    chargeLoop(): void {
        use_skill("charge")
        setTimeout(() => { this.chargeLoop() }, Math.max(parent.character.ping, getCooldownMS("charge")));
    }

    hardshellLoop(): void {
        let targets = getAttackingEntities()
        if (parent.character.mp > 480 // Enough MP
            && targets.length > 0 // We have a target
            && ((distance(targets[0], parent.character) < targets[0].range && parent.character.hp < targets[0].attack * 5))) { // Not a lot of HP remaining
            use_skill("hardshell")
        }
        setTimeout(() => { this.chargeLoop() }, Math.max(parent.character.ping, getCooldownMS("hardshell")));
    }
}

let warrior = new Warrior();
export { warrior }