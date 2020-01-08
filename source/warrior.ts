import { Character } from './character'
import { MonsterType } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { getCooldownMS, getAttackingEntities, calculateDamageRange, wantToAttack, isAvailable } from './functions';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 500;

class Warrior extends Character {
    targets: TargetPriorityList = {
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

    constructor() {
        super()
        this.itemsToKeep.push(
            "basher", "bataxe", "candycanesword"
        )
    }

    run(): void {
        super.run()
        this.chargeLoop()
        this.hardshellLoop()
        this.stompLoop()
        this.warcryLoop()
    }

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", this.itemsToKeep);
            transferGoldToMerchant("earthMer", 100000);
            sellUnwantedItems(this.itemsToSell);

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    warcryLoop(): void {
        if (isAvailable("warcry")) {
            // Check if there are at least two party members nearby
            let count = 0
            for (let member of parent.party_list) {
                let e = parent.entities[member]
                if (e && parent.distance(parent.character, e) < G.skills["warcry"].range) {
                    count += 1
                }
                if (count == 2) {
                    use_skill("warcry")
                    break
                }
            }
        }
        setTimeout(() => { this.warcryLoop() }, getCooldownMS("warcry"));
    }

    stompLoop(): void {
        // Stomp monsters with high HP
        let targets = getAttackingEntities()
        if (isAvailable("stomp")
            && targets.length && targets[0].hp > 25000) {
            use_skill("stomp")
        }
        setTimeout(() => { this.stompLoop() }, getCooldownMS("stomp"));
    }

    chargeLoop(): void {
        if (isAvailable("charge")) {
            use_skill("charge")
        }
        setTimeout(() => { this.chargeLoop() }, getCooldownMS("charge"));
    }

    hardshellLoop(): void {
        let targets = getAttackingEntities()
        if (isAvailable("hardshell")
            && targets.length // We have a target
            && distance(targets[0], parent.character) <= targets[0].range // In range of their attacks
            && parent.character.hp < calculateDamageRange(targets[0], parent.character)[1] * 5) { // Not a lot of HP remaining
            use_skill("hardshell")
        }
        setTimeout(() => { this.hardshellLoop() }, getCooldownMS("hardshell"));
    }
}

let warrior = new Warrior();
export { warrior }