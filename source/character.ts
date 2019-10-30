import { Queue } from "prioqueue"
import { MonsterName, Entity, ALPosition, ItemName } from './definitions/adventureland';
import { Pathfinder } from './pathfinder';
import { sendMassCM } from "./functions";

export abstract class Character {
    /**
     * A list of monsters, ranked from highest priority to lowest priority.
     */
    protected abstract targetPriority: MonsterName[];
    protected abstract mainTarget: MonsterName;
    protected movementQueue: ALPosition[] = [];
    public holdMovement = false;
    public holdAttack = false;
    protected pathfinder: Pathfinder = new Pathfinder(7);
    protected monsterhuntQuests: any = {};
    protected chests = new Set<string>()

    protected mainLoop() {
        // loot();
        setTimeout(() => { this.mainLoop(); }, 250);
    };

    public run() {
        this.healLoop();
        this.attackLoop();
        this.moveLoop();
        this.mainLoop();
    }

    protected sendLootLoop() {
        let chests = [];
        let i = 0;
        for (let chestID in parent.chests) {
            chests.push(chestID);
            if (++i > 50) break;
        }
        if (i > 0) {
            send_local_cm("earthMer", {
                "message": "loot",
                "chests": chests
            })
        }
        setTimeout(() => { this.sendLootLoop() }, 1000);
    }

    protected lootLoop() {
        // Don't loot in the bank
        if (parent.character.map == "bank") {
            setTimeout(() => { this.lootLoop() }, 1000);
            return;
        }
        let i = 0;
        for (let chestID of this.chests) {
            parent.socket.emit("open_chest", { id: chestID });
            this.chests.delete(chestID)
            if (++i > 20) break;
        }
        setTimeout(() => { this.lootLoop() }, 1000);
    }

    protected attackLoop(): void {
        try {
            let targets = this.getTargets(1);
            if (this.holdAttack && targets.length > 0 && targets[0].target != parent.character.name) {
                // Don't attack
                setTimeout(() => { this.attackLoop() }, 250);
                return;
            }
            if (targets.length == 0 || distance(targets[0], parent.character) > parent.character.range || parent.character.mp < parent.character.mp_cost) {
                // No target
                setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
                return;
            }
            attack(targets[0]).then(() => {
                // Attack success!
                this.getTargets(1);
                setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
            }, () => {
                // Attack fail...
                setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
            });
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
        }
    }

    protected moveLoop(): void {
        try {
            if (!this.movementQueue || this.movementQueue.length == 0) {
                // No movements in the queue, do nothing.
                setTimeout(() => { this.moveLoop() }, 250); // TODO: move this 250 cooldown to a setting.
                return;
            } else if (parent.character.moving) {
                // We're already moving, don't move somewhere new.
                setTimeout(() => { this.moveLoop() }, 250) // TODO: Instead of 250, base it on how long it will take to walk to where we are going. (x && y && going_x && going_y && speed)
                return;
            }

            let nextMovement = this.movementQueue[0];
            if (nextMovement.map == parent.character.map && can_move_to(nextMovement.x, nextMovement.y)) {
                // We can move to the next place in the queue, so let's start moving there.
                move(nextMovement.x, nextMovement.y)

            } else {
                // We can't move to the next place in the queue...
                // TODO: Pathfind to the next place in the queue
            }
            setTimeout(() => { this.moveLoop() }, 250); // TODO: queue up next movement based on time it will take to walk there
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.moveLoop() }, 250); // TODO: queue up next movement based on time it will take to walk there
        }

    }

    protected healLoop(): void {
        try {
            if (parent.character.rip) {
                // Respawn if we're dead
                respawn();
                setTimeout(() => { this.healLoop() }, 250) // TODO: Find out something that tells us how long we have to wait before respawning.
                return;
            }

            let hpPots: ItemName[] = ["hpot0", "hpot1"]
            let mpPots: ItemName[] = ["mpot0", "mpot1"]
            let useMpPot: ItemName = null;
            let useHpPot: ItemName = null;

            // TODO: find last potion in inventory
            for (let i = parent.character.items.length - 1; i >= 0; i--) {
                let item = parent.character.items[i];
                if (!item) continue;

                if (!useHpPot && hpPots.includes(item.name)) {
                    // This is the HP Pot that will be used
                    useHpPot = item.name
                } else if (!useMpPot && mpPots.includes(item.name)) {
                    // This is the MP Pot that will be used
                    useMpPot = item.name
                }

                if (useHpPot && useMpPot) {
                    // We've found the last two pots we're using
                    break;
                }
            }

            let hp_ratio = parent.character.hp / parent.character.max_hp
            let mp_ratio = parent.character.mp / parent.character.max_mp
            if (useHpPot == "hpot0" && hp_ratio <= mp_ratio && (parent.character.max_hp - parent.character.hp >= 200 || parent.character.hp < 50)) {
                use_skill("use_hp")
            } else if (useHpPot == "hpot1" && hp_ratio <= mp_ratio && (parent.character.max_hp - parent.character.hp >= 400 || parent.character.hp < 50)) {
                use_skill("use_hp")
            } else if (useMpPot == "mpot0" && mp_ratio < hp_ratio && (parent.character.max_mp - parent.character.mp >= 300 || parent.character.mp < 50)) {
                use_skill("use_mp")
            } else if (useMpPot == "mpot1" && mp_ratio < hp_ratio && (parent.character.max_mp - parent.character.mp >= 500 || parent.character.mp < 50)) {
                use_skill("use_mp")
            } else if (useHpPot == null && hp_ratio != 1 && hp_ratio <= mp_ratio) {
                // Even if we don't have a potion, use_hp will heal for 50 hp.
                use_skill("use_hp")
            } else if (useMpPot == null && mp_ratio != 1 && mp_ratio < hp_ratio) {
                // Even if we don't have a potion, use_mp will heal for 100 mp.
                use_skill("use_mp")
            }

            setTimeout(() => { this.healLoop() }, Math.max(250, parent.next_skill["use_hp"] - Date.now()))
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.healLoop() }, Math.max(250, parent.next_skill["use_hp"] - Date.now()))
        }
    }

    protected avoidAggroMonsters(buffer = 50): void {
        let closestEntity: Entity = null;
        let closestDistance = 999999;
        for (let id in parent.entities) {
            let potentialTarget = parent.entities[id];
            if (potentialTarget.type != "monster") continue; // Not a monster
            if (potentialTarget.aggro == 0) continue; // Not an aggressive monster
            if (potentialTarget.target && potentialTarget.target != parent.character.name) continue; // Targeting someone else
            let d = distance(character, potentialTarget);
            if (d < closestDistance) {
                closestEntity = potentialTarget;
                closestDistance = d;
            }
        }

        if (closestDistance > buffer) return; // No close monsters

        let escapePosition: ALPosition;
        let angle = Math.atan2(parent.character.real_y - closestEntity.real_y, parent.character.real_x - closestEntity.real_x);
        let move_distance = buffer - closestDistance
        let x = Math.cos(angle) * move_distance
        let y = Math.sin(angle) * move_distance
        escapePosition = { x: parent.character.real_x + x, y: parent.character.real_y + y };

        if (can_move_to(escapePosition.x, escapePosition.y)) {
            move(escapePosition.x, escapePosition.y)
        } else {
            // TODO: Pathfind there, and take the first movement.
        }
    }

    protected avoidAttackingMonsters(): void {
        // Find all monsters attacking us
        let attackingMonsters: Entity[] = [];
        for (let id in parent.entities) {
            let potentialTarget = parent.entities[id];
            if (potentialTarget.target != parent.character.name) continue; // Not targeting us

            attackingMonsters.push(potentialTarget);
        }
        let currentTarget = get_targeted_monster();
        if (currentTarget) {
            attackingMonsters.push(currentTarget);
        }

        if (!attackingMonsters) return; // There aren't any monsters attacking us

        // Find the closest monster of those attacking us
        let minDistance = 0;
        let escapePosition: ALPosition;
        let minTarget: Entity = null;
        for (let target of attackingMonsters) {
            let d = distance(character, target);
            if (d > (target.range + target.speed)) continue; // We're still far enough away to not get attacked
            if (target.hp < parent.character.attack * 0.7 * 0.9 * damage_multiplier(target.armor - parent.character.apiercing)) continue // We can kill it in one shot, don't move.
            if (d < minDistance) continue; // There's another target that's closer
            minDistance = d;
            minTarget = target;
        }

        if (!minTarget) return; // We're far enough away not to get attacked

        // Move away from the closest monster
        let angle: number = Math.atan2(parent.character.real_y - minTarget.real_y, parent.character.real_x - minTarget.real_x);
        let moveDistance: number = minTarget.range + minTarget.speed - (minDistance / 2)
            function calculateEscape(angle: number, move_distance: number): ALPosition {
                let x = Math.cos(angle) * move_distance
                let y = Math.sin(angle) * move_distance
            return { x: parent.character.real_x + x, y: parent.character.real_y + y };
            }
        escapePosition = calculateEscape(angle, moveDistance);
        let angleChange: number = 0;
        while (!can_move_to(escapePosition.x, escapePosition.y) && angleChange < 180) {
            if (angleChange <= 0) {
                angleChange = (-angleChange) + 1;
            } else {
                angleChange = -angleChange;
            }
            escapePosition = calculateEscape(angle + (angleChange * Math.PI / 180), moveDistance)
            //game_log("angle: " + (angle + (angleChange * Math.PI / 180)) + "x: " + escapePosition.x + ", y: " + escapePosition.y)
        }

        if (can_move_to(escapePosition.x, escapePosition.y)) {
            move(escapePosition.x, escapePosition.y)
        } else {
            // TODO: Pathfind there, and take the first movement.
        }
    }

    public moveToMonsters(): void {
        let targets = this.getTargets(1);
        if (targets && distance(parent.character, targets[0]) < parent.character.range)
            return; // We have a target, and it's in range.

        if (can_move_to(targets[0].real_x, targets[0].real_y)) {
            // Move normally to target
            move(targets[0].real_x, targets[0].real_y);
        } else {
            try {
                // Pathfind to target
                game_log("pathfinding to target")
                let path = this.pathfinder.findNextMovement(parent.character, targets[0]);
                move(path.x, path.y);
            } catch (error) {
                // Our custom pathfinding failed, use the game's smart move.
                game_log("smart moving to target")
                xmove(targets[0].real_x, targets[0].real_y);
            }
        }
    }

    public moveToMonsterhunt() {
        let monsterhunter: ALPosition = { map: "main", x: 126, y: -413 }

        // Update monster hunt info
        if (parent.character.s && parent.character.s.monsterhunt) {
            if (parent.character.s.monsterhunt.c == 0 && this.monsterhuntQuests[parent.character.name] && this.monsterhuntQuests[parent.character.name].target) {
                sendMassCM(parent.party_list, {
                    "message": "quest",
                    "target": undefined
                })
            } else if (!this.monsterhuntQuests[parent.character.name] || (this.monsterhuntQuests[parent.character.name] && this.monsterhuntQuests[parent.character.name].target !== parent.character.s.monsterhunt.id)) {
                sendMassCM(parent.party_list, {
                    "message": "quest",
                    "target": parent.character.s.monsterhunt.id
                });
            }
        } else if (this.monsterhuntQuests[parent.character.name] && this.monsterhuntQuests[parent.character.name].target) {
            sendMassCM(parent.party_list, {
                "message": "quest",
                "target": undefined
            })
        }

        // Turn in
        if (parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0) {
            if (distance(parent.character, monsterhunter) < 250) {
                parent.socket.emit('monsterhunt')
            } else if (!smart.moving) {
                this.pathfinder.saferMove(this, "monsterhunter")
            }
            return
        }

        // Get a new quest
        if (!parent.character.s || !parent.character.s.monsterhunt) {
            if (distance(parent.character, monsterhunter) < 250) {
                parent.socket.emit('monsterhunt')
            } else if (!smart.moving) {
                // Go to monster hunter to get a new quest
                smart_move(monsterhunter)
            }
            return
        }

        // Move to target
        let monsterHuntTarget = this.getMonsterhuntTarget()
        if (monsterHuntTarget) {
            let targets = this.getTargets(1)
            if (targets.length == 0 || targets[0].mtype != monsterHuntTarget) {
                if (this.targetPriority.includes(monsterHuntTarget)) {
                    // It's in our list of monsters, go go go!
                    set_message("MH: " + monsterHuntTarget)
                    this.pathfinder.saferMove(this, monsterHuntTarget)
                } else if (targets.length != 0 && targets[0].mtype != this.mainTarget) {
                    // Not in our target priority, so it's probably too dangerous. Go to our default target
                    set_message("MH Idle: " + this.mainTarget)
                    this.pathfinder.saferMove(this, this.mainTarget)
                }
            }
            return
        }
    }

    public parse_cm(characterName: string, data: any) {
        if (!parent.party_list.includes(characterName)) {
            // Ignore messages from players not in our party
            game_log("denied request from " + characterName + ": " + JSON.stringify(data));
            return;
        }

        if (data.message == "quest") {
            this.monsterhuntQuests[characterName] = {
                "target": data.target
            }
        } else if (data.message = "loot") {
            data.chests.forEach((chest: string) => {
                this.chests.add(chest)
            });
        } else {
            game_log("unknown request: " + JSON.stringify(data));
        }
    }

    public getMonsterhuntTarget(): MonsterName {
        // Prevent returning a target if we don't have an active monster hunt target ourselves.
        if (!character.s || !character.s.monsterhunt || (parent.character.s && parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0)) return null;

        // Party monster hunts
        let highestPriorityTarget = -1;
        for (let questInfo in this.monsterhuntQuests) {
            let target = this.monsterhuntQuests[questInfo].target;
            let priorty = this.targetPriority.indexOf(target);
            if (priorty > highestPriorityTarget) highestPriorityTarget = priorty;
        }
        if (highestPriorityTarget != -1) return this.targetPriority[highestPriorityTarget];

        // Our monster hunt
        if (parent.character.s && parent.character.s.monsterhunt)
            return parent.character.s.monsterhunt.id;

        return null;
    }

    public getTargets(numTargets: number = 1): Entity[] {
        let targets: Entity[] = [];

        // Find out what targets are already claimed by our party members
        let members = parent.party_list;
        let claimedTargets: string[] = []
        for (let id in parent.entities) {
            if (members.includes(id)) {
                let target = parent.entities[id].target;
                if (target) claimedTargets.push(target)
            }
        }

        let potentialTargets = new Queue<Entity>((x, y) => x.priority - y.priority);
        for (let id in parent.entities) {
            let potentialTarget = parent.entities[id];
            let d = distance(character, potentialTarget);
            if (!this.targetPriority.includes(potentialTarget.mtype) && potentialTarget.target != parent.character.name) continue; // Not a monster we care about, and it's not attacking us
            if (potentialTarget.type != "monster") // Not a monster
                if (!is_pvp() && potentialTarget.type == "character") continue; // Not PVP

            // Set a priority based on the index of the entity 
            let priority = this.targetPriority.indexOf(potentialTarget.mtype);

            // Adjust priority if a party member is already attacking it.
            if (claimedTargets.includes(id)) priority -= 250;

            // Adjust priority if it's special
            if (["goldenbat", "snowman"].includes(potentialTarget.mtype)) priority += 5000;

            // Increase priority if it's our "main target"
            if (potentialTarget.mtype == this.mainTarget) priority += 10;

            // Increase priority if it's a quest monster
            if (potentialTarget.mtype == this.getMonsterhuntTarget()) priority += 1000;

            // Increase priority if the entity is targeting us
            if (potentialTarget.target == parent.character.name) priority += 1000;

            // Adjust priority based on distance
            priority -= d;

            // Adjust priority based on remaining HP
            // priority -= potentialTarget.hp

            potentialTargets.enqueue(priority, potentialTarget);
        }

        if (potentialTargets.size == 0) {
            // No potential targets
            return targets;
        }

        while (targets.length < numTargets && potentialTargets.size > 0) {
            targets.push(potentialTargets.dequeue().value)
        }
        // if (this.movementTarget == newTarget.mtype) {
        //     // We've reached the monster we want to reach, so let's stop moving.
        //     this.movementTarget = null;
        //     this.movementQueue = [];
        // }
        if (targets.length > 0)
            change_target(targets[0])
        return targets;
    }
}