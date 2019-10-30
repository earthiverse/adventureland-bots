import { Character } from './character'
import { MonsterName, Entity } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Ranger extends Character {
    targetPriority: MonsterName[] = [
        "stoneworm", "iceroamer", "ghost", "prat", "cgoo", "boar", "spider", "scorpion", "tortoise",  // Low priority
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "porcupine", "squigtoad", "croc", "rat", "minimush", "armadillo", "squig", "poisio", "crabx", "arcticbee", "bat", // #3: Easy to kill monsters
        "goldenbat", "snowman", "mrgreen", "mrpumpkin", // #1: Event monsters
    ];
    mainTarget: MonsterName = "rat";

    run(): void {
        super.run();
        this.superShotLoop();
        this.huntersmarkLoop();
        this.sendLootLoop();
    }

    mainLoop(): void {
        try {
            // Movement
            if (this.holdMovement) {
                this.moveToMonsterhunt();
            } else if (smart.moving) {
                let mhTarget = this.getMonsterhuntTarget();
                let targets = this.getTargets(1);
                if (targets.length > 0 && targets[0].mtype == mhTarget && parent.distance(parent.character, targets[0]) < parent.character.range) stop();
            } else {
                this.moveToMonsterhunt();
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

    huntersmarkLoop(): void {
        try {
            if (parent.character.mp < 240) {
            // No MP
                setTimeout(() => { this.huntersmarkLoop() }, Math.max(1000, parent.next_skill["huntersmark"] - Date.now()));
        }

            let targets = this.getTargets(1);
            if (targets.length > 0 && targets[0].hp > parent.character.attack * 5) use_skill("huntersmark", targets[0])
        } catch (error) {

        }
        setTimeout(() => { this.huntersmarkLoop() }, Math.max(250, parent.next_skill["huntersmark"] - Date.now()));
        }

    superShotLoop(): void {
        if (parent.character.mp < 400) {
            // No MP
            setTimeout(() => { this.superShotLoop() }, Math.max(1000, parent.next_skill["supershot"] - Date.now()));
            return;
        }

        let targets = this.getTargets(1);
        if (targets.length > 0 && !this.holdAttack) use_skill("supershot", targets[0])

        setTimeout(() => { this.superShotLoop() }, Math.max(50, parent.next_skill["supershot"] - Date.now()));
    }

    attackLoop() {
        // Try to 3shot targets
        let targets = this.getThreeshotTargets();
        if (targets && parent.character.mp > 300) {
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
            if (d > parent.character.range) continue; // Too far away
            if ((entity.target != parent.character.name) && (entity.hp > parent.character.attack * 0.7 * 0.9 * damage_multiplier(entity.armor - parent.character.apiercing))) continue; // Too much HP to kill in one shot & not targeting us.

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