import { Character } from "./character"
import { MonsterType, Entity } from "./definitions/adventureland"
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from "./trade"
import { TargetPriorityList } from "./definitions/bots"
import { getCooldownMS, getAttackingEntities, calculateDamageRange, isAvailable, isMonster } from "./functions"

const DIFFICULT = 10
const MEDIUM = 20
const EASY = 30
const SPECIAL = 500

class Warrior extends Character {
    targetPriority: TargetPriorityList = {
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
                "y": -850
            }
        },
        "crab": {
            "priority": EASY
        },
        "croc": {
            "priority": EASY
        },
        // "dragold": {
        //     "coop": ["priest"],
        //     "priority": SPECIAL,
        //     "holdAttackWhileMoving": true,
        //     "stopOnSight": true,
        // },
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
                "y": -1090
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
            "stopOnSight": true, // TODO: Temporary
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
            "stopOnSight": true,
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
        this.agitateLoop()
        this.chargeLoop()
        this.hardshellLoop()
        this.cleaveLoop()
        this.stompLoop()
        this.warcryLoop()
        this.tauntLoop()
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant("earthMer", this.itemsToKeep)
            transferGoldToMerchant("earthMer", 100000)
            sellUnwantedItems(this.itemsToSell)

            super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop() }, 250)
        }
    }

    agitateLoop(): void {
        try {
            if (isAvailable("agitate")) {
                let inAgitateCount = 0
                for (const id in parent.entities) {
                    const e = parent.entities[id]
                    if (e.type != "monster") continue

                    const d = distance(parent.character, e)
                    if (e.target == parent.character.id) {
                        // Something is already targeting us
                        inAgitateCount = 0
                        break
                    }
                    if (d <= G.skills["agitate"].range) {
                        if (!this.wantToAttack(e)) {
                            // There's something we don't want to attack in agitate range, so don't use it.
                            inAgitateCount = 0
                            break
                        }
                        if (d <= parent.character.range) {
                            // There's something in attacking range already, we don't need to agitate to attack stuff
                            inAgitateCount = 0
                            break
                        }
                        inAgitateCount += 1
                    }
                }
                if (inAgitateCount == 1 || inAgitateCount == 2) {
                    use_skill("agitate")
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.agitateLoop() }, getCooldownMS("agitate"))
    }

    warcryLoop(): void {
        if (isAvailable("warcry")) {
            // Check if there are at least two party members nearby
            let count = 0
            for (const member of parent.party_list) {
                const e = parent.entities[member]
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
        setTimeout(() => { this.warcryLoop() }, getCooldownMS("warcry"))
    }

    stompLoop(): void {
        // TODO: Move this to isAvailable
        if(parent.character.slots.mainhand.name != "basher") {
            setTimeout(() => { this.stompLoop() }, 1000)
            return
        }
        // Stomp monsters with high HP
        const attackingTargets = getAttackingEntities()
        if (isAvailable("stomp") && attackingTargets.length) {

            if (attackingTargets[0].hp > 25000 && distance(parent.character, attackingTargets[0]) < parent.character.range) {
                use_skill("stomp")
            }
        }
        setTimeout(() => { this.stompLoop() }, getCooldownMS("stomp"))
    }

    cleaveLoop(): void {
        // TODO: Move this to isAvailable
        if(parent.character.slots.mainhand.name != "bataxe") {
            setTimeout(() => { this.cleaveLoop() }, 1000)
            return
        }
        // Stomp monsters with high HP
        const nearbyEntities: Entity[] = []
        for (const id in parent.entities) {
            const entity = parent.entities[id]
            if (distance(parent.character, entity) > G.skills["cleave"].range) continue
            if (parent.character.attack < calculateDamageRange(parent.character, entity)[0]) continue
            if (!this.targetPriority[entity.mtype]) continue

            nearbyEntities.push(entity)
        }
        if (isAvailable("cleave") && nearbyEntities.length > 3) {
            use_skill("cleave")
        }
        setTimeout(() => { this.cleaveLoop() }, getCooldownMS("cleave"))
    }

    chargeLoop(): void {
        if (isAvailable("charge")) use_skill("charge")
        setTimeout(() => { this.chargeLoop() }, getCooldownMS("charge"))
    }

    hardshellLoop(): void {
        const targets = getAttackingEntities()
        if (isAvailable("hardshell")
            && targets.length // We have a target
            && distance(targets[0], parent.character) <= targets[0].range // In range of their attacks
            && parent.character.hp < calculateDamageRange(targets[0], parent.character)[1] * 5) { // Not a lot of HP remaining
            use_skill("hardshell")
        }
        setTimeout(() => { this.hardshellLoop() }, getCooldownMS("hardshell"))
    }

    async tauntLoop(): Promise<void> {
        try {
            const attackingMonsters = getAttackingEntities()
            const targets = this.getTargets(1, G.skills["taunt"].range)
            if (attackingMonsters.length == 0 && targets.length && this.wantToAttack(targets[0], "taunt")) {
                await use_skill("taunt", targets[0])
            } else if (isAvailable("taunt") && attackingMonsters.length < 2) {
                // Check if any nearby party members have an attacking enemy. If they do, taunt it away.
                for (const id in parent.entities) {
                    const e = parent.entities[id]
                    if (!isMonster(e)) continue
                    if (e.target != parent.character.id && parent.party_list.includes(e.target)) {
                        await use_skill("taunt", e)
                        break
                    }
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.tauntLoop() }, getCooldownMS("taunt"))
    }
}

const warrior = new Warrior()
export { warrior }