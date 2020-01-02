import { Character } from './character'
import { MonsterType, IEntity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { isPlayer, getCooldownMS, isAvailable, wantToAttack, calculateDamageRange } from './functions';

let DIFFICULT = 10;
let MEDIUM = 20;
let EASY = 30;
let SPECIAL = 500;

class Ranger extends Character {
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
            "priority": DIFFICULT,
            "map": "arena",
            "x": 500,
            "y": -50
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
        "minimush": {
            "priority": EASY,
            "stopOnSight": true
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
            "map": "level1",
            "x": -300,
            "y": 536,
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
            "map": "halloween",
            "x": -230,
            "y": 570
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

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko", "luckbooster", "goldbooster", "xpbooster"]);
            transferGoldToMerchant("earthMer", 100000);
            sellUnwantedItems();

            this.createParty(["earthMag", "earthWar", "earthMer", "earthPri"]);

            // NOTE: Temporary for monster hunt coin farming
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

    superShotLoop(): void {
        let targets = this.getTargets(1);
        if (targets.length
            && wantToAttack(this, targets[0], "supershot"))
            use_skill("supershot", targets[0])

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
                parent.socket.emit("skill", {
                    name: "5shot",
                    ids: [fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id]
                });
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

                threeshotTargets.push(entity);
                if (threeshotTargets.length == 3) break;
            }
            if (threeshotTargets.length == 3) {
                parent.socket.emit("skill", {
                    name: "3shot",
                    ids: [threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id]
                });
                setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"));
                return;
            }
        }

        // Can't do a special attack, so let's do a normal one
        super.attackLoop();
    }

    createParty(members: string[]): void {
        for (let member of members) {
            if (!parent.party[member])
                send_party_invite(member);
        }
    }
}

let ranger = new Ranger();
export { ranger }