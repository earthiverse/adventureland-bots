import { Queue } from "prioqueue"
import { MonsterName, Entity, ALPosition, ItemName, ItemInfo, Slot, MapName, MapInfo, ICharacter } from './definitions/adventureland';
import { Pathfinder } from './pathfinder';
import { sendMassCM, findItems, getInventory, getMonsterSpawnPosition, getNearbyMonsterSpawns } from "./functions";
import { TargetPriorityList } from "./definitions/bots";
import { parseIsolatedEntityName } from "typescript";

export abstract class Character {
    /**
     * A list of monsters, ranked from highest priority to lowest priority.
     */
    // protected abstract targetPriority: MonsterName[];
    public abstract targetPriority: TargetPriorityList;
    protected abstract mainTarget: MonsterName;
    public movementQueue: ALPosition[] = [];
    public holdPosition = false;
    public holdAttack = false;
    protected pathfinder: Pathfinder = new Pathfinder(6);
    protected partyInfo: any = {};
    protected otherInfo: any = {
        "npcs": {},
        "players": {}
    };
    // protected chests = new Set<string>()

    protected mainLoop() {
        // Equip better items if we have one in our inventory
        if (character.ctype !== "merchant") {
            this.equipBetterItems();
            this.getMonsterhuntQuest();
        }

        this.getNewYearTreeBuff();

        this.loot();

        setTimeout(() => { this.mainLoop(); }, Math.max(250, parent.character.ping));
    };

    public run() {
        this.healLoop();
        this.attackLoop();
        this.scareLoop();
        this.moveLoop();
        this.sendInfoLoop();
        this.mainLoop();
    }

    /**
     * Sends a bunch of CMs to players in our party list telling them information like what quest we have, what items we have, etc.
     *
     * @protected
     * @memberof Character
     */
    protected sendInfoLoop() {
        try {
            let message: any;

            // Chests
            let chests = [];
            let i = 0;
            for (let chestID in parent.chests) {
                chests.push(chestID);
                if (++i > 50) break;
            }
            if (i > 0) {
                message = {
                    "message": "chests",
                    "chests": chests
                }
                sendMassCM(parent.party_list, message)
                this.parse_cm(parent.character.name, message)
            }

            // Inventory
            message = {
                "message": "info",
                "inventory": getInventory(),
                "map": parent.character.map,
                "x": parent.character.real_x,
                "y": parent.character.real_y,
                "s": parent.character.s
            }
            sendMassCM(parent.party_list, message)
            this.parse_cm(parent.character.name, message)

            // TODO: We're already sending 's', so we don't need to do this anymore, we can figure it out elsewhere
            // Quests
            if (character.s.monsterhunt && character.s.monsterhunt.c > 0) {
                message = {
                    "message": "quest",
                    "target": character.s.monsterhunt.id
                }
                sendMassCM(parent.party_list, message)
                this.parse_cm(parent.character.name, message)
            } else if (!character.s.monsterhunt || character.s.monsterhunt.c == 0) {
                message = {
                    "message": "quest",
                    "target": undefined
                }
                sendMassCM(parent.party_list, message)
                this.parse_cm(parent.character.name, message)
            }

            // Other players
            for (let id in parent.entities) {
                if (parent.entities[id].type != "character") continue;
                if (parent.entities[id].npc) continue;

                let player = parent.entities[id] as ICharacter
                message = {
                    "message": "player",
                    "id": id,
                    "info": {
                        "map": player.map,
                        "x": player.real_x,
                        "y": player.real_y,
                        "s": player.s,
                        "ctype": player.ctype
                    }
                }

                sendMassCM(parent.party_list, message)
                this.parse_cm(parent.character.name, message)
            }

            // Important NPCs
            for (let npc of ["Angel", "Kane"]) {
                if (!parent.entities[npc]) continue;
                message = {
                    "message": "npc",
                    "id": npc,
                    "info": {
                        "map": parent.entities[npc].map,
                        "x": parent.entities[npc].real_x,
                        "y": parent.entities[npc].real_y
                    }
                }
                if (parent.entities[npc]) {
                    sendMassCM(parent.party_list, message)
                    this.parse_cm(parent.character.name, message)
                }
            }

            setTimeout(() => { this.sendInfoLoop() }, 5000);
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.sendInfoLoop() }, 5000);
        }
    }

    protected loot() {
        let i = 0;
        for (let chestID in parent.chests) {
            let chest = parent.chests[chestID]
            if (distance(parent.character, chest) < 800) parent.socket.emit("open_chest", { id: chestID }); // It's 800 as per @Wizard in #feedback on 11/26/2019
            if (++i > 20) break;
        }
    }

    protected attackLoop(): void {
        try {
            let targets = this.getTargets(1);
            if (targets.length == 0 // No targets
                || parent.character.stoned // Can't attack
                || parent.character.mp < parent.character.mp_cost // No MP
                || parent.next_skill["attack"] > Date.now() // On cooldown
                || parent.distance(parent.character, targets[0]) > parent.character.range
                || (smart.moving && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdAttack && targets[0].target != parent.character.name) // Holding attack and not being attacked
                || (this.holdAttack && targets[0].target != parent.character.name)) { // Holding attack and not being attacked
                setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
            } else {
                attack(targets[0]).then(() => {
                    // Attack success!
                    this.getTargets(1); // Get a new target right away
                    setTimeout(() => { this.attackLoop() }, parent.next_skill["attack"] - Date.now());
                }, () => {
                    // Attack fail...
                    setTimeout(() => { this.attackLoop() }, parent.next_skill["attack"] - Date.now());
                });
            }
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.attackLoop() }, parent.next_skill["attack"] - Date.now());
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
                && (!this.targetPriority[targets[0].mtype] // Either 1) there's something attacking us that isn't in our priority list
                    || (character.hp < targets[0].attack * 2)) // or 2) We're about to die
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
                }
            }
        } catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.scareLoop() }, Math.max(parent.character.ping, parent.next_skill["scare"] - Date.now()));
    }

    protected moveLoop(): void {
        try {
            let targets = this.getTargets(1);
            if (this.holdPosition || smart.moving) {
                if (targets.length > 0 /* We have a target in range */
                    && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].stopOnSight /* We stop on sight of that target */
                    && this.pathfinder.movementTarget == targets[0].mtype /* We're moving to that target */
                    && parent.distance(parent.character, targets[0]) < parent.character.range /* We're in range of that target */) {
                    stop();
                    this.movementQueue = []; // clear movement queue
                }

                // Don't move, we're holding position or smart moving somewhere
                setTimeout(() => { this.moveLoop() }, 250); // TODO: move this 250 cooldown to a setting.
                return;
            } else if (this.movementQueue.length == 0) { // No movements queued
                // Reset movement target
                let movementTarget = this.getMovementTarget()
                if (movementTarget) {
                    this.pathfinder.saferMove(movementTarget)
                }

                // Default movements
                if (["ranger", "mage", "priest"].includes(character.ctype)) {
                    this.avoidAggroMonsters();
                }

                this.avoidAttackingMonsters();

                if (["ranger", "mage", "warrior", "priest"].includes(character.ctype)) {
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
                setTimeout(() => { this.healLoop() }, Math.max(parent.next_skill["use_town"] - Date.now(), parent.character.ping)) // TODO: Find out something that tells us how long we have to wait before respawning.
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
            if (target.range > character.range) continue; // We can't attack it by kiting, don't try
            minDistance = d;
            minTarget = target;
        }

        if (!minTarget) return; // We're far enough away not to get attacked, or it's impossible to do so

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
            || (this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdPosition) // We don't want to move to these monsters
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

    public getNewYearTreeBuff() {
        if (!G.maps.main.ref.newyear_tree) return; // Event is not live.
        if (parent.character.s.holidayspirit) return; // We already have the buff.
        if (distance(parent.character, G.maps.main.ref.newyear_tree) > 250) return; // Too far away

        parent.socket.emit("interaction", { type: "newyear_tree" });
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

    public parse_cm(characterName: string, data: any) {
        if (!parent.party_list.includes(characterName) && parent.character.name !== characterName) {
            // Ignore messages from players not in our party
            game_log("Blocked CM from " + characterName);
            return;
        }

        // Start tracking info for this player if we haven't yet
        if (!this.partyInfo[characterName]) this.partyInfo[characterName] = {}

        if (data.message == "quest") {
            this.partyInfo[characterName].target = data.target
            // } else if (data.message = "chests") {
            //     data.chests.forEach((chest: string) => {
            //         this.chests.add(chest)
            //     });
        } else if (data.message == "info") {
            this.partyInfo[characterName].inventory = data.inventory
            this.partyInfo[characterName].map = data.map
            this.partyInfo[characterName].x = data.x
            this.partyInfo[characterName].y = data.y
            this.partyInfo[characterName].s = data.s
        } else if (data.message == "npc") {
            this.otherInfo.npcs[data.id] = data.info
        } else if (data.message == "player") {
            this.otherInfo.players[data.id] = data.info
        }
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

    public getMovementTarget(): ALPosition {
        // Check for golden bat
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.mtype == "goldenbat") {
                set_message("goldenbat")
                this.pathfinder.movementTarget = "goldenbat";
                // NOTE: We should pathfind to it on our own
                // TODO: make sure we actually do this, lol
                return
            }
        }

        // Check for Christmas Tree
        if (G.maps.main.ref.newyear_tree && !character.s.holidayspirit) {
            this.pathfinder.movementTarget = "newyear_tree";
            return G.maps.main.ref.newyear_tree
        }

        // Check for event monsters
        for (let name in parent.S) {
            if (this.targetPriority[name as MonsterName]) {
                set_message(name)
                this.pathfinder.movementTarget = name;
                for (let id in parent.entities) {
                    let entity = parent.entities[id]
                    if (entity.mtype == name) {
                        // There's one nearby
                        return;
                    }
                }
                return parent.S[name as MonsterName]
            }
        }

        // Check if our inventory is full
        let full = true;
        for(let i = 0; i < 42; i++) {
            if(!parent.character.items[i]) {
                full = false;
                break;
            }
        }
        if(full) {
            // This is where our merchant usually hangs out
            return { map: "main", "x": 60, "y": -325 }
        }

        // Check for monster hunt
        if (!character.s.monsterhunt) {
            set_message("New MH")
            this.pathfinder.movementTarget = "monsterhunter";
            return G.maps.main.ref.monsterhunter
        } else if (character.s.monsterhunt.c == 0) {
            set_message("Finish MH")
            this.pathfinder.movementTarget = "monsterhunter";
            return G.maps.main.ref.monsterhunter
        } else {
            // Get all party quests
            let potentialTargets: MonsterName[] = [parent.character.s.monsterhunt.id]
            for (let info in this.partyInfo) {
                if (!this.partyInfo[info].target) continue;
                potentialTargets.push(this.partyInfo[info].target as MonsterName)
            }
            for (let potentialTarget of potentialTargets) {
                if (this.targetPriority[potentialTarget]) {

                    // We have a doable quest
                    set_message("MH " + potentialTarget.slice(0, 8))
                    this.pathfinder.movementTarget = potentialTarget;
                    for (let id in parent.entities) {
                        let entity = parent.entities[id]
                        if (entity.mtype == potentialTarget) {
                            // There's one nearby
                            return;
                        }
                    }
                    // We aren't near the monster hunt target, move to it
                    if (this.targetPriority[potentialTarget].map && this.targetPriority[potentialTarget].x && this.targetPriority[potentialTarget].y) {
                        return this.targetPriority[potentialTarget] as ALPosition
                    } else {
                        return getMonsterSpawnPosition(potentialTarget)
                    }
                }
            }
        }

        // Check if we can farm with +1000% gold and luck
        let kane = parent.entities["Kane"] ? parent.entities["Kane"] : this.otherInfo.npcs.Kane
        let angel = parent.entities["Angel"] ? parent.entities["Angel"] : this.otherInfo.npcs.Angel
        if (kane && angel) {
            let kaneSpawns = getNearbyMonsterSpawns(kane as ALPosition, 800)
            let angelSpawns = getNearbyMonsterSpawns(angel as ALPosition, 800)

            if(distance(parent.character, kane) < 800 && distance(parent.character, angel) < 800) {
                // We're near both of them
                set_message("2x1000% farm")
                return;
            }
            for (let kSpawn of kaneSpawns) {
                for (let aSpawn of angelSpawns) {
                    if (kSpawn[1].x == aSpawn[1].x && kSpawn[1].y == aSpawn[1].y && this.targetPriority[kSpawn[0]]) {
                        // We found a spawn where both 
                        set_message("2x1000% farm")
                        this.pathfinder.movementTarget = kSpawn[0];
                        if (distance(parent.character, kSpawn[1]) > 500) {
                            return kSpawn[1]
                        } else {
                            return
                        }
                    }
                }
            }
            if(distance(parent.character, kane) < 800) {
                set_message("1000% luck")
                return; // We're near Kane
            }
            for (let kSpawn of kaneSpawns) {
                if (this.targetPriority[kSpawn[0]]) {
                    set_message("1000% luck")
                    this.pathfinder.movementTarget = kSpawn[0];
                    return kSpawn[1]
                }
            }
            if(distance(parent.character, angel) < 800) {
                set_message("1000% gold")
                return; // We're near Angel
            }
            for (let aSpawn of angelSpawns) {
                if (this.targetPriority[aSpawn[0]]) {
                    set_message("1000% gold")
                    this.pathfinder.movementTarget = aSpawn[0];
                    return aSpawn[1]
                }
            }
        }

        // Check for our main target
        set_message(this.mainTarget)
        this.pathfinder.movementTarget = this.mainTarget;
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.mtype == this.mainTarget) {
                // There's one nearby
                return;
            }
        }
        if (this.targetPriority[this.mainTarget].map && this.targetPriority[this.mainTarget].x && this.targetPriority[this.mainTarget].y) {
            return this.targetPriority[this.mainTarget] as ALPosition
        } else {
            return getMonsterSpawnPosition(this.mainTarget)
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
            if (!this.targetPriority[potentialTarget.mtype] && potentialTarget.target != parent.character.name) continue; // Not a monster we care about, and it's not attacking us
            if (potentialTarget.type != "monster") // Not a monster
                if (!is_pvp() && potentialTarget.type == "character") continue; // Not PVP

            // Set a priority based on the index of the entity 
            let priority = 0;
            if (this.targetPriority[potentialTarget.mtype]) priority = this.targetPriority[potentialTarget.mtype].priority;

            // Adjust priority if a party member is already attacking it and it has low HP
            if (claimedTargets.includes(id) && potentialTarget.hp <= parent.character.attack) priority -= 250;

            // Increase priority if it's our "main target"
            if (potentialTarget.mtype == this.mainTarget) priority += 10;

            // Increase priority if it's our movement target
            if (potentialTarget.mtype == this.pathfinder.movementTarget) priority += 500;

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