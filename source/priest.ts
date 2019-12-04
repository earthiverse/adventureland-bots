import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 5000;

class Priest extends Character {
    newTargetPriority: TargetPriorityList = {
        "bee": {
            "priority": EASY
        },
        "crab": {
            "priority": EASY
        },
        "frog": {
            "priority": EASY
        },
        "goo": {
            "priority": EASY,
        },
        "hen": {
            "priority": EASY
        },
        "rooster": {
            "priority": EASY
        },
        "snowman": {
            "priority": SPECIAL,
            "stopOnSight": true
        }
    }
    mainTarget: MonsterName = "bee";

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko"]);
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();
            loot();

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }
}

let priest = new Priest();
export { priest }