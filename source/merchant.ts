import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { compoundItem, upgradeItem } from './upgrade'
import { sellUnwantedItems, exchangeItems } from './trade';

class Merchant extends Character {
    targetPriority: MonsterName[] = []; // Nothing for now, merchants can't usually attack.
    mainTarget: MonsterName = null; // Nothing for now, merchants can't usually attack.

    protected mainLoop(): void {
        try {
            // Movement
            if (!smart.moving) { // TODO: Add a check that we're not using our pathfinding.
                super.avoidAggroMonsters();
                super.avoidAttackingMonsters();
            }

            sellUnwantedItems();
            exchangeItems();

            //// Wearables
            // Rings
            compoundItem("dexring", 3);
            compoundItem("intring", 3);
            compoundItem("strring", 3);

            // Earrings
            compoundItem("dexearring", 3);
            compoundItem("intearring", 3);
            compoundItem("strearring", 3);

            // Belts
            compoundItem("dexbelt", 3);
            compoundItem("intbelt", 3);
            compoundItem("strbelt", 3);

            // Offhands
            upgradeItem("t2quiver", 5);
            compoundItem("wbook0", 3);
            compoundItem("wbook1", 2);

            // Capes
            upgradeItem("cape", 6);

            // Orbs
            compoundItem("orbg", 2);

            //// Weapons
            upgradeItem("firestaff", 7);
            upgradeItem("fireblade", 7);

            //// Miscellaneous
            compoundItem("lostearring", 2);

            // Merchant Set
            upgradeItem("mcgloves", 6);
            upgradeItem("mcpants", 6);
            upgradeItem("mcarmor", 6);
            upgradeItem("mcboots", 6);
            upgradeItem("mchat", 6);

            super.mainLoop();
        } catch (error) {
            console.error(error);
            setTimeout(() => { this.mainLoop(); }, 250);
        }
    }

    public run(): void {
        super.run();
        this.luckLoop();
    }

    protected attackLoop(): void {
        // Nothing for now, merchants can't usually attack.
    }

    public luckLoop(): void {
        if (!character.s || !character.s["mluck"] || character.s["mluck"].ms < 10000 || character.s["mluck"].f != character.name) {
            // Luck ourself
            use_skill("mluck", character);
        } else {
            // Luck others
            for (let id in parent.entities) {
                let luckTarget = parent.entities[id];
                if (!luckTarget.player || luckTarget.role) continue; // not a player
                if (luckTarget.role) continue; // not an NPC
                if (distance(character, luckTarget) > 250) continue; // out of range
                if (!luckTarget.s || !luckTarget.s["mluck"] || luckTarget.s["mluck"].ms < 300000 || luckTarget.s["mluck"].f != character.name) {
                    use_skill("mluck", luckTarget);
                    game_log("lucking " + luckTarget.name)
                    break;
                }
            }
        }

        setTimeout(() => { this.luckLoop() }, Math.max(50, parent.next_skill["mluck"] - Date.now()));
    }
}

export let merchant = new Merchant();