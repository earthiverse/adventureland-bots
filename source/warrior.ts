import { Character } from './character'
import { MonsterType } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { getCooldownMS, getAttackingEntities, calculateDamageRange, wantToAttack, isAvailable, isMonster, getNearbyMonsterSpawns, getInRangeMonsters } from './functions';

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
            "stopOnSight": true,
            "farmingPosition": {
                "map": "cave",
                "x": 1250,
                "y": -800
            }
        },
        "bbpompom": {
            "coop": ["priest"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "winter_cave",
                "x": 0,
                "y": -100
            }
        },
        "bee": {
            "priority": EASY
        },
        "boar": {
            // The ranger is fast enough to kill these without dying too much.
            "coop": ["warrior", "priest"],
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "winterland",
                "x": 0,
                "y": -1850
            }
        },
        "crab": {
            "priority": EASY
        },
        "croc": {
            "priority": EASY
        },
        "dragold": {
            "coop": ["priest"],
            "priority": SPECIAL,
            "holdAttackWhileMoving": true,
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
        "mechagnome": {
            "coop": ["priest", "ranger"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "cyberland",
                "x": 150,
                "y": -100
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
                "x": 0,
                "y": -75
            }
        },
        "mummy": {
            "coop": ["ranger", "priest", "warrior"],
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "spookytown",
                "x": 255,
                "y": -1080
            }
        },
        // "osnake": {
        //     "priority": EASY,
        //     "stopOnSight": true
        // },
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
        "tortoise": {
            "priority": EASY
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "coop": ["warrior", "priest"],
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "winterland",
                "x": 0,
                "y": -1825
            }
        },
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
        this.tauntLoop()
    }

    async mainLoop(): Promise<void> {
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
                if (!e) continue
                if (e.ctype == "merchant") continue

                if (parent.distance(parent.character, e) < G.skills["warcry"].range) {
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
        let attackingTargets = getAttackingEntities()
        if (isAvailable("stomp") && attackingTargets.length) {

            if (attackingTargets[0].hp > 25000 && distance(parent.character, attackingTargets[0]) < parent.character.range) {
                use_skill("stomp")
            }
        }
        setTimeout(() => { this.stompLoop() }, getCooldownMS("stomp"));
    }

    chargeLoop(): void {
        if (isAvailable("charge")) use_skill("charge")
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

    async tauntLoop(): Promise<void> {
        let attackingMonsters = getAttackingEntities()
        let targets = this.getTargets(1)
        if (attackingMonsters.length == 0 && targets.length && wantToAttack(this, targets[0], "taunt")) {
            await use_skill("taunt", targets[0])
        } else if (isAvailable("taunt") && attackingMonsters.length < 2) {
            // Check if any nearby party members have an attacking enemy. If they do, taunt it away.
            for (let id in parent.entities) {
                let e = parent.entities[id]
                if (!isMonster(e)) continue
                if (e.target != parent.character.id && parent.party_list.includes(e.target)) {
                    await use_skill("taunt", e)
                    break
                }
            }
        }
        setTimeout(() => { this.tauntLoop() }, getCooldownMS("taunt"));
    }
}

let warrior = new Warrior();
export { warrior }