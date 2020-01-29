import { Character } from "./character"
import { MonsterType, Entity } from "./definitions/adventureland"
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from "./trade"
import { TargetPriorityList } from "./definitions/bots"
import { isPlayer, getCooldownMS, isAvailable, calculateDamageRange, sleep } from "./functions"

class Ranger extends Character {
    targetPriority: TargetPriorityList = {
        "arcticbee": {
            "priority": 0
        },
        "armadillo": {
            "priority": 0,
            "stopOnSight": true
        },
        "bat": {
            "priority": 0,
            "stopOnSight": true,
            "farmingPosition": {
                "map": "cave",
                "x": -200,
                "y": -450
            }
        },
        "bbpompom": {
            "coop": ["priest"],
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "priority": 0,
            "farmingPosition": {
                "map": "winter_cave",
                "x": -50,
                "y": -100
            }
        },
        "bee": {
            "priority": 50,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "main",
                "x": 550,
                "y": 1100
            }
        },
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": 0,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": 0,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
        },
        "cgoo": {
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": 0
        },
        "crab": {
            "priority": 0
        },
        "crabx": {
            // They can hurt, but they move really slow and they're pretty out of the way.
            "priority": 100
        },
        "croc": {
            "priority": 100
        },
        // "dragold": {
        //     "coop": ["priest", "warrior"],
        //     "priority": SPECIAL,
        //     "holdAttackWhileMoving": true,
        //     "stopOnSight": true,
        // },
        "ghost": {
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": 0
        },
        "goldenbat": {
            "priority": 1000,
            "stopOnSight": true
        },
        "goo": {
            "priority": -50,
        },
        "greenjr": {
            "priority": 1000,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "hen": {
            "priority": 0
        },
        "iceroamer": {
            "holdAttackWhileMoving": true,
            "priority": 0,
            "stopOnSight": true,
        },
        "jr": {
            // jr has a high evasion %, but the ranger can kinda do it still
            "priority": 1000,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
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
            }
        },
        "minimush": {
            "priority": 100,
            "stopOnSight": true
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
            }
        },
        "mummy": {
            "coop": ["ranger", "priest", "warrior"],
            "priority": 0,
            "holdPositionFarm": true,
            "holdAttackWhileMoving": true,
            "farmingPosition": {
                "map": "spookytown",
                "x": 175,
                "y": -1060
            }
        },
        "mrgreen": {
            "priority": 1000,
            "stopOnSight": true
        },
        "mrpumpkin": {
            "priority": 1000,
            "stopOnSight": true
        },
        "osnake": {
            "priority": 500,
            "stopOnSight": true
        },
        "phoenix": {
            "priority": 1000
        },
        "poisio": {
            "priority": 250
        },
        "porcupine": {
            "priority": 0
        },
        "prat": {
            // Go to a cliff where we can attack them, but they can't attack us.
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
            "priority": 0,
            farmingPosition: {
                "map": "level1",
                "x": -300,
                "y": 536
            }
        },
        "rat": {
            "priority": 0
        },
        "rooster": {
            "priority": 0
        },
        "scorpion": {
            "priority": 250
        },
        "snake": {
            // Farm them on the main map because of the +1000% luck and gold bonus chances
            "priority": 0,
            "stopOnSight": true, // TODO: Temporary
            farmingPosition: {
                "map": "main",
                "x": -74,
                "y": 1904
            }
        },
        "snowman": {
            "priority": 1000,
            "stopOnSight": true
        },
        "spider": {
            "priority": 100
        },
        "squig": {
            "priority": 100,
        },
        "squigtoad": {
            "priority": 250
        },
        "stoneworm": {
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": 0
        },
        "tortoise": {
            "stopOnSight": true,
            "priority": 0
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "priority": 0,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "xscorpion": {
            "priority": 0,
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
    mainTarget: MonsterType = "scorpion"
    startTime = Date.now()

    run(): void {
        super.run()
        this.superShotLoop()
        this.huntersmarkLoop()
        // this.fourFingersLoop();
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant("earthMer", this.itemsToKeep)
            transferGoldToMerchant("earthMer", 100000)
            sellUnwantedItems(this.itemsToSell)

            this.createParty(["earthMag", "earthWar", "earthMer", "earthPri"])

            // Switch between warrior and mage if they are idle
            const monsterHunts = []
            for (const member of parent.party_list) {
                if (this.info.party[member] && this.info.party[member].monsterHuntTarget) {
                    monsterHunts.push(this.info.party[member].monsterHuntTarget)
                }
            }
            if (parent.party_list.includes("earthMag")
                && this.info.party.earthMag
                && this.info.party.earthMag.shouldSwitchServer
                && !monsterHunts.includes(this.info.party.earthMag.s.monsterhunt.id) // Another member is doing this member's monster hunt
                && Date.now() - this.startTime > 120000) {
                this.startTime = Date.now()
                stop_character("earthMag")
                start_character("earthWar")
                await sleep(2500)
            } else if (parent.party_list.includes("earthWar")
                && this.info.party.earthWar
                && this.info.party.earthWar.shouldSwitchServer
                && !monsterHunts.includes(this.info.party.earthWar.s.monsterhunt.id) // Another member is doing this member's monster hunt
                && Date.now() - this.startTime > 120000) {
                this.startTime = Date.now()
                stop_character("earthWar")
                start_character("earthMag")
                await sleep(2500)
            }

            // Switch servers if everyone in the party wants to
            if (Date.now() - this.startTime > 60000) {
                let shouldSwitchServer = 0
                for (const id of parent.party_list) {
                    const member = this.info.party[id]
                    if (member.shouldSwitchServer) { shouldSwitchServer += 1 }
                }
                if (shouldSwitchServer == parent.party_list.length) {
                    if (parent.server_region == "ASIA")
                        change_server("US", "I")
                    else if (parent.server_region == "US" && parent.server_identifier == "I")
                        change_server("US", "II")
                    else if (parent.server_region == "US" && parent.server_identifier == "II")
                        change_server("EU", "I")
                    else if (parent.server_region == "EU" && parent.server_identifier == "I")
                        change_server("EU", "II")
                    else if (parent.server_region == "EU" && parent.server_identifier == "II")
                        change_server("ASIA", "I")

                    setTimeout(() => { this.mainLoop() }, 10000)
                    return
                }
            }

            super.mainLoop()
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop() }, 250)
        }
    }

    huntersmarkLoop(): void {
        try {
            const targets = this.getTargets(1)
            if (targets.length // We have a target
                && !targets[0].s.marked // The target isn't marked
                && targets[0].hp > calculateDamageRange(parent.character, targets[0])[0] * 5 // The target has a lot of HP
                && this.wantToAttack(targets[0], "huntersmark")) // We want to attack it
                use_skill("huntersmark", targets[0])
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.huntersmarkLoop() }, getCooldownMS("huntersmark"))
    }

    fourFingersLoop(): void {
        try {
            const targets = this.getTargets(1)
            if (parent.character.mp > 260 // We have MP
                && targets.length > 0 // We have a target
                && !parent.character.stoned // Can use skills
                && distance(parent.character, targets[0]) <= 120 // The target is in range
                && isPlayer(targets[0])
                && isAvailable("4fingers")
                && targets[0].target == parent.character.name // The target is targetting us
                && parent.character.hp < targets[0].attack * 10 // We don't have much HP
            ) {
                use_skill("4fingers", targets[0])
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.fourFingersLoop() }, getCooldownMS("4fingers"))
    }

    async superShotLoop(): Promise<void> {
        try {
            const targets = this.getTargets(1, parent.character.range * G.skills["supershot"].range_multiplier)
            if (targets.length
                && this.wantToAttack(targets[0], "supershot")) {
                await use_skill("supershot", targets[0])
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.superShotLoop() }, getCooldownMS("supershot"))
    }

    protected async attackLoop(): Promise<void> {
        try {
            const targets = this.getTargets(5)
            if (targets.length >= 5
                && this.wantToAttack(targets[0], "5shot")) {
                // See if we can fiveshot some enemies
                const fiveshotTargets: Entity[] = []
                for (const entity of targets) {
                    if (!entity.target && (entity.hp > calculateDamageRange(parent.character, entity)[0] * 0.5)) continue // Too much HP, or not targeting us
                    if (distance(parent.character, entity) > parent.character.range) continue

                    fiveshotTargets.push(entity)
                    if (fiveshotTargets.length == 5) break
                }
                if (fiveshotTargets.length == 5) {
                    await use_skill("5shot", fiveshotTargets)
                    setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                    return
                }
            }
            if (targets.length >= 3
                && this.wantToAttack(targets[0], "3shot")) {
                // See if we can three shot some enemies.
                const threeshotTargets: Entity[] = []
                for (const entity of targets) {
                    if (!entity.target && (entity.hp > calculateDamageRange(parent.character, entity)[0] * 0.7)) continue // Too much HP to kill in one shot (don't aggro too many)
                    if (distance(parent.character, entity) > parent.character.range) continue

                    threeshotTargets.push(entity)
                    if (threeshotTargets.length == 3) break
                }
                if (threeshotTargets.length == 3) {
                    await use_skill("3shot", threeshotTargets)
                    setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                    return
                }
            }

            const piercingShotCalcCharacter = { ...parent.character }
            piercingShotCalcCharacter.apiercing += G.skills["piercingshot"].apiercing
            piercingShotCalcCharacter.attack *= G.skills["piercingshot"].damage_multiplier
            if (targets.length
                && this.wantToAttack(targets[0], "piercingshot")
                && calculateDamageRange(piercingShotCalcCharacter, targets[0])[0] > calculateDamageRange(parent.character, targets[0])[0]) {
                await use_skill("piercingshot", targets[0])
                setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
                return
            }
        } catch (error) {
            if (!["cooldown", "not_found", "disabled"].includes(error.reason))
                console.error(error)
        }

        // Can't do a special attack, so let's do a normal one
        super.attackLoop()
    }

    createParty(members: string[]): void {
        if (parent.party_list.length >= 4) return // We already have the maximum amount of party members
        for (const member of members) {
            if (!parent.party[member])
                send_party_invite(member)
        }
    }
}

const ranger = new Ranger()
export { ranger }