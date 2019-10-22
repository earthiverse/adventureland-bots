import { Character } from './character'
import { MonsterName, Entity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Ranger extends Character {
    targetPriority: MonsterName[] = [
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "porcupine", "squigtoad", "croc", "rat", "minimush", "armadillo", "squig", "poisio", "crabx", "arcticbee", "bat", // #3: Easy to kill monsters
        "scorpion", "tortoise", "spider", "cgoo", "stoneworm", "boar", "iceroamer", // #2: Not that easy to kill, but killable monsters
        "goldenbat", "snowman", "mrgreen", "mrpumpkin", // #1: Event monsters
    ];
    mainTarget: MonsterName = "rat";

    run(): void {
        super.run();
        this.superShotLoop();
        // this.sendMonsterHuntInfoLoop(parent.party_list);
    }

    mainLoop(): void {
        try {
            // Movement
            if (!smart.moving) {
                // this.moveToMonsterhunt();
                this.avoidAggroMonsters();
                this.avoidAttackingMonsters();
                this.moveToMonsters();
            }

            transferItemsToMerchant("earthMer");
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();


            this.createParty(["earthMag", "earthWar", "earthMer"]);

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    superShotLoop(): void {
        // const potentialTargets = new Queue<Entity>((x, y) => x.priority - y.priority);
        let potentialTargets: Entity[] = [];
        for (let id in parent.entities) {
            let potentialTarget = parent.entities[id];
            if (distance(character, potentialTarget) > character.range * 3) continue; // Not in range
            if (potentialTarget.type != "monster") // Not a monster
                if (!is_pvp() && potentialTarget.type == "character") continue; // Not PVP

            // Set a priority based on the index of the entity 
            let priority = this.targetPriority.indexOf(potentialTarget.mtype);
            if (potentialTarget.type == "monster" && priority == -1) continue; // Not a priority

            // Increase priority if it's our main target
            if (potentialTarget.mtype == this.mainTarget) priority += 100;

            // Increase priority if it's a quest monster
            if (potentialTarget.mtype == this.getMonsterhuntTarget()) priority += 1000;

            // Increase priority if the entity is targeting us
            if (potentialTarget.target == character.name) priority += 1000;

            // Adjust priority based on remaining HP
            priority -= potentialTarget.hp

            // potentialTargets.enqueue(priority, potentialTarget);
            potentialTargets.push(potentialTarget)
        }

        if (potentialTargets.length == 0) {
            // No potential targets
            setTimeout(() => { this.superShotLoop() }, Math.max(50, parent.next_skill["supershot"] - Date.now()));
            return;
        }

        use_skill("supershot", potentialTargets[0])
        setTimeout(() => { this.superShotLoop() }, Math.max(50, parent.next_skill["supershot"] - Date.now()));
    }

    attackLoop() {
        // Try to 3shot targets
        let targets = this.getThreeshotTargets();
        if (targets && character.mp > 300) {
            parent.socket.emit("skill", {
                name: "3shot",
                ids: [targets[0].id, targets[1].id, targets[2].id]
            });
            setTimeout(() => { this.attackLoop() }, Math.max(50, parent.next_skill["attack"] - Date.now()));
            return;
        }

        // Can't do a special attack, so let's do a normal one
        super.attackLoop();
    }

    getThreeshotTargets(): Entity[] {
        let targets: Entity[] = [];

        for (let id in parent.entities) {
            let entity = parent.entities[id];
            let d = distance(character, entity);
            if (entity.type != "monster") continue; // Not a monster
            if (!this.targetPriority.includes(entity.mtype)) continue; // Not something we want to attack
            if (d > character.range) continue; // Too far away
            if ((entity.target != character.name) && (entity.hp > character.attack * 0.7 * 0.9 * damage_multiplier(entity.armor - character.apiercing))) continue; // Too much HP to kill in one shot & not targeting us.

            targets.push(entity);
        }

        if (targets.length >= 3) {
            return targets.slice(0, 3);
        } else {
            return null;
        }
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