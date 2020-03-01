import { Character } from "./character"
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from "./trade"
import { TargetPriorityList } from "./definitions/bots"
import { MonsterType } from "./definitions/adventureland"
import { getCooldownMS, isAvailable, getEntities } from "./functions"

const DIFFICULT = 10
const MEDIUM = 20
const EASY = 30
const SPECIAL = 500

class Mage extends Character {
    targetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": EASY
        },
        "armadillo": {
            "priority": EASY
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
            "holdAttackWhileMoving": true
        },
        "booboo": {
            "coop": ["priest"],
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
        "fireroamer": {
            "coop": ["priest", "warrior"],
            "priority": 0,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "desertland",
                "x": 150,
                "y": -650
            }
        },
        "frog": {
            "priority": EASY
        },
        "ghost": {
            "coop": ["priest"],
            "priority": 0,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "halloween",
                "x": 300,
                "y": -1200
            }
        },
        "goldenbat": {
            "priority": SPECIAL
        },
        "goo": {
            "priority": EASY,
        },
        "greenjr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true
        },
        "hen": {
            "priority": EASY
        },
        "iceroamer": {
            // Don't attack if we're walking by them, they hurt.
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT
        },
        "jr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true
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
            "priority": EASY
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
            "priority": SPECIAL
        },
        "mrpumpkin": {
            "priority": SPECIAL
        },
        "osnake": {
            "priority": EASY
        },
        "mvampire": {
            priority: 0,
            "coop": ["priest"]
        },
        "phoenix": {
            "priority": SPECIAL
        },
        "pinkgoo": {
            "priority": 1000
        },
        "plantoid": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
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
                "x": -296.5,
                "y": 557.5
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
            "priority": SPECIAL
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
            "priority": DIFFICULT
        },
        "tortoise": {
            "priority": EASY
        },
        "wolf": {
            "coop": ["priest", "warrior"],
            "priority": 0,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "winterland",
                "x": 375,
                "y": -2475
            }
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "priority": 0,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true
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
        super.run()
        this.energizeLoop()
        this.cburstLoop()
        // this.magiportLoop()
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant(process.env.MERCHANT, this.itemsToKeep)
            transferGoldToMerchant(process.env.MERCHANT, 100000)
            sellUnwantedItems(this.itemsToSell)

            super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop() }, 250)
        }
    }

    cburstLoop(): void {
        try {
            const targets: [string, number][] = []
            let manaUse = G.skills.cburst.mp
            for (const target of this.getTargets(10, parent.character.range)) {
                if (target.hp > 100) continue
                if (!this.wantToAttack(target, "cburst")) continue

                const manaCost = target.hp / G.skills.cburst.ratio
                if (manaUse + manaCost > parent.character.mp) break

                manaUse += manaCost
                targets.push([target.id, manaCost])
            }
            if (isAvailable("cburst") && targets.length) {
                use_skill("cburst", targets)
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.cburstLoop() }, getCooldownMS("cburst"))
    }

    // TODO: cast on the member of the party with the lowest mp
    energizeLoop(): void {
        try {
            // Get nearby party members
            if (isAvailable("energize")) {
                for (const entity of getEntities({ isPartyMember: true, isWithinDistance: G.skills["energize"].range, isRIP: false })) {
                    use_skill("energize", entity)
                    break
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.energizeLoop() }, getCooldownMS("energize"))
    }

    // magiportLoop(): void {
    //     try {
    //         // Get a list of all nearby monsters
    //         const nearbyMonsters = getVisibleMonsterTypes()
    //         if (isAvailable("magiport")) {
    //             for (const memberName of parent.party_list) {
    //                 if (memberName == parent.character.name) continue // Don't magiport ourselves?
    //                 if (parent.entities[memberName]) continue // Already nearby
    //                 const member = this.info.party[memberName]
    //                 if (!member) continue // No info yet


    // TODO: Fix the following line now that we deal with a list of monsterHuntTargets
    //                 if (member.monsterHuntTargets && nearbyMonsters.has(member.monsterHuntTarget)) {
    //                     // TODO: Offer a magiport
    //                     use_skill("magiport", memberName)
    //                     break
    //                 }
    //             }
    //         }
    //     } catch (error) {
    //         console.error(error)
    //     }
    //     setTimeout(() => { this.magiportLoop() }, getCooldownMS("magiport"))
    // }
}

const mage = new Mage()
export { mage }