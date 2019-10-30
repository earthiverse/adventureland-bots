import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Mage extends Character {
    targetPriority: MonsterName[] = [
        "stoneworm", "iceroamer", "ghost", "prat", "cgoo", "boar", "spider", "scorpion", "tortoise",  // Low priority
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "porcupine", "squigtoad", "croc", "rat", "minimush", "armadillo", "squig", "poisio", "crabx", "arcticbee", "bat", // Normal Priority
        "frog", "goldenbat", "snowman", "mrgreen", "mrpumpkin", // High Priority
    ];
    mainTarget: MonsterName = "rat";

    run(): void {
        super.run();
        this.energizeLoop();
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
                super.avoidAggroMonsters();
                super.avoidAttackingMonsters();
                super.moveToMonsters();
            }

            transferItemsToMerchant("earthMer");
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    energizeLoop(): void {
        try {
        // Get nearby party members
            for (let id in parent.party_list) {
                if (id == parent.character.name) continue; // Don't cast on ourself.
            let member = parent.party[id];
                if (distance(parent.character, member) > parent.character.range) continue; // Out of range

            use_skill("energize", id)
            break;
            }
        } catch (error) {
            
        }
        setTimeout(() => { this.energizeLoop() }, Math.max(250, parent.next_skill["energize"] - Date.now()));
    }
}

let mage = new Mage();
export { mage }