import { Character } from './character'
import { MonsterType, IEntity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';
import { TargetPriorityList } from './definitions/bots';
import { isPlayer, getCooldownMS, isAvailable } from './functions';

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
            "holdAttack": true,
            "stopOnSight": true
        },
        "boar": {
            // Don't attack if we're walking by them, they hurt.
            "priority": DIFFICULT,
            "holdAttack": true,
            "stopOnSight": true,
        },
        "cgoo": {
            // Our plan is to go to a spot where we're far enough away from them, and then start attacking
            "holdAttack": true,
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
            "holdAttack": true,
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
        "hen": {
            "priority": EASY
        },
        "iceroamer": {
            "holdAttack": true,
            "priority": DIFFICULT,
            "stopOnSight": true,
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
        "oneeye": {
            // Camp out at a spot that's 99% safe.
            "holdAttack": true,
            "holdPosition": true,
            "priority": DIFFICULT,
            "map": "level2w",
            "x": -120,
            "y": -100
        },
        "osnake": {
            "priority": EASY
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
            "holdAttack": true,
            "holdPosition": true,
            "priority": DIFFICULT,
            "map": "level1",
            "x": -296,
            "y": 557,
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
            "holdAttack": true,
            "stopOnSight": true,
            "priority": DIFFICULT
        },
        "tortoise": {
            "priority": EASY
        },
        "wolfie": {
            // The ranger is fast enough to kill these without dying too much.
            "priority": DIFFICULT,
            "holdAttack": true,
            "stopOnSight": true
        },
        "xscorpion": {
            "priority": DIFFICULT,
            "holdAttack": true,
            "holdPosition": true,
            "map": "halloween",
            "x": -230,
            "y": 570
        }
    }
    mainTarget: MonsterType = "rat";
    start_time = Date.now();

    run(): void {
        super.run();
        this.superShotLoop();
        this.huntersmarkLoop();
        // this.fourFingersLoop();
    }

    mainLoop(): void {
        try {
            transferItemsToMerchant("earthMer", ["tracker", "mpot1", "hpot1", "orbg", "jacko"]);
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();

            this.createParty(["earthMag", "earthWar", "earthMer", "earthPri"]);

            // NOTE: Temporary for monster hunt coin farming
            if (Date.now() - this.start_time > 60000) {
                let should_switch_server = true;
                for (let id in this.info.party) {
                    let member = this.info.party[id]
                    if (member.canMonsterHunt) { should_switch_server = false; break; }
                }
                if (should_switch_server) {
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
            if (parent.character.mp < 240 // No MP
                || !isAvailable("huntersmark") // Not usable yet
                || targets.length == 0 // No targets
                || parent.character.stoned // Can't use skills
                || targets[0].s.marked // Already marked
                || targets[0].hp < parent.character.attack * 5 // Target is "easily" killable
                || distance(parent.character, targets[0]) > parent.character.range) { // Not in range
                // Do nothing
            } else {
                use_skill("huntersmark", targets[0])
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.huntersmarkLoop() }, Math.max(parent.character.ping, getCooldownMS("huntersmark")));
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
                && (
                    parent.character.hp < targets[0].attack * 10 // We don't have much HP
                )
            ) {
                use_skill("4fingers", targets[0])
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.fourFingersLoop() }, Math.max(parent.character.ping, getCooldownMS("4fingers")));
    }

    superShotLoop(): void {
        let targets = this.getTargets(1);
        if (parent.character.mp < 400 // No MP
            || targets.length < 1 // No targets NOTE: Based on getTargets(2).
            || parent.character.stoned // Can't use skills
            || distance(parent.character, targets[0]) > parent.character.range * 3 // Out of range
            || !isAvailable("supershot") // Not usable yet
            || (this.holdAttack && targets[1].target != parent.character.name) // Holding attack (global)
            || (smart.moving && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name)) { // Holding attack (monster)
            // Do nothing
        } else {
            use_skill("supershot", targets[0])
        }

        setTimeout(() => { this.superShotLoop() }, Math.max(parent.character.ping, getCooldownMS("supershot")));
    }

    attackLoop() {
        let targets = this.getTargets(5);
        if (targets.length >= 5
            && parent.character.mp >= 420
            && !parent.character.stoned
            && isAvailable("attack")
            && !(smart.moving && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name)) {
            // See if we can fiveshot some enemies
            let fiveshotTargets: IEntity[] = [];
            for (let entity of targets) {
                if ((entity.target != parent.character.name) && (entity.hp > parent.character.attack * 0.5 * 0.9 * damage_multiplier(entity.armor - parent.character.apiercing))) continue; // Too much HP, or not targeting us
                if (distance(parent.character, entity) > parent.character.range) continue;

                fiveshotTargets.push(entity);
                if (fiveshotTargets.length == 5) break;
            }
            if (fiveshotTargets.length == 5) {
                parent.socket.emit("skill", {
                    name: "5shot",
                    ids: [fiveshotTargets[0].id, fiveshotTargets[1].id, fiveshotTargets[2].id, fiveshotTargets[3].id, fiveshotTargets[4].id]
                });
                setTimeout(() => { this.attackLoop() }, Math.max(parent.character.ping, getCooldownMS("attack")));
                return;
            }
        }
        if (targets.length >= 3
            && parent.character.mp >= 300
            && !parent.character.stoned
            && isAvailable("attack")
            && !(smart.moving && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name)) {
            // See if we can three shot some enemies.
            let threeshotTargets: IEntity[] = [];
            for (let entity of targets) {
                if ((entity.target != parent.character.name) && (entity.hp > parent.character.attack * 0.7 * 0.9 * damage_multiplier(entity.armor - parent.character.apiercing))) continue; // Too much HP, or not targeting us
                if (distance(parent.character, entity) > parent.character.range) continue;

                threeshotTargets.push(entity);
                if (threeshotTargets.length == 3) break;
            }
            if (threeshotTargets.length == 3) {
                parent.socket.emit("skill", {
                    name: "3shot",
                    ids: [threeshotTargets[0].id, threeshotTargets[1].id, threeshotTargets[2].id]
                });
                setTimeout(() => { this.attackLoop() }, Math.max(parent.character.ping, getCooldownMS("attack")));
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