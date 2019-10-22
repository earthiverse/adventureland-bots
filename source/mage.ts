import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Mage extends Character {
    targetPriority: MonsterName[] = [
        "stoneworm", "iceroamer", "boar", "spider", "scorpion", "tortoise", "cgoo",  // Low priority
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "porcupine", "squigtoad", "croc", "rat", "minimush", "armadillo", "squig", "poisio", "crabx", "arcticbee", "bat", // Normal Priority
        "frog", "goldenbat", "snowman", "mrgreen", "mrpumpkin", // High Priority
    ];
    mainTarget: MonsterName = "rat";

    run(): void {
        super.run();
        this.energizeLoop();
        // this.sendMonsterHuntInfoLoop(parent.party_list);
    }

    mainLoop(): void {
        try {
            // Movement
            if (!smart.moving) {
                // this.moveToMonsterhunt();
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
        // Get nearby party members
        for (let id in parent.party) {
            if (id == character.name) continue; // Don't cast on ourself.
            let member = parent.party[id];
            if (distance(character, member) > character.range) continue; // Out of range

            use_skill("energize", id)
            break;
        }
        setTimeout(() => { this.energizeLoop() }, Math.max(250, parent.next_skill["energize"] - Date.now()));
    }
}

let mage = new Mage();
export { mage }