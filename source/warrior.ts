import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 5000;

class Warrior extends Character {
    newTargetPriority: TargetPriorityList = {
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
    mainTarget: MonsterName = "rat";

    run(): void {
        super.run();
        this.chargeLoop();
        this.sendLootLoop();
    }

    mainLoop(): void {
        try {
            // Movement
            // let targets = this.getTargets(1);
            // if (smart.moving) {
            //     if (targets.length > 0 // We have a target
            //         && this.newTargetPriority[targets[0].mtype]
            //         && this.newTargetPriority[targets[0].mtype].stopOnSight // We stop on sight of that target
            //         && this.pathfinder.movementTarget == targets[0].mtype // We're moving to that target
            //         && parent.distance(parent.character, targets[0]) < parent.character.range) { // We're in range
            //         stop();
            //     }
            //     if (this.getMonsterhuntTarget()
            //         && this.getMonsterhuntTarget() != this.pathfinder.movementTarget) { // We're moving to the wrong target
            //         stop();
            //     }
            // } else {
            //     this.moveToMonsterhunt();
            // }

            this.equipBetterItems();
            transferItemsToMerchant("earthMer");
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
        setTimeout(() => { this.chargeLoop() }, Math.max(parent.character.ping, parent.next_skill["charge"] - Date.now()));
    }

    hardshellLoop(): void {
        let targets = this.getTargets(1);
        if (parent.character.mp > 480 // Enough MP
            && targets.length > 0 // We have a target
            && targets[0].target == parent.character.name // It's targeting us
            && ((parent.distance(targets[0], parent.character) < targets[0].range && parent.character.hp < targets[0].attack * 5))) { // Not a lot of HP remaining
            use_skill("hardshell")
        }
        setTimeout(() => { this.chargeLoop() }, Math.max(parent.character.ping, parent.next_skill["hardshell"] - Date.now()));
    }
}

let warrior = new Warrior();
export { warrior }