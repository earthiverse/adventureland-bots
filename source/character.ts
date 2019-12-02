import { Queue } from "prioqueue"
import { MonsterName, Entity, ALPosition, ItemName, ItemInfo, Slot } from './definitions/adventureland';
import { Pathfinder } from './pathfinder';
import { sendMassCM, findItems, getInventory } from "./functions";
import { TargetPriorityList } from "./definitions/bots";

export abstract class Character {
    /**
     * A list of monsters, ranked from highest priority to lowest priority.
     */
    // protected abstract targetPriority: MonsterName[];
    public abstract newTargetPriority: TargetPriorityList;
    protected abstract mainTarget: MonsterName;
    public movementQueue: ALPosition[] = [];
    public holdPosition = false;
    public holdAttack = false;
    protected pathfinder: Pathfinder = new Pathfinder(6);
    protected partyInfo: any = {};
    protected chests = new Set<string>()

    protected mainLoop() {
        // Equip better items if we have one in our inventory
        if (character.ctype !== "merchant") {
            this.equipBetterItems();
            this.getMonsterhuntQuest();
        }

        setTimeout(() => { this.mainLoop(); }, Math.max(250, parent.character.ping));
    };

    public run() {
        this.healLoop();
        this.attackLoop();
        this.scareLoop();
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
            if (targets.length == 0 // No targets
                || parent.character.stoned // Can't attack
                || parent.character.mp < parent.character.mp_cost // No MP
                || parent.next_skill["attack"] > Date.now() // On cooldown
                || parent.distance(parent.character, targets[0]) > parent.character.range
                || (smart.moving && this.newTargetPriority[targets[0].mtype] && this.newTargetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name) // Holding attack and not being attacked
                || (this.holdAttack && targets[0].target != parent.character.name)) { // Holding attack and not being attacked
                setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
                return;
            }

            attack(targets[0]).then(() => {
                // Attack success!
                this.getTargets(1); // Get a new target right away
                setTimeout(() => { this.attackLoop() }, Math.max(parent.character.ping, parent.next_skill["attack"] - Date.now()));
            }, () => {
                // Attack fail...
                setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
            });
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
        }
    }

    protected scareLoop(): void {
        try {
            // TODO: add a function to see if we are scared ourselves (>=3 monsters targeting us)
            let targets = this.getTargets(1);
            if (Date.now() > parent.next_skill["scare"] // Scare is not on cooldown
                && targets.length > 0 // There's a target
                && targets[0].target == parent.character.name // It's targeting us
                && distance(targets[0], parent.character) <= targets[0].range // We're in range of its attacks
                && (!this.newTargetPriority[targets[0].mtype] // Either 1) there's something attacking us that isn't in our priority list
                    || (character.hp < targets[0].attack * targets[0].frequency * 5)) // or 2) We're about to die
                && parent.character.mp >= 50) { // We have enough MP
                let items = findItems("jacko")
                if (parent.character.slots.orb && parent.character.slots.orb.name == "jacko") {
                    // We have a jacko equipped
                    use_skill("scare")
                } else if (items.length > 0) {
                    // We have a jacko in our inventory
                    // TODO: Sometimes the orb doesn't get re-equipped...
                    let jackoI = items[0][0]
                    equip(jackoI) // Equip the jacko
                    use_skill("scare") // Scare the monsters away
                    equip(jackoI) // Swap back to whatever we had before
                }
            } else {
                // TODO: We can't / don't want to use scare, so equip our orb
            }
        } catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.scareLoop() }, Math.max(parent.character.ping, parent.next_skill["scare"] - Date.now()));
    }

    protected moveLoop(): void {
        try {
            if (this.holdPosition || smart.moving) {
                let targets = this.getTargets(1);
                if (targets.length > 0 /* We have a target in range */
                    && this.newTargetPriority[targets[0].mtype] && this.newTargetPriority[targets[0].mtype].stopOnSight /* We stop on sight of that target */
                    && this.pathfinder.movementTarget == targets[0].mtype /* We're moving to that target */
                    && parent.distance(parent.character, targets[0]) < parent.character.range /* We're in range of that target */) {
                    stop();
                    this.pathfinder.movementTarget = null;
                    this.movementQueue = []; // clear movement queue
                }

                if (character.ctype !== "merchant"
                    && this.getMonsterhuntTarget()
                    && this.getMonsterhuntTarget() != this.pathfinder.movementTarget) { // We're moving to the wrong target
                    stop();
                    this.pathfinder.movementTarget = null;
                    this.movementQueue = []; // clear movement queue
                }

                // Don't move, we're holding position or smart moving somewhere
                setTimeout(() => { this.moveLoop() }, 250); // TODO: move this 250 cooldown to a setting.
                return;
            } else if (this.movementQueue.length == 0) { // No movements queued
                // Reset movement target
                this.pathfinder.movementTarget = null;

                if (character.ctype !== "merchant")
                    this.moveToMonsterhunt();

                // Default movements
                if (character.ctype == "ranger" || character.ctype == "mage") {
                    this.avoidAggroMonsters();
                }

                this.avoidAttackingMonsters();

                if (character.ctype == "ranger" || character.ctype == "mage" || character.ctype == "warrior") {
                    this.moveToMonster();
                }
            } else {
                // Pathfinding movements
                // TODO: we need to pop our movement somewhere
                let currentMovement = this.movementQueue[0];
                let nextMovement = this.movementQueue[0]
                if (this.movementQueue.length > 1) {
                    nextMovement = this.movementQueue[1];
                }
                if (can_move_to(nextMovement.x, nextMovement.y)) {
                    // We can move to the next place in the queue, so let's start moving there.
                    move(nextMovement.x, nextMovement.y)
                    this.movementQueue.shift();
                } else if (!parent.character.moving && can_move_to(currentMovement.x, currentMovement.y)) {
                    move(currentMovement.x, currentMovement.y)
                } else {
                    // We can't move to the next place in the queue...
                    // TODO: Pathfind to the next place in the queue
                }
            }

            setTimeout(() => { this.moveLoop() }, Math.max(250, parent.character.ping)); // TODO: queue up next movement based on time it will take to walk there
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.moveLoop() }, 250);
        }
    }

    protected healLoop(): void {
        try {
            if (parent.character.rip) {
                // Respawn if we're dead
                respawn();
                setTimeout(() => { this.healLoop() }, Math.max(250, parent.character.ping)) // TODO: Find out something that tells us how long we have to wait before respawning.
                return;
            } else if (parent.next_skill["use_hp"] > Date.now()) {
                setTimeout(() => { this.healLoop() }, parent.next_skill["use_hp"] - Date.now())
                return;
            }

            let hpPots: ItemName[] = ["hpot0", "hpot1"]
            let mpPots: ItemName[] = ["mpot0", "mpot1"]
            let useMpPot: ItemInfo = null
            let useHpPot: ItemInfo = null

            // TODO: find last potion in inventory
            for (let i = parent.character.items.length - 1; i >= 0; i--) {
                let item = parent.character.items[i];
                if (!item) continue;

                if (!useHpPot && hpPots.includes(item.name)) {
                    // This is the HP Pot that will be used
                    useHpPot = item
                } else if (!useMpPot && mpPots.includes(item.name)) {
                    // This is the MP Pot that will be used
                    useMpPot = item
                }

                if (useHpPot && useMpPot) {
                    // We've found the last two pots we're using
                    break
                }
            }

            let hp_ratio = parent.character.hp / parent.character.max_hp
            let mp_ratio = parent.character.mp / parent.character.max_mp
            if (hp_ratio <= mp_ratio
                && hp_ratio != 1
                && (!useHpPot
                    || (useHpPot.name == "hpot0" && (parent.character.hp <= parent.character.max_hp - 200 || parent.character.hp < 50))
                    || (useHpPot.name == "hpot1" && (parent.character.hp <= parent.character.max_hp - 400 || parent.character.hp < 50)))) {
                use_skill("use_hp")
            } else if (mp_ratio != 1
                && (!useMpPot
                    || (useMpPot.name == "mpot0" && (parent.character.mp <= parent.character.max_mp - 300 || parent.character.mp < 50))
                    || (useMpPot.name == "mpot1" && (parent.character.mp <= parent.character.max_mp - 500 || parent.character.mp < 50)))) {
                use_skill("use_mp")
            }

            // Send a message to everyone with how many potions we have left.
            // NOTE: TODO: A character could have two stacks of potions, one being 9999 and the other being 10, this only sends the quantity information about the stack that is being used for healing
            // NOTE: TODO: This assumes we are using hpot1 and mpot1 potions.
            if (useMpPot) {
                sendMassCM(parent.party_list, {
                    "message": useMpPot.name,
                    "quantity": useMpPot.q
                })
            } else {
                sendMassCM(parent.party_list, {
                    "message": "mpot1",
                    "quantity": 0
                })
            }
            if (useHpPot) {
                sendMassCM(parent.party_list, {
                    "message": useHpPot.name,
                    "quantity": useHpPot.q
                })
            } else {
                sendMassCM(parent.party_list, {
                    "message": "hpot1",
                    "quantity": 0
                })
            }

            setTimeout(() => { this.healLoop() }, Math.max(250, parent.character.ping, parent.next_skill["use_hp"] - Date.now()))
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.healLoop() }, Math.max(250, parent.next_skill["use_hp"] - Date.now()))
        }
    }

    protected avoidAggroMonsters(): void {
        let closeEntity: Entity = null;
        let moveDistance = 0;
        for (let id in parent.entities) {
            let entity = parent.entities[id];
            if (entity.type != "monster") continue; // Not a monster
            if (entity.aggro == 0) continue; // Not an aggressive monster
            if (entity.target && entity.target != parent.character.name) continue; // Targeting someone else
            let d = Math.max(60, entity.speed * 1.5) - parent.distance(parent.character, entity);
            if (d < 0) continue; // Far away

            if (d > moveDistance) {
                closeEntity = entity;
                moveDistance = d;
            }
        }

        if (!closeEntity) return; // No close monsters

        let escapePosition: ALPosition;
        let angle = Math.atan2(parent.character.real_y - closeEntity.real_y, parent.character.real_x - closeEntity.real_x);
        let x = Math.cos(angle) * moveDistance
        let y = Math.sin(angle) * moveDistance
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
            let d = distance(parent.character, target);
            if (target.speed > character.speed) continue; // We can't outrun it, don't try
            if (d > (target.range + (target.speed + character.speed) * Math.max(parent.character.ping * 0.001, 0.5))) continue; // We're still far enough away to not get attacked
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
            // game_log("angle: " + (angle + (angleChange * Math.PI / 180)) + "x: " + escapePosition.x + ", y: " + escapePosition.y)
        }

        if (can_move_to(escapePosition.x, escapePosition.y)) {
            // game_log("escaping from monster");
            move(escapePosition.x, escapePosition.y)
        } else {
            // TODO: Pathfind there, and take the first movement.
        }
    }

    public moveToMonster(): void {
        let targets = this.getTargets(1);
        if (targets.length == 0 // There aren't any targets to move to
            || (this.newTargetPriority[targets[0].mtype] && this.newTargetPriority[targets[0].mtype].holdPosition) // We don't want to move to these monsters
            || distance(parent.character, targets[0]) <= parent.character.range) // We have a target, and it's in range.
            return;

        if (can_move_to(targets[0].real_x, targets[0].real_y)) {
            let moveDistance = parent.distance(parent.character, targets[0]) - character.range + (targets[0].speed * 0.5)
            let angle: number = Math.atan2(targets[0].real_y - parent.character.real_y, targets[0].real_x - parent.character.real_x);
            let x = Math.cos(angle) * moveDistance
            let y = Math.sin(angle) * moveDistance

            // Move normally to target
            // game_log("moving normally to target")
            move(parent.character.real_x + x, parent.character.real_y + y);
        } else {
            try {
                // Pathfind to target
                // game_log("pathfinding to target")
                let path = this.pathfinder.findNextMovement(parent.character, targets[0]);
                // TODO: check if we have a path
                move(path.x, path.y);
            } catch (error) {
                // Our custom pathfinding failed, use the game's smart move.
                // game_log("smart moving to target")
                xmove(targets[0].real_x, targets[0].real_y);
            }
        }
    }

    public getMonsterhuntQuest() {
        let monsterhunter: ALPosition = { map: "main", x: 126, y: -413 }
        if (distance(parent.character, monsterhunter) > 250) return; // Too far away
        if (!parent.character.s.monsterhunt) {
            // No quest, get a new one
            parent.socket.emit('monsterhunt')
            sendMassCM(parent.party_list, {
                "message": "quest",
                "target": undefined
            })
            this.partyInfo[parent.character.name] = {
                "target": undefined
            }
        } else if (parent.character.s.monsterhunt.c == 0) {
            // We've finished a quest
            parent.socket.emit('monsterhunt')
            sendMassCM(parent.party_list, {
                "message": "quest",
                "target": undefined
            })
            this.partyInfo[parent.character.name] = {
                "target": undefined
            }
        } else {
            // We're on a quest
            sendMassCM(parent.party_list, {
                "message": "quest",
                "target": parent.character.s.monsterhunt.id
            })
            this.partyInfo[parent.character.name] = {
                "target": parent.character.s.monsterhunt.id
            }
        }
    }

    public moveToMonsterhunt() {
        let monsterhunter: ALPosition = { map: "main", x: 126, y: -413 }

        if (!parent.character.s.monsterhunt) {
            // Go to monster hunter to get a new quest
            set_message("New MH")
            this.pathfinder.saferMovePlace(this, "monsterhunter")
        } else if (parent.character.s.monsterhunt.c == 0) {
            // Go to monster hunter to finish our quest
            set_message("Finish MH")
            this.pathfinder.saferMovePlace(this, "monsterhunter")
        } else {
            // Go to target monster
            let monsterHuntTarget = this.getMonsterhuntTarget()
            let targets = this.getTargets(1)
            if (monsterHuntTarget) {
                if (targets.length == 0 || targets[0].mtype != monsterHuntTarget) {
                    if (this.newTargetPriority[monsterHuntTarget]) {
                        // if (this.targetPriority.includes(monsterHuntTarget)) {
                        // It's in our list of monsters, go go go!
                        set_message("MH: " + monsterHuntTarget)
                        this.pathfinder.saferMoveMonster(this, monsterHuntTarget)
                    } else if (targets.length != 0 && targets[0].mtype != this.mainTarget) {
                        // Not in our target priority, so it's probably too dangerous. Go to our default target
                        set_message(this.mainTarget)
                        this.pathfinder.saferMoveMonster(this, this.mainTarget)
                    }
                }
            } else if (targets.length == 0 || (targets.length != 0 && targets[0].mtype != this.mainTarget)) {
                // Not in our target priority, so it's probably too dangerous. Go to our default target
                set_message(this.mainTarget)
                this.pathfinder.saferMoveMonster(this, this.mainTarget)
            }
        }

    }

    public parse_cm(characterName: string, data: any) {
        if (!parent.party_list.includes(characterName)) {
            // Ignore messages from players not in our party
            // game_log("denied request from " + characterName + ": " + JSON.stringify(data));
            return;
        }

        if (!this.partyInfo[characterName]) {
            // Start tracking info for this player
            this.partyInfo[characterName] = {}
        }

        if (data.message == "quest") {
            this.partyInfo[characterName].target = data.target
        } else if (["mpot0", "mpot1", "hpot0", "hpot1"].includes(data.message)) {
            this.partyInfo[characterName][data.message] = data.quantity
        } else if (data.message = "loot") {
            data.chests.forEach((chest: string) => {
                this.chests.add(chest)
            });
            // } else {
            //     game_log("unknown request: " + JSON.stringify(data));
        }
    }

    public getMonsterhuntTarget(): MonsterName {
        // Return monster hunter quest NPC if we don't have a target
        if (!character.s || !character.s.monsterhunt || (parent.character.s && parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0)) return null;

        // Party monster hunts
        let highestPriorityTarget = -1;
        let highestPriorityTargetName: MonsterName = null;
        for (let questInfo in this.partyInfo) {
            let target: MonsterName = this.partyInfo[questInfo].target;
            if (!this.newTargetPriority[target]) continue;
            let priorty = this.newTargetPriority[target].priority;
            if (priorty > highestPriorityTarget) {
                highestPriorityTarget = priorty;
                highestPriorityTargetName = target;
            }
        }
        if (highestPriorityTarget != -1) return highestPriorityTargetName;

        return null;
    }

    /**
     * Looks if we have items in our inventory that are the same as those equipped, only a higher level.
     */
    public equipBetterItems() {
        let items = getInventory();

        for (let slot in character.slots) {
            let slotItem: ItemInfo = character.slots[slot as Slot];
            if (!slotItem) continue; // Nothing equipped in that slot
            for (let [i, itemInfo] of items) {
                if (itemInfo.name !== slotItem.name) continue; // Not the same item
                if (itemInfo.level <= slotItem.level) continue; // Not better than the currently equipped item

                // It's better, equip it.
                equip(i, slot);

                // In the off chance that we have multiple items that are better than those equipped, keep looking
                slotItem = itemInfo;
            }
        }
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
            if (!this.newTargetPriority[potentialTarget.mtype] && potentialTarget.target != parent.character.name) continue; // Not a monster we care about, and it's not attacking us
            if (potentialTarget.type != "monster") // Not a monster
                if (!is_pvp() && potentialTarget.type == "character") continue; // Not PVP

            // Set a priority based on the index of the entity 
            let priority = 0;
            if (this.newTargetPriority[potentialTarget.mtype]) priority = this.newTargetPriority[potentialTarget.mtype].priority;

            // Adjust priority if a party member is already attacking it and it has low HP
            if (claimedTargets.includes(id) && potentialTarget.hp <= parent.character.attack) priority -= 250;

            // Increase priority if it's our "main target"
            if (potentialTarget.mtype == this.mainTarget) priority += 10;

            // Increase priority if it's a quest monster
            if (potentialTarget.mtype == this.getMonsterhuntTarget()) priority += 500;

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