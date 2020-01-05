import { Queue } from "prioqueue"
import { IEntity, IPosition, ItemName, ItemInfo, SlotType, ICharacter, MonsterType, IPositionReal, NPCName, ChestInfo } from './definitions/adventureland';
import { Pathfinder } from './pathfinder';
import { sendMassCM, findItems, getInventory, getRandomMonsterSpawn, getAttackingEntities, getCooldownMS, isAvailable, canSeePlayer, getNearbyMonsterSpawns, wantToAttack, calculateDamageRange } from "./functions";
import { TargetPriorityList, OtherInfo, MyItemInfo } from "./definitions/bots";
import { dismantleItems, buyPots } from "./trade";

export abstract class Character {
    /** A list of monsters, priorities, and locations to farm. */
    public abstract targetPriority: TargetPriorityList;
    /** The default target if there's nothing else to attack */
    protected abstract mainTarget: MonsterType;
    /** Set to true to stop movement */
    public holdPosition = false;
    /** Set to true to stop attacks. We might still attack if the target is attacking us. */
    public holdAttack = false
    protected pathfinder: Pathfinder = new Pathfinder(6);
    /** Information about the state of the game that is useful to us */
    protected info: OtherInfo = {
        party: {},
        npcs: {},
        players: {}
    }

    protected mainLoop() {
        try {
            if (parent.character.ctype != "merchant") {
                this.equipBetterItems()
                this.getMonsterhuntQuest()
                buyPots()
            }

            this.getNewYearTreeBuff()
            dismantleItems()

            this.loot()
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.mainLoop() }, Math.max(250, parent.character.ping))
    }

    public run() {
        this.healLoop()
        this.attackLoop()
        this.scareLoop()
        this.moveLoop()
        this.sendInfoLoop()
        this.mainLoop()
    }

    /**
     * Sends a bunch of CMs to players in our party list telling them information like what quest we have, what items we have, etc.
     *
     * @protected
     * @memberof Character
     */
    protected sendInfoLoop() {
        try {
            let message: any

            // Chests
            // let chests: { [T in string]: ChestInfo } = {}
            // for (let chestID in parent.chests) {
            //     chests[chestID] = {
            //         alpha: parent.chests[chestID].alpha,
            //         x: parent.chests[chestID].x,
            //         y: parent.chests[chestID].y,
            //         map: parent.chests[chestID].map
            //     }
            // }
            // message= {
            //     "message": "chests",
            //     "chests": chests
            // }
            // sendMassCM(parent.party_list, message)
            // this.parse_cm(parent.character.name, message)

            // Information about us
            message = {
                "message": "info",
                "info": {
                    "shouldSwitchServer": this.shouldSwitchServer(),
                    "items": getInventory(),
                    "attack": parent.character.attack,
                    "frequency": parent.character.frequency,
                    "goldm": parent.character.goldm,
                    "luckm": parent.character.luckm,
                    "map": parent.character.map,
                    "x": parent.character.real_x,
                    "y": parent.character.real_y,
                    "s": parent.character.s
                }
            }
            sendMassCM(parent.party_list, message)
            this.parse_cm(parent.character.name, message)

            // Other players
            for (let id in parent.entities) {
                if (parent.entities[id].type != "character") continue;
                if (parent.entities[id].npc) continue;

                let player = parent.entities[id] as ICharacter
                message = {
                    "message": "player",
                    "id": id,
                    "info": {
                        "lastSeen": new Date(),
                        "rip": player.rip,
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
                        "lastSeen": new Date(),
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

            setTimeout(() => { this.sendInfoLoop() }, 5000)
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.sendInfoLoop() }, 5000)
        }
    }

    public shouldSwitchServer() {
        if (parent.character.ctype == "merchant") return true; // Merchant's go with the flow, man.

        // Monster Hunts
        if (!parent.character.s.monsterhunt) return false; // We can potentially get a monster hunt, don't switch
        if (this.targetPriority[parent.character.s.monsterhunt.id]) return false; // We can do our monster hunt
        for (let id of parent.party_list) {
            let member = parent.entities[id] ? parent.entities[id] : this.info.party[id]
            if (!member || !member.s || !member.s.monsterhunt) continue;
            if (this.targetPriority[member.s.monsterhunt.id as MonsterType]) return false; // We can do a party member's monster hunt
        }

        // Doable event monster
        for (let monster in parent.S) {
            if (monster == "grinch") continue // The grinch is too strong.
            if (!parent.S[monster as MonsterType].live) continue
            if (this.targetPriority[monster as MonsterType]) return false // We can do an event monster!
        }

        // // +1000% luck and gold
        // let kane = parent.entities["Kane"] ? parent.entities["Kane"] : this.info.npcs.Kane
        // let angel = parent.entities["Angel"] ? parent.entities["Angel"] : this.info.npcs.Angel
        // if (kane && angel && distance(kane, angel) < 300) {
        //     let kaneSpawns = getNearbyMonsterSpawns(kane, 300);
        //     let angelSpawns = getNearbyMonsterSpawns(angel, 300);

        //     for (let kSpawn of kaneSpawns) {
        //         for (let aSpawn of angelSpawns) {
        //             if (kSpawn.x == aSpawn.x && kSpawn.y == aSpawn.y) {
        //                 // We can stack +1000% luck and gold.
        //                 return false;
        //             }
        //         }
        //     }
        // }

        // // NOTE: While we're farming poisios and spiders, don't switch servers
        // return false;

        return true;
    }

    protected loot() {
        let i = 0
        for (let chestID in parent.chests) {
            let chest = parent.chests[chestID]
            if (distance(parent.character, chest) > 800) continue // Chests over a 800 radius have a penalty as per @Wizard in #feedback (Discord) on 11/26/2019

            let shouldLoot = true;
            for (let id of parent.party_list) {
                if (id == parent.character.id) continue // Skip ourself

                let partyMember = parent.entities[id]
                if (!partyMember) continue
                if (distance(partyMember, chest) > 800) continue
                if (!this.info.party[id]) continue

                if (["chest3", "chest4"].includes(chest.skin)) {
                    if (parent.character.goldm >= this.info.party[id].goldm) continue
                }
                else {
                    if (parent.character.luckm >= this.info.party[id].luckm) continue
                }

                shouldLoot = false
                break
            }

            if (shouldLoot) {
                parent.socket.emit("open_chest", { id: chestID })
                if (++i > 10) break // Only open 10 chests at a time to help with server call costs
            }
        }
    }

    protected async attackLoop(): Promise<void> {
        try {
            let targets = this.getTargets(1)
            if (targets.length && wantToAttack(this, targets[0]))
                await attack(targets[0])
        } catch (error) {
            if (!["cooldown", "not_found", "disabled"].includes(error.reason))
                console.error(error)
        }
        setTimeout(() => { this.attackLoop() }, getCooldownMS("attack"))
    }

    protected scareLoop(): void {
        try {
            let targets = getAttackingEntities()
            let wantToScare = false
            if (targets.length >= 3) {
                wantToScare = true
            } else {
                for (let target of targets) {
                    if (target.mtype == "grinch") continue // NOTE: CHRISTMAS EVENT -- remove after Christmas.
                    if (distance(target, parent.character) > target.range) continue // They're out of range
                    if (calculateDamageRange(target, parent.character)[1] * 6 * target.frequency <= parent.character.hp) continue // We can tank a few of their shots
                    if (this.targetPriority[target.mtype]) continue

                    wantToScare = true
                    break
                }
            }
            if (!isAvailable("scare") // On cooldown
                || !wantToScare) { // Can't be easily killed
                setTimeout(() => { this.scareLoop() }, getCooldownMS("scare"))
                return
            }


            if (parent.character.slots.orb.name == "jacko") {
                // We have a jacko equipped
                use_skill("scare")
            } else {
                // Check if we have a jacko in our inventory
                let items = findItems("jacko")
                if (items.length) {
                    let jackoI = items[0].index
                    equip(jackoI) // Equip the jacko
                    use_skill("scare") // Scare the monsters away
                }
            }
        } catch (error) {
            console.error(error);
        }
        setTimeout(() => { this.scareLoop() }, getCooldownMS("scare"));
    }

    protected last: { message: string; target: IPositionReal; } = { message: "start", target: parent.character };
    protected moveLoop(): void {
        try {
            if (this.holdPosition) {
                setTimeout(() => { this.moveLoop() }, 1000)
                return
            }

            let movementTarget = this.getMovementTarget()
            if (movementTarget) {
                // Stop if our target changes
                if (this.last.message != movementTarget.message) {
                    set_message(movementTarget.message.slice(0, 11))
                    stop()
                }

                this.last = movementTarget

                if (movementTarget.target) this.pathfinder.saferMove(movementTarget.target)
            }

            let targets = this.getTargets(1)
            if (smart.moving) {
                if (targets.length > 0 /* We have a target in range */
                    && this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].stopOnSight /* We stop on sight of that target */
                    && this.pathfinder.movementTarget == targets[0].mtype /* We're moving to that target */
                    && distance(parent.character, targets[0]) < parent.character.range /* We're in range of that target */) {
                    stop()
                }
            } else {
                // Default movements
                if (["ranger", "mage", "priest"].includes(parent.character.ctype)) {
                    this.avoidAggroMonsters()
                }

                this.avoidStacking()

                this.avoidAttackingMonsters()

                if (["ranger", "mage", "warrior", "priest"].includes(parent.character.ctype)) {
                    this.moveToMonster()
                }
            }
        } catch (error) {
            console.error(error)
        }
        setTimeout(() => { this.moveLoop() }, Math.max(250, parent.character.ping)); // TODO: queue up next movement based on time it will take to walk there
    }

    protected healLoop(): void {
        try {
            if (parent.character.rip) {
                // Respawn if we're dead
                respawn();
                setTimeout(() => { this.healLoop() }, getCooldownMS("use_town"))
                return;
            } else if (!isAvailable("use_hp")) {
                setTimeout(() => { this.healLoop() }, getCooldownMS("use_hp"))
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

            setTimeout(() => { this.healLoop() }, Math.max(250, getCooldownMS("use_hp")))
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.healLoop() }, Math.max(250, getCooldownMS("use_hp")))
        }
    }

    /** Checks if there are players on top of us, and moves so that they aren't. Players take damage from attacks to any other character close by. */
    // TODO: Think about combining this function with avoidAggroMonsters for performance reasons
    protected avoidStacking(): void {
        let d = 0;

        let closeMonster = false;
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.type != "monster") continue; // Not a monster
            if (!entity.target) continue; // No target on the entity

            d = 25 + entity.range - distance(parent.character, entity)
            if (d > 0) {
                closeMonster = true
                break;
            }
        }
        if (!closeMonster) return; // No monsters are nearby to attack us

        let closeEntity
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.type != "character") continue; // Not a character

            d = 25 - distance(parent.character, entity)
            if (d > 0) {
                // There's someone close!
                closeEntity = entity
                break;
            }
        }
        if (!closeEntity) return;

        let escapePosition: IPosition;
        let angle = Math.atan2(parent.character.real_y - closeEntity.real_y, parent.character.real_x - closeEntity.real_x);
        let x = Math.cos(angle) * d
        let y = Math.sin(angle) * d
        escapePosition = { x: parent.character.real_x + x, y: parent.character.real_y + y };

        if (can_move_to(escapePosition.x, escapePosition.y))
            move(escapePosition.x, escapePosition.y)
    }

    protected avoidAggroMonsters(): void {
        let closeEntity: IEntity = null;
        let moveDistance = 0;
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.mtype == "grinch") continue // NOTE: CHRISTMAS EVENT -- delete after
            if (entity.type != "monster") continue // Not a monster
            if (entity.aggro == 0) continue // Not an aggressive monster
            if (entity.target && entity.target != parent.character.name) continue // Targeting someone else
            if (calculateDamageRange(entity, parent.character)[1] * 3 * entity.frequency < 400) continue // We can outheal the damage from this monster, don't bother moving

            let d = Math.max(60, entity.speed * 1.5) - distance(parent.character, entity)
            if (d < 0) continue // Far away

            if (d > moveDistance) {
                closeEntity = entity
                moveDistance = d
                break
            }
        }

        if (!closeEntity) return // No close monsters

        let escapePosition: IPosition;
        let angle = Math.atan2(parent.character.real_y - closeEntity.real_y, parent.character.real_x - closeEntity.real_x);
        let x = Math.cos(angle) * moveDistance
        let y = Math.sin(angle) * moveDistance
        escapePosition = { x: parent.character.real_x + x, y: parent.character.real_y + y };

        if (can_move_to(escapePosition.x, escapePosition.y))
            move(escapePosition.x, escapePosition.y)
    }

    // TODO: If we are being attacked by 2 different monsters, one with long range, one with short range,
    // if the short range monster is closer, we might not move back enough from the long range monster
    protected avoidAttackingMonsters(): void {
        // Find all monsters attacking us
        let attackingEntities: IEntity[] = getAttackingEntities();
        let currentTarget = get_targeted_monster();
        if (currentTarget) {
            attackingEntities.push(currentTarget);
        }

        if (!attackingEntities) return; // There aren't any monsters attacking us

        // Find the closest monster of those attacking us
        let minDistance = 9999;
        let escapePosition: IPosition;
        let minTarget: IEntity = null;
        for (let entity of attackingEntities) {
            if (calculateDamageRange(entity, parent.character)[1] * 3 * entity.frequency < 400) continue; // We can outheal the damage 
            let d = distance(parent.character, entity);
            if (entity.mtype == "grinch") continue // NOTE: CHRISTMAS EVENT -- delete after
            if (entity.speed > parent.character.speed) continue // We can't outrun it, don't try
            if (entity.range > parent.character.range) continue // We can't outrange it, don't try
            if (minDistance < d) continue; // There's another target that's closer
            if (d > (entity.range + (entity.speed + parent.character.speed) * Math.max(parent.character.ping * 0.001, 0.5))) continue; // We're still far enough away to not get attacked
            minDistance = d;
            minTarget = entity;
        }
        if (!minTarget) return; // We're far enough away not to get attacked, or it's impossible to do so

        // Move away from the closest monster
        let angle: number = Math.atan2(parent.character.real_y - minTarget.real_y, parent.character.real_x - minTarget.real_x);
        let moveDistance: number = minTarget.range + minTarget.speed - (minDistance / 2)
        function calculateEscape(angle: number, move_distance: number): IPosition {
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
        }

        this.pathfinder.saferMove(escapePosition)
    }

    public moveToMonster(): void {
        let targets = this.getTargets(1)
        if (targets.length == 0 // There aren't any targets to move to
            || (this.targetPriority[targets[0].mtype] && this.targetPriority[targets[0].mtype].holdPositionFarm) // We don't want to move to these monsters
            || distance(parent.character, targets[0]) <= parent.character.range) // We have a target, and it's in range.
            return

        if (can_move_to(targets[0].real_x, targets[0].real_y)) {
            let moveDistance = distance(parent.character, targets[0]) - parent.character.range + (targets[0].speed * 0.5)
            let angle: number = Math.atan2(targets[0].real_y - parent.character.real_y, targets[0].real_x - parent.character.real_x)
            let x = Math.cos(angle) * moveDistance
            let y = Math.sin(angle) * moveDistance

            // Move normally to target
            // game_log("moving normally to target")
            move(parent.character.real_x + x, parent.character.real_y + y)
        } else {
            this.pathfinder.saferMove(targets[0])
        }
    }

    public getNewYearTreeBuff() {
        if (!G.maps.main.ref.newyear_tree) return // Event is not live.
        if (parent.character.s.holidayspirit) return // We already have the buff.
        if (distance(parent.character, G.maps.main.ref.newyear_tree) > 250) return // Too far away

        parent.socket.emit("interaction", { type: "newyear_tree" })
    }

    public getMonsterhuntQuest() {
        let monsterhunter: IPosition = { map: "main", x: 126, y: -413 }
        if (distance(parent.character, monsterhunter) > 250) return // Too far away
        if (!parent.character.s.monsterhunt) {
            // No quest, get a new one
            parent.socket.emit('monsterhunt')
        } else if (parent.character.s.monsterhunt.c == 0) {
            // We've finished a quest
            parent.socket.emit('monsterhunt')
        }
    }

    public parse_cm(characterName: string, data: any) {
        if (!parent.party_list.includes(characterName) && parent.character.name != characterName) {
            // Ignore messages from players not in our party
            game_log("Blocked CM from " + characterName)
            return
        }

        if (data.message == "info") {
            this.info.party[characterName] = data.info
        } else if (data.message == "npc") {
            this.info.npcs[data.id as NPCName] = data.info
        } else if (data.message == "player") {
            this.info.players[data.id] = data.info
        } else if (data.message == "chests") {
            for (let chestID in data.chests) {
                if (!parent.chests[chestID]) parent.chests[chestID] = data.chests[chestID]
            }
        }
    }

    /** Looks for equipment in our inventory, and if it's more applicable to the current situation, equip it */
    public equipBetterItems() {
        let items = getInventory();

        for (let slot in parent.character.slots) {
            let slotItem: ItemInfo = parent.character.slots[slot as SlotType];
            let betterItem: MyItemInfo
            if (!slotItem) continue; // Nothing equipped in that slot
            for (let item of items) {
                if (item.name != slotItem.name) continue; // Not the same item
                if (item.level <= slotItem.level) continue; // Not better than the currently equipped item

                // We found something better
                slotItem = item;
                betterItem = item; // Overwrite the slot info, and keep looking
            }

            // Equip our better item
            if (betterItem) equip(betterItem.index, slot as SlotType);
        }
    }

    public getMovementTarget(): { message: string, target: IPositionReal } {
        // Check for golden bat
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.mtype == "goldenbat") {
                this.pathfinder.movementTarget = "goldenbat"
                // NOTE: We automatically pathfind on our own with moveToMonster()
                return { message: "goldenbat", target: null }
            }
        }

        // Finish monster hunt
        if (parent.character.s.monsterhunt && parent.character.s.monsterhunt.c == 0) {
            this.pathfinder.movementTarget = undefined;
            return { message: "Finish MH", target: G.maps.main.ref.monsterhunter }
        }

        // Check for Christmas Tree
        if (G.maps.main.ref.newyear_tree && !parent.character.s.holidayspirit) {
            this.pathfinder.movementTarget = null;
            return { message: "Xmas Tree", target: G.maps.main.ref.newyear_tree }
        }

        // Check if our inventory is full
        let full = true;
        for (let i = 0; i < 42; i++) {
            if (!parent.character.items[i]) {
                full = false;
                break;
            }
        }
        if (full) {
            // This is where our merchant usually hangs out
            this.pathfinder.movementTarget = undefined;
            return { message: "Full!", target: { map: "main", "x": 60, "y": -325 } }
        }

        // Check for event monsters
        for (let mtype in parent.S) {
            if (mtype == "grinch") continue // The grinch is too strong.
            if (!parent.S[mtype as MonsterType].live) continue;
            if (this.targetPriority[mtype as MonsterType]) {
                this.pathfinder.movementTarget = mtype;
                for (let id in parent.entities) {
                    let entity = parent.entities[id]
                    if (entity.mtype == mtype) {
                        // There's one nearby
                        return { message: mtype, target: null };
                    }
                }
                return { message: mtype, target: parent.S[mtype as MonsterType] }
            }
        }

        // // NOTE: Because snowmen spawn way too often, let's just camp out there and try to get some rings while we're at it.
        // for (let id in parent.entities) {
        //     let entity = parent.entities[id]
        //     if (entity.mtype == "arcticbee") return { message: "Cold Bois", target: null }
        // }
        // return { message: "Cold Bois", target: getRandomMonsterSpawnPosition("arcticbee") }

        // See if there's a nearby monster hunt (avoid moving as much as possible)
        let monsterHuntTargets: MonsterType[] = []
        for (let memberName of parent.party_list) {
            let member = parent.entities[memberName] ? parent.entities[memberName] : this.info.party[memberName]
            if (!member) continue; // No information yet
            if (!member.s.monsterhunt || member.s.monsterhunt.c == 0) continue // They don't have a monster hunt, or are turning it in
            if (!this.targetPriority[member.s.monsterhunt.id]) continue; // We can't do it

            // Check if it's impossible for us to complete it in the amount of time given
            let partyDamageRate = 0
            let damageToDeal = G.monsters[member.s.monsterhunt.id].hp * member.s.monsterhunt.c
            let timeLeft = member.s.monsterhunt.ms / 1000
            for (let id of parent.party_list) {
                partyDamageRate += this.info.party[id].attack * this.info.party[id].frequency * 0.9
            }
            if (damageToDeal / partyDamageRate > timeLeft) continue;

            monsterHuntTargets.push(member.s.monsterhunt.id)
        }
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (monsterHuntTargets.includes(entity.mtype)) {
                // There's one nearby
                this.pathfinder.movementTarget = entity.mtype;
                if (this.targetPriority[entity.mtype].holdPositionFarm)
                    return { message: "MH " + entity.mtype, target: this.targetPriority[entity.mtype] as IPositionReal };
                else
                    return { message: "MH " + entity.mtype, target: null };
            }
        }

        // New monster hunt
        if (!parent.character.s.monsterhunt) {
            this.pathfinder.movementTarget = undefined;
            return { message: "New MH", target: G.maps.main.ref.monsterhunter }
        }

        // Move to a monster hunt
        // TODO: Implement moving to the nearest monster hunt instead of the first one in the array
        // NOTE: Is this really a good idea? What about Phoenix?

        if (monsterHuntTargets.length) {
            let potentialTarget = monsterHuntTargets[0];

            // Frog check, because they're super easy to complete with mages or priests
            if (monsterHuntTargets.includes("frog")
                && G.items[parent.character.slots.mainhand.name].damage == "magical"
                && this.targetPriority["frog"]) {
                potentialTarget = "frog"
            }

            this.pathfinder.movementTarget = potentialTarget;
            if (this.targetPriority[potentialTarget].map && this.targetPriority[potentialTarget].x && this.targetPriority[potentialTarget].y) {
                return { message: "MH " + potentialTarget, target: this.targetPriority[potentialTarget] as IPositionReal }
            } else {
                return { message: "MH " + potentialTarget, target: getRandomMonsterSpawn(potentialTarget) }
            }
        }

        // // TODO: Add a check to see if we are actually near monsters with these functions.
        // // TODO: Sometimes they come out of the warp at the top of town, see Kane and Angel, and stop and just attack the odd chicken...
        // // Check if we can farm with +1000% luck (and maybe +1000% gold, too!)
        // let kane = parent.entities.Kane ? parent.entities.Kane : this.info.npcs.Kane
        // let angel = parent.entities.Angel ? parent.entities.Angel : this.info.npcs.Angel
        // let targets = this.getTargets(1)
        // if (kane && angel) {
        //     // See if they're both near a single monster spawn
        //     let kSpawns = getNearbyMonsterSpawns(kane, 250)
        //     let aSpawns = getNearbyMonsterSpawns(angel, 250)
        //     if (parent.character.s.citizen0aura && parent.character.s.citizen4aura && targets.length) {
        //         this.pathfinder.movementTarget = null;
        //         return { message: "2x1000%", target: null }
        //     }
        //     for (let kSpawn of kSpawns) {
        //         if (["hen", "rooster"].includes(kSpawn.monster)) continue // Ignore chickens
        //         if (!this.targetPriority[kSpawn.monster]) continue // Ignore things not in our priority list
        //         for (let aSpawn of aSpawns) {
        //             if (kSpawn.x == aSpawn.x && kSpawn.y == aSpawn.y) {
        //                 return { message: "2x1000%", target: kane }
        //             }
        //         }
        //     }

        //     // See if Kane is near a monster spawn
        //     if (parent.character.s.citizen0aura && targets.length) {
        //         this.pathfinder.movementTarget = null;
        //         return { message: "1000% luck", target: null }
        //     }
        //     if (kSpawns.length
        //         && !["hen", "rooster"].includes(kSpawns[0].monster) // Ignore chickens
        //         && this.targetPriority[kSpawns[0].monster]) { // Ignore things not in our priority list
        //         this.pathfinder.movementTarget = kSpawns[0].monster;
        //         // TODO: Check for citizens aura, if we don't have it, move to the person we don't have
        //         return { message: "1000% luck", target: kane };
        //     }

        //     // See if Angel is near a monster spawn
        //     if (parent.character.s.citizen4aura && targets.length) {
        //         this.pathfinder.movementTarget = null;
        //         return { message: "1000% gold", target: null }
        //     }
        //     if (aSpawns.length
        //         && !["hen", "rooster"].includes(aSpawns[0].monster) // Ignore chickens
        //         && this.targetPriority[aSpawns[0].monster]) { // Ignore things not in our priority list
        //         this.pathfinder.movementTarget = aSpawns[0].monster;
        //         // TODO: Check for citizens aura, if we don't have it, move to the person we don't have
        //         return { message: "1000% gold", target: angel }
        //     }
        // }

        // Check for our main target
        this.pathfinder.movementTarget = this.mainTarget;
        for (let id in parent.entities) {
            let entity = parent.entities[id]
            if (entity.mtype == this.mainTarget) {
                // There's one nearby
                return { message: this.mainTarget, target: null };
            }
        }
        if (this.targetPriority[this.mainTarget].map && this.targetPriority[this.mainTarget].x && this.targetPriority[this.mainTarget].y) {
            return { message: this.mainTarget, target: this.targetPriority[this.mainTarget] as IPositionReal }
        } else {
            return { message: this.mainTarget, target: getRandomMonsterSpawn(this.mainTarget) }
        }

    }

    public getTargets(numTargets: number = 1): IEntity[] {
        let targets: IEntity[] = [];

        // Find out what targets are already claimed by our party members
        let members = parent.party_list;
        let claimedTargets: string[] = []
        for (let id in parent.entities) {
            if (members.includes(id)) {
                let target = parent.entities[id].target;
                if (target) claimedTargets.push(target)
            }
        }

        let potentialTargets = new Queue<IEntity>((x, y) => x.priority - y.priority);
        for (let id in parent.entities) {
            let potentialTarget = parent.entities[id];

            if(potentialTarget.mtype == "grinch") continue; // NOTE: Christmas event -- delete after

            let d = distance(parent.character, potentialTarget);
            if (!this.targetPriority[potentialTarget.mtype] && potentialTarget.target != parent.character.name) continue; // Not a monster we care about, and it's not attacking us
            if (potentialTarget.type != "monster") // Not a monster
                if (!is_pvp() && potentialTarget.type == "character") continue; // Not PVP

            // Set a priority based on the index of the entity 
            let priority = 0;
            if (this.targetPriority[potentialTarget.mtype]) priority = this.targetPriority[potentialTarget.mtype].priority;

            // Adjust priority if a party member is already attacking it and it has low HP
            if (claimedTargets.includes(id) && potentialTarget.hp <= calculateDamageRange(parent.character, potentialTarget)[0]) priority -= parent.character.range;

            // Increase priority if it's our "main target"
            if (potentialTarget.mtype == this.mainTarget) priority += 10;

            // Increase priority if it's our movement target
            if (potentialTarget.mtype == this.pathfinder.movementTarget) priority += parent.character.range * 2;

            // Increase priority if the entity is targeting us
            if (potentialTarget.target == parent.character.name) priority += parent.character.range * 2;

            // Adjust priority based on distance
            priority -= d;

            // We want to target cooperative monsters to multiply the amount of loot we get, so kill the one with the lowest HP first.
            if (potentialTarget.cooperative) priority += 2000 * (potentialTarget.max_hp - potentialTarget.hp) / potentialTarget.max_hp

            potentialTargets.enqueue(priority, potentialTarget);
        }

        if (potentialTargets.size == 0) {
            // No potential targets
            return targets;
        }

        while (targets.length < numTargets && potentialTargets.size > 0) {
            targets.push(potentialTargets.dequeue().value)
        }
        if (targets.length > 0)
            change_target(targets[0])
        return targets;
    }
}