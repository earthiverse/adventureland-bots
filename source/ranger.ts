import { Character } from './character'
import { MonsterType, IEntity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { isPlayer, getCooldownMS, isAvailable, wantToAttack, calculateDamageRange, sleep } from './functions';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 500;

class Ranger extends Character {
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
            "priority": DIFFICULT,
            "farmingPosition": {
                "map": "winter_cave",
                "x": -50,
                "y": -100
            }
        },
        "bee": {
            "priority": EASY,
            "holdPositionFarm": true,
            farmingPosition: {
                "map": "main",
                "x": 550,
                "y": 1100
            }
        },
        "bigbird": {
            // The ranger is fast enough to avoid these fairly well
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": DIFFICULT,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
        },
        "cgoo": {
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
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
        "ghost": {
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
            "holdAttackWhileMoving": true,
            "priority": DIFFICULT,
            "stopOnSight": true,
        },
        "jr": {
            // jr has a high evasion %, but the ranger can kinda do it still
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
                "y": -150
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
                "x": -50,
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
                "x": 175,
                "y": -1060
            }
        },
        "mrgreen": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "mrpumpkin": {
            "priority": SPECIAL,
            "stopOnSight": true
        },
        "osnake": {
            "priority": EASY,
            "stopOnSight": true
        },
        "phoenix": {
            "priority": SPECIAL
        },
        "poisio": {
            "priority": EASY
        },
        "porcupine": {
            "priority": EASY
        },
        "prat": {
            // Go to a cliff where we can attack them, but they can't attack us.
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "holdPositionFarm": true,
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
        "squigtoad": {
            "priority": EASY
        },
        "stoneworm": {
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "tortoise": {
            "priority": EASY
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "priority": DIFFICULT,
            "holdAttackInEntityRange": true,
            "holdAttackWhileMoving": true,
            "stopOnSight": true
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
    mainTarget: MonsterType = "scorpion";
    start_time = Date.now();

    run(): void {
        super.run();
        this.superShotLoop();
        this.huntersmarkLoop();
        // this.fourFingersLoop();
    }

    async mainLoop(): Promise<void> {
        try {
            transferItemsToMerchant("earthMer", this.itemsToKeep);
            transferGoldToMerchant("earthMer", 100000);
            sellUnwantedItems(this.itemsToSell);

            this.createParty(["earthMag", "earthWar", "earthMer", "earthPri"]);

            // Switch between warrior and mage if they are idle
            let monsterHunts = []
            for (let member of parent.party_list) {
                if (this.info.party[member] && this.info.party[member].monsterHuntTarget) {
                    monsterHunts.push(this.info.party[member].monsterHuntTarget)
                }
            }
            if (parent.party_list.includes("earthMag")
                && this.info.party.earthMag
                && this.info.party.earthMag.shouldSwitchServer
                && !monsterHunts.includes(this.info.party.earthMag.s.monsterhunt.id) // Another member is doing this member's monster hunt
                && Date.now() - this.start_time > 120000) {
                this.start_time = Date.now()
                stop_character("earthMag")
                start_character("earthWar")
                await sleep(2500)
            } else if (parent.party_list.includes("earthWar")
                && this.info.party.earthWar
                && this.info.party.earthWar.shouldSwitchServer
                && !monsterHunts.includes(this.info.party.earthWar.s.monsterhunt.id) // Another member is doing this member's monster hunt
                && Date.now() - this.start_time > 120000) {
                this.start_time = Date.now()
                stop_character("earthWar")
                start_character("earthMag")
                await sleep(2500)
            }

            // Switch servers if everyone in the party wants to
            if (Date.now() - this.start_time > 60000) {
                let shouldSwitchServer = 0;
                for (let id of parent.party_list) {
                    let member = this.info.party[id]
                    if (member.shouldSwitchServer) { shouldSwitchServer += 1; }
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

                    setTimeout(() => { this.mainLoop(); }, 10000);
                    return
                }
            }

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    huntersmarkLoop(): void {
        try {
            let targets = this.getTargets(1);
            if (targets.length // We have a target
                && !targets[0].s.marked // The target isn't marked
                && targets[0].hp > calculateDamageRange(parent.character, targets[0])[0] * 5 // The target has a lot of HP
                && wantToAttack(this, targets[0], "huntersmark")) // We want to attack it
                use_skill("huntersmark", targets[0])
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.huntersmarkLoop() }, getCooldownMS("huntersmark"));
    }

    fourFingersLoop(): void {
        try {
            let targets = this.getTargets(1);
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
        setTimeout(() => { this.fourFingersLoop() }, getCooldownMS("4fingers"));
    }

    async superShotLoop(): Promise<void> {
        let targets = this.getTargets(1);
        if (targets.length
            && wantToAttack(this, targets[0], "supershot")) {
            await use_skill("supershot", targets[0])
        }

        setTimeout(() => { this.superShotLoop() }, getCooldownMS("supershot"));
    }

    protected async attackLoop(): Promise<void> {
        let targets = this.getTargets(5);
        if (targets.length >= 5
            && wantToAttack(this, targets[0], "5shot")) {
            // See if we can fiveshot some enemies
            let fiveshotTargets: IEntity[] = [];
            for (let entity of targets) {
                if (!entity.target && (entity.hp > calculateDamageRange(parent.character, entity)[0] * 0.5)) continue; // Too much HP, or not targeting us
                if (distance(parent.character, entity) > parent.character.range) continue;

                fiveshotTargets.push(entity);
                if (fiveshotTargets.length == 5) break;
            }
            if (fiveshotTargets.length == 5) {
                await use_skill("5shot", fiveshotTargets)
                setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"));
                return;
            }
        }
        if (targets.length >= 3
            && wantToAttack(this, targets[0], "3shot")) {
            // See if we can three shot some enemies.
            let threeshotTargets: IEntity[] = [];
            for (let entity of targets) {
                if (!entity.target && (entity.hp > calculateDamageRange(parent.character, entity)[0] * 0.7)) continue; // Too much HP to kill in one shot (don't aggro too many)
                if (distance(parent.character, entity) > parent.character.range) continue;

                threeshotTargets.push(entity)
                if (threeshotTargets.length == 3) break
            }
            if (threeshotTargets.length == 3) {
                await use_skill("3shot", threeshotTargets)
                setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"));
                return;
            }
        }

        let piercingShotCalcCharacter = { ...parent.character }
        piercingShotCalcCharacter.apiercing += G.skills["piercingshot"].apiercing
        piercingShotCalcCharacter.attack *= G.skills["piercingshot"].damage_multiplier
        if (targets.length
            && wantToAttack(this, targets[0], "piercingshot")
            && calculateDamageRange(piercingShotCalcCharacter, targets[0])[0] > calculateDamageRange(parent.character, targets[0])[0]) {
            await use_skill("piercingshot", targets[0])
            setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
            return
        }

        // Can't do a special attack, so let's do a normal one
        super.attackLoop()
    }

    createParty(members: string[]): void {
        if (parent.party_list.length >= 4) return; // We already have the maximum amount of party members
        for (let member of members) {
            if (!parent.party[member])
                send_party_invite(member);
        }
    }
}

let ranger = new Ranger();
export { ranger }