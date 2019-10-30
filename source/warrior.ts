import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { transferItemsToMerchant, sellUnwantedItems, transferGoldToMerchant } from './trade';

class Warrior extends Character {
    targetPriority: MonsterName[] = [
        "hen", "rooster", "goo", "crab", "bee", "osnake", "snake", "squigtoad", "croc", "rat", "minimush", "squig", "poisio", "crabx", "arcticbee", "bat", // #3: Easy to kill monsters
        "scorpion", "tortoise", "spider", "mvampire", // #2: Not that easy to kill, but killable monsters
        "goldenbat", "snowman", "mrgreen", "mrpumpkin", // #1: Event monsters
    ];
    mainTarget: MonsterName = "croc";

    run(): void {
        super.run();
        this.chargeLoop();
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
                this.moveToMonsters();
            }

            transferItemsToMerchant("earthMer");
            transferGoldToMerchant("earthMer");
            sellUnwantedItems();

            super.mainLoop();
        } catch (error) {
            console.error(error)
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    chargeLoop(): void {
        use_skill("charge")
        setTimeout(() => { this.chargeLoop() }, Math.max(250, parent.next_skill["charge"] - Date.now()));
    }
}

let warrior = new Warrior();
export { warrior }