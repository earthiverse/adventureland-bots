import { Character } from "./character"
import { MonsterName, Entity } from "./definitions/adventureland"
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from "./trade"
import { TargetPriorityList } from "./definitions/bots"
import { isPlayer, getCooldownMS, isAvailable, calculateDamageRange, getEntities } from "./functions"

class Ranger extends Character {
    // TODO: Figure out optimal weapons based on damage + crit + hp and override this in a function and put it in run()
    targetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": 0,
            "equip": ["crossbow", "t2quiver", "orbg"]
        },
        "armadillo": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "bat": {
            "priority": 0,
            "farmingPosition": {
                "map": "cave",
                "x": -200,
                "y": -450
            },
            "equip": ["firebow", "t2quiver", "orbg"]
        },
        "bbpompom": {
            "coop": ["priest"],
            "holdPositionFarm": true,
            "priority": 0,
            "farmingPosition": {
                "map": "winter_cave",
                "x": -50,
                "y": -100
            },
            "equip": ["hbow", "t2quiver", "jacko"]
        },
        "bee": {
            "priority": 50,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "main",
                "x": 550,
                "y": 1100
            },
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": 0,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": 0,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "booboo": {
            "coop": ["priest"],
            "priority": 0,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "spookytown",
                "x": 190,
                "y": -650
            },
            "equip": ["hbow", "quiver", "jacko"]
        },
        "cgoo": {
            "priority": 0,
            "farmingPosition": {
                "map": "arena",
                "x": 0,
                "y": -200
            },
            "equip": ["hbow", "t2quiver", "jacko"]
        },
        "crab": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "crabx": {
            // They can hurt, but they move really slow and they're pretty out of the way.
            "priority": 100,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "croc": {
            "priority": 100,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        // "dragold": {
        //     "coop": ["priest", "warrior"],
        //     "priority": SPECIAL,
        //     "holdAttackWhileMoving": true
        // },
        // "fireroamer": {
        //     "coop": ["priest", "warrior"],
        //     "priority": 0,
        //     "holdPositionFarm": true,
        //     "holdAttackWhileMoving": true,
        //     "farmingPosition": {
        //         "map": "desertland",
        //         "x": 150,
        //         "y": -650
        //     },
        //     "equip": ["firebow", "t2quiver", "jacko"]
        // },
        "fvampire": {
            "coop": ["warrior", "priest"],
            "priority": 0,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "halloween",
                "x": -225,
                "y": -1500
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "ghost": {
            "coop": ["priest"],
            "priority": 0,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "halloween",
                "x": 400,
                "y": -1200
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "goldenbat": {
            "priority": 1000,
            "farmingPosition": {
                "map": "cave",
                "x": -200,
                "y": -450
            },
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "goo": {
            "priority": -50,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "greenjr": {
            "priority": 1000,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "hen": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "iceroamer": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "jacko"]
        },
        "jr": {
            // jr has a high evasion %, but the ranger can kinda do it still
            "priority": 1000,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "mechagnome": {
            "coop": ["priest", "ranger"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": 0,
            "farmingPosition": {
                "map": "cyberland",
                "x": 150,
                "y": -150
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "minimush": {
            "priority": 100,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "mole": {
            "coop": ["priest", "warrior"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": 0,
            "farmingPosition": {
                "map": "tunnel",
                "x": -50,
                "y": -75
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "mummy": {
            "coop": ["priest", "warrior"],
            "priority": 0,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "spookytown",
                "x": 175,
                "y": -1060
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "mrgreen": {
            "priority": 1000,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "mrpumpkin": {
            "priority": 1000,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "mvampire": {
            priority: 0,
            "coop": ["priest"],
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "oneeye": {
            "coop": ["priest", "warrior"],
            "priority": 0,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "farmingPosition": {
                "map": "level2w",
                "x": -100,
                "y": 0
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "osnake": {
            "priority": 500,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "phoenix": {
            "priority": 1000,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        // "pinkgoblin": {
        //     "priority": 100,
        //     "holdAttackWhileMoving": true,
        //     "coop": ["warrior", "priest"],
        //     "equip": ["firebow", "t2quiver"]
        // },
        "pinkgoo": {
            "priority": 1000,
            "equip": ["bow", "t2quiver", "jacko"]
        },
        "poisio": {
            "priority": 250,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "porcupine": {
            "priority": 0,
            "equip": ["crossbow", "t2quiver", "orbg"]
        },
        "prat": {
            // Go to a cliff where we can attack them, but they can't attack us.
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "priority": 0,
            farmingPosition: {
                "map": "level1",
                "x": -316.5,
                "y": 557.5
            },
            "equip": ["hbow", "quiver", "orbg"]
        },
        "rat": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "rooster": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "scorpion": {
            "priority": 250,
            "equip": ["firebow", "t2quiver", "orbg"]
        },
        "snake": {
            // Farm them on the main map because of the +1000% luck and gold bonus chances
            "priority": 0, // TODO: Temporary
            farmingPosition: {
                "map": "main",
                "x": -74,
                "y": 1904
            },
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "snowman": {
            "priority": 1000,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "spider": {
            "priority": 100,
            "equip": ["firebow", "t2quiver", "orbg"]
        },
        "squig": {
            "priority": 100,
            "equip": ["hbow", "t2quiver", "orbg"]
        },
        "squigtoad": {
            "priority": 250,
            "equip": ["hbow", "quiver", "orbg"]
        },
        "stoneworm": {
            "priority": 0,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "tinyp": {
            "priority": 1000,
            "equip": ["firebow", "quiver", "orbg"],
            "attackOnlyWhenImmobile": true,
            "coop": ["warrior"]
        },
        "tortoise": {
            "priority": 0,
            "equip": ["hbow", "t2quiver", "orbg"]
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
            },
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "priority": 0,
            "equip": ["firebow", "t2quiver", "jacko"]
        },
        "xscorpion": {
            "priority": 0,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "halloween",
                "x": -210,
                "y": 570
            },
            "equip": ["firebow", "t2quiver", "orbg"]
        }
    }
    mainTarget: MonsterName = "scorpion"
    // switchServerCheck = Date.now()

    async run() {
        await super.run()
        this.superShotLoop()
        this.huntersmarkLoop()
        // this.trackLoop()
        this.fourFingersLoop()
    }

    constructor() {
        super()
        // TODO: change this to levels like items to sell
        this.itemsToKeep.push(
            // Bows
            "bow", "bowofthedead", "crossbow", "cupid", "firebow", "hbow", "merry", "t2bow", "t3bow",
            // Quivers
            "quiver", "t2quiver"
        )
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant(process.env.MERCHANT, this.itemsToKeep)
            transferGoldToMerchant(process.env.MERCHANT, 100000)
            sellUnwantedItems(this.itemsToSell)

            // const shouldSwitch = this.shouldSwitchServer()
            // if (shouldSwitch) {
            //     if (Date.now() - this.switchServerCheck > 60000) {
            //         // We've wanted to switch for a minute, let's switch
            //         if (parent.server_region == "ASIA")
            //             change_server("US", "I")
            //         else if (parent.server_region == "US" && parent.server_identifier == "I")
            //             change_server("US", "II")
            //         else if (parent.server_region == "US" && parent.server_identifier == "II")
            //             change_server("EU", "I")
            //         else if (parent.server_region == "EU" && parent.server_identifier == "I")
            //             change_server("EU", "II")
            //         else if (parent.server_region == "EU" && parent.server_identifier == "II")
            //             change_server("ASIA", "I")

            //         setTimeout(async () => { this.mainLoop() }, 30000)
            //         return
            //     }
            // } else {
            //     this.switchServerCheck = Date.now()
            // }

            await super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(async () => { this.mainLoop() }, 250)
        }
    }

    protected async huntersmarkLoop() {
        try {
            const targets = this.getTargets(1)
            if (targets.length // We have a target
                && !targets[0].s.marked // The target isn't marked
                && targets[0].hp > calculateDamageRange(parent.character, targets[0])[0] * 5 // The target has a lot of HP
                && this.wantToAttack(targets[0], "huntersmark")) { // We want to attack it 
                await use_skill("huntersmark", targets[0])
                reduce_cooldown("huntersmark", Math.min(...parent.pings))
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.huntersmarkLoop() }, getCooldownMS("huntersmark"))
    }

    async trackLoop(): Promise<void> {
        try {
            if (isAvailable("track") // We can use it
                && is_pvp() // Only track if we can be attacked by other players
            ) {
                await use_skill("track")
                reduce_cooldown("track", Math.min(...parent.pings))
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.trackLoop() }, getCooldownMS("track"))
    }

    async fourFingersLoop(): Promise<void> {
        try {
            const targets = getEntities({ "isPlayer": true, "isAttackingParty": true, "isWithinDistance": G.skills["4fingers"].range })

            if (isAvailable("4fingers") // We can use it
                && targets.length > 0 // We have a target
                && !parent.character.stoned // Can use skills
                && distance(parent.character, targets[0]) <= 120 // The target is in range
                && isPlayer(targets[0])
                && targets[0].target == parent.character.name // The target is targetting us
                && parent.character.hp < targets[0].attack * 10 // We don't have much HP
            ) {
                await use_skill("4fingers", targets[0])
                reduce_cooldown("4fingers", Math.min(...parent.pings))
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.fourFingersLoop() }, getCooldownMS("4fingers"))
    }

    async superShotLoop(): Promise<void> {
        try {
            for (const target of this.getTargets(10, parent.character.range * G.skills["supershot"].range_multiplier)) {
                if (this.wantToAttack(target, "supershot")) {
                    await use_skill("supershot", target)
                    reduce_cooldown("supershot", Math.min(...parent.pings))
                    break
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(async () => { this.superShotLoop() }, getCooldownMS("supershot"))
    }

    protected async attackLoop(): Promise<void> {
        try {
            const targets = this.getTargets(6)
            const firstTarget = targets.shift()
            if (targets.length >= 4
                && this.wantToAttack(firstTarget, "5shot")) {
                // See if we can fiveshot some enemies
                const fiveshotTargets: Entity[] = [firstTarget]
                for (const entity of targets) {
                    if (!entity.target && (entity.hp > calculateDamageRange(parent.character, entity)[0] * 0.5)) continue // Too much HP, or not targeting us

                    fiveshotTargets.push(entity)
                    if (fiveshotTargets.length == 5) break
                }
                if (fiveshotTargets.length == 5) {
                    await use_skill("5shot", fiveshotTargets)
                    reduce_cooldown("attack", Math.min(...parent.pings))
                    // TODO: When promises resolve on use_skill, change getCoolDownMS to not use ping
                    setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
                    return
                }
            }
            if (targets.length >= 2
                && this.wantToAttack(firstTarget, "3shot")) {
                // See if we can three shot some enemies.
                const threeshotTargets: Entity[] = [firstTarget]
                for (const entity of targets) {
                    if (!entity.target && (entity.hp > calculateDamageRange(parent.character, entity)[0] * 0.7)) continue // Too much HP to kill in one shot (don't aggro too many)

                    threeshotTargets.push(entity)
                    if (threeshotTargets.length == 3) break
                }
                if (threeshotTargets.length == 3) {
                    await use_skill("3shot", threeshotTargets)
                    reduce_cooldown("attack", Math.min(...parent.pings))
                    // TODO: When promises resolve on use_skill, change getCoolDownMS to not use ping
                    setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
                    return
                }
            }

            const piercingShotCalcCharacter = { ...parent.character }
            piercingShotCalcCharacter.apiercing += G.skills["piercingshot"].apiercing
            piercingShotCalcCharacter.attack *= G.skills["piercingshot"].damage_multiplier
            if (firstTarget
                && this.wantToAttack(firstTarget, "piercingshot")
                && calculateDamageRange(piercingShotCalcCharacter, firstTarget)[0] > calculateDamageRange(parent.character, firstTarget)[0]) {
                await use_skill("piercingshot", firstTarget)
                reduce_cooldown("attack", Math.min(...parent.pings))
                // TODO: When promises resolve on use_skill, change getCoolDownMS to not use ping
                setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
                return
            }
        } catch (error) {
            if (!["cooldown", "not_found", "disabled"].includes(error.reason))
                console.error(error)
            setTimeout(async () => { this.attackLoop() }, getCooldownMS("attack"))
            return
        }

        // Can't do a special attack, so let's do a normal one
        await super.attackLoop()
    }
}

const ranger = new Ranger()
export { ranger }