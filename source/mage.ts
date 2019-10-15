import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Mage extends Character {
    targetPriority: MonsterName[] = [
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "porcupine", "squigtoad", "croc", "rat", "minimush", "armadillo", "squig", "poisio", "crabx", "arcticbee", "bat", // #3: Easy to kill monsters
        "scorpion", "tortoise", "spider", "cgoo", "stoneworm", "boar", "iceroamer", // #2: Not that easy to kill, but killable monsters
        "goldenbat", "snowman", "mrgreen", "mrpumpkin", // #1: Event monsters
    ];
    mainTarget: MonsterName = "rat";

    run(): void {
        super.run();
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
    }
}

let mage = new Mage();
export { mage }