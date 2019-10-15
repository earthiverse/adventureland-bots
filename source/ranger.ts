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
    }

    mainLoop(): void {
        super.mainLoop();

        // Movement
        super.avoidAggroMonsters();
        super.avoidAttackingMonsters();
        super.moveToMonsters();

        transferItemsToMerchant("earthMer");
        transferGoldToMerchant("earthMer");
        sellUnwantedItems();

        this.createParty(["earthMag", "earthWar", "earthMer"]);
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
            if (potentialTarget.mtype == this.getMonsterhuntTarget()) priority += 100;

            // Increase priority if the entity is targeting us
            if (potentialTarget.target == character.name) priority += 1000;

            // Increase priority based on remaining HP
            priority += 1 / potentialTarget.hp

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

    createParty(members: string[]): void {
        for (let member of members) {
            if (!parent.party[member])
                send_party_invite(member);
        }
    }
}

let ranger = new Ranger();
export { ranger }