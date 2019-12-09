import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 5000;

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
            "stopOnSight": true
        },
        "bee": {
            "priority": EASY
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
        "goldenbat": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "goo": {
            "priority": EASY,
        },
        "hen": {
            "priority": EASY
        },
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
        },
        "osnake": {
            "priority": EASY
        },
        "poisio": {
            "priority": EASY
        },
        "porcupine": {
            "priority": EASY
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
    mainTarget: MonsterName = "bee";

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko", "talkingskull"]);
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    attackLoop() {
        try {
            if(parent.character.hp < parent.character.max_hp - parent.character.attack * 0.5) {
                heal(parent.character)
                setTimeout(() => { this.attackLoop() }, parent.next_skill["attack"] - Date.now())
                return
            }

            // Check if there's any nearby party member that needs healing
            for (let member of parent.party_list || []) {
                if (parent.entities[member]) {
                    if (distance(parent.character, parent.entities[member]) < parent.character.range
                        && parent.entities[member].hp <= parent.entities[member].max_hp - parent.character.attack * 0.5) {
                        heal(parent.entities[member])
                        setTimeout(() => { this.attackLoop() }, parent.next_skill["attack"] - Date.now())
                        return
                    }
                }
            }
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.attackLoop() }, parent.next_skill["attack"] - Date.now());
        }
        
        super.attackLoop();
    }
}

let priest = new Priest();
export { priest }