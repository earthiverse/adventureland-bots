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
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "main",
                "x": 1450,
                "y": -20
            }
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
        },
        "booboo": {
            "coop": ["priest", "mage"],
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "spookytown",
                "x": 250,
                "y": -550
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
        // "mole": {
        //     "coop": ["priest", "mage", "ranger"],
        //     "holdPositionFarm": true,
        //     "holdAttackWhileMoving": true,
        //     "priority": DIFFICULT,
        //     "farmingPosition": {
        //         "map": "tunnel",
        //         "x": 0,
        //         "y": -75
        //     }
        // },
        "mrgreen": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "mrpumpkin": {
            "priority": SPECIAL,
            "stopOnSight": true
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
        "stoneworm": {
            // Don't attack if we're walking by them, they hurt.
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "tortoise": {
            "stopOnSight": true,
            "priority": EASY
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
    mainTarget: MonsterType = "poisio";

    run(): void {
        super.run();
        this.energizeLoop();
    }

    async mainLoop(): Promise<void> {
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

    blessingLoop(): void {
        if (isAvailable("darkblessing")) {
            // Check if there are at least two party members nearby
            let count = 0
            for (const member of parent.party_list) {
                let e = parent.entities[member]
                if (!e) continue
                if (e.ctype == "merchant") continue

                if (parent.distance(parent.character, e) < G.skills["darkblessing"].range) {
                    count += 1
                }
                if (count == 2) {
                    use_skill("darkblessing")
                    break
                }
            }
        }
        setTimeout(() => { this.blessingLoop() }, getCooldownMS("darkblessing"));
    }

    // TODO: cast on the member of the party with the lowest mp
    energizeLoop(): void {
        try {
            // Get nearby party members
            if (isAvailable("energize"))
                for (const id in parent.entities) {
                    if (id == parent.character.name) continue // Don't cast on ourself.
                    if (distance(parent.character, parent.entities[id]) > G.skills["energize"].range) continue // Out of range
                    if (!parent.party_list.includes(id)) continue // Not in our party

                    use_skill("energize", parent.entities[id])
                    break
                }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.energizeLoop() }, getCooldownMS("energize"));
    }
}

let mage = new Mage();
export { mage }