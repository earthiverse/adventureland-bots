import { Character } from "./character"
import { MonsterName } from "./definitions/adventureland"
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from "./trade"
import { TargetPriorityList, PriorityEntity } from "./definitions/bots"
import { getCooldownMS, isAvailable } from "./functions"
import FastPriorityQueue from "fastpriorityqueue"

const DIFFICULT = 10
const MEDIUM = 20
const EASY = 30
const SPECIAL = 500

class Priest extends Character {
    targetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "armadillo": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "bat": {
            "priority": EASY,
            "farmingPosition": {
                "map": "cave",
                "x": 300,
                "y": -1100
            },
            "equip": ["orbg"]
        },
        "bbpompom": {
            "coop": ["priest"],
            "holdPositionFarm": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "winter_cave",
                "x": 50,
                "y": -100
            },
            "equip": ["jacko"]
        },
        "bee": {
            "priority": EASY,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "main",
                "x": 200,
                "y": 1500
            },
            "equip": ["orbg"]
        },
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "main",
                "x": 1450,
                "y": 30
            },
            "equip": ["jacko"]
        },
        "boar": {
            // The ranger is fast enough to kill these without dying too much.
            "coop": ["warrior", "priest"],
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "winterland",
                "x": -50,
                "y": -850
            },
            "equip": ["jacko"]
        },
        "booboo": {
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "spookytown",
                "x": 250,
                "y": -600
            },
            "equip": ["jacko"]
        },
        "cgoo": {
            "priority": DIFFICULT,
            "equip": ["jacko"]
        },
        "crab": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "crabx": {
            // They can hurt, but they move really slow and they're pretty out of the way.
            "priority": MEDIUM,
            "equip": ["orbg"]
        },
        "croc": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        // "dragold": {
        //     "coop": ["warrior"],
        //     "priority": SPECIAL,
        //     "holdAttackWhileMoving": true
        // },
        // "fireroamer": {
        //     "coop": ["warrior"],
        //     "priority": 0,
        //     "holdPositionFarm": true,
        //     "holdAttackWhileMoving": true,
        //     "farmingPosition": {
        //         "map": "desertland",
        //         "x": 100,
        //         "y": -650
        //     },
        //     "equip": ["jacko"]
        // },
        "frog": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "fvampire": {
            "coop": ["warrior", "ranger"],
            "priority": 0,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "halloween",
                "x": -150,
                "y": -1500
            },
            "equip": ["jacko"]
        },
        "ghost": {
            "coop": ["priest"],
            "priority": 0,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "halloween",
                "x": 300,
                "y": -1100
            },
            "equip": ["jacko"]
        },
        "goldenbat": {
            "priority": SPECIAL,
            "farmingPosition": {
                "map": "cave",
                "x": 300,
                "y": -1100
            },
            "equip": ["jacko"]
        },
        "goo": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "greenjr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "equip": ["jacko"]
        },
        "hen": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "iceroamer": {
            "priority": DIFFICULT,
            "equip": ["jacko"]
        },
        "jr": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "equip": ["jacko"]
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
            },
            "equip": ["jacko"]
        },
        "minimush": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "mole": {
            "coop": ["priest", "warrior"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "tunnel",
                "x": 50,
                "y": -75
            },
            "equip": ["jacko"]
        },
        "mrgreen": {
            "priority": SPECIAL,
            "equip": ["jacko"]
        },
        "mrpumpkin": {
            "priority": SPECIAL,
            "equip": ["jacko"]
        },
        "mummy": {
            "coop": ["warrior"],
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "spookytown",
                "x": 210,
                "y": -1030
            },
            "equip": ["jacko"]
        },
        "mvampire": {
            priority: 0,
            "coop": ["ranger"],
            "equip": ["jacko"]
        },
        "oneeye": {
            "coop": ["ranger", "warrior"],
            "priority": 0,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "level2w",
                "x": -135,
                "y": -50
            },
            "equip": ["jacko"]
        },
        "osnake": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "phoenix": {
            "priority": SPECIAL,
            "equip": ["orbg"]
        },
        // "pinkgoblin": {
        //     "priority": 100,
        //     "holdAttackWhileMoving": true,
        //     "coop": ["warrior", "ranger"]
        // },
        "pinkgoo": {
            "priority": 1000,
            "equip": ["jacko"]
        },
        "plantoid": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "equip": ["jacko"]
        },
        "poisio": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "porcupine": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "prat": {
            // Our plan is to go to a spot on a cliff where they can't attack us, but we can attack them.
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "holdAttackInEntityRange": true,
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "level1",
                "x": -296.5,
                "y": 557.5
            },
            "equip": ["jacko"]
        },
        "rat": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "rooster": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "scorpion": {
            "priority": MEDIUM,
            "equip": ["orbg"]
        },
        "snake": {
            // Farm them on the main map because of the +1000% luck and gold bonus chances
            "priority": EASY,
            holdPositionFarm: true,
            "farmingPosition": {
                "map": "main",
                "x": -74,
                "y": 1904
            },
            "equip": ["orbg"]
        },
        "snowman": {
            "priority": SPECIAL,
            "equip": ["orbg"]
        },
        "spider": {
            "priority": MEDIUM,
            "equip": ["orbg"]
        },
        "squig": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "squigtoad": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "stoneworm": {
            // Don't attack if we're walking by them, they hurt.
            "priority": DIFFICULT,
            "equip": ["jacko"]
        },
        "tortoise": {
            "priority": EASY,
            "equip": ["orbg"]
        },
        "wolf": {
            "coop": ["warrior"],
            "priority": 0,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "winterland",
                "x": 525,
                "y": -2475
            },
            "equip": ["jacko"]
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "coop": ["warrior", "priest"],
            "priority": DIFFICULT,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "winterland",
                "x": -50,
                "y": -1825
            },
            "equip": ["jacko"]
        },
        "xscorpion": {
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "halloween",
                "x": -230,
                "y": 570
            },
            "equip": ["orbg"]
        }
    }
    mainTarget: MonsterName = "scorpion"

    constructor() {
        super()
        this.itemsToKeep.push(
            // Weapons
            "pmace",

            // Shields
            "mshield", "shield", "sshield", "xshield"
        )
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant(process.env.MERCHANT, this.itemsToKeep)
            transferGoldToMerchant(process.env.MERCHANT, 100000)
            sellUnwantedItems(this.itemsToSell)

            await super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(async () => { this.mainLoop() }, 250)
        }
    }

    async run() {
        await super.run()
        this.darkBlessingLoop()
        this.partyHealLoop()
    }

    protected partyHealLoop(): void {
        if (isAvailable("partyheal")) {
            for (const member of parent.party_list) {
                const e = parent.entities[member]
                if (!e) continue
                if (e.rip) continue
                if (e.hp / e.max_hp < 0.5) {
                    use_skill("partyheal")
                    reduce_cooldown("partyheal", Math.min(...parent.pings))
                    break
                }
            }
        }
        setTimeout(() => { this.partyHealLoop() }, getCooldownMS("partyheal"))
    }

    // protected absorbLoop(): void {

    // }

    protected darkBlessingLoop(): void {
        if (isAvailable("darkblessing")) {
            // Check if there are at least two party members nearby
            let count = 0
            for (const member of parent.party_list) {
                const e = parent.entities[member]
                if (!e) continue
                if (e.ctype == "merchant") continue
                if (e.id == parent.character.id) continue

                if (distance(parent.character, e) < G.skills["darkblessing"].range) {
                    count += 1
                }
                if (count == 2) {
                    use_skill("darkblessing")
                    reduce_cooldown("darkblessing", Math.min(...parent.pings))
                    break
                }
            }
        }
        setTimeout(() => { this.darkBlessingLoop() }, getCooldownMS("darkblessing"))
    }

    protected async attackLoop(): Promise<void> {
        try {
            if (parent.character.c.town) {
                setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
                return
            }

            if (parent.character.hp < parent.character.max_hp - parent.character.attack * 0.9) {
                await heal(parent.character)
                reduce_cooldown("attack", Math.min(...parent.pings))
                setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack", true))
                return
            }

            // Heal the party member with the lowest % of hp
            const healTargets = new FastPriorityQueue<PriorityEntity>((x, y) => x.priority > y.priority)
            for (const member of parent.party_list || []) {
                const entity = parent.entities[member]
                if (entity
                    && distance(parent.character, parent.entities[member]) < parent.character.range
                    && !parent.entities[member].rip
                    && parent.entities[member].hp / parent.entities[member].max_hp < 0.9) {
                    healTargets.add({ id: member, priority: parent.character.max_hp / parent.character.hp }) // The bigger the discrepancy -- the higher the priority
                }
            }
            if (healTargets.size) {
                await heal(parent.entities[healTargets.poll().id])
                reduce_cooldown("attack", Math.min(...parent.pings))
                setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack", true))
                return
            }
        } catch (error) {
            console.error(error)
            setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
            return
        }

        await super.attackLoop()
    }
}

const priest = new Priest()
export { priest }