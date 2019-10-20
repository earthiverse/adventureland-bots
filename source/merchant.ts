import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { compoundItem, upgradeItem } from './upgrade'
import { sellUnwantedItems, exchangeItems } from './trade';
import { findItemsWithLevel, findItems } from './functions';
import { isGetAccessor } from 'typescript';

class Merchant extends Character {
    targetPriority: MonsterName[] = []; // Nothing for now, merchants can't usually attack.
    mainTarget: MonsterName = null; // Nothing for now, merchants can't usually attack.

    protected mainLoop(): void {
        try {
            // Movement
            if (!smart.moving) { // TODO: Add a check that we're not using our pathfinding.
                super.avoidAggroMonsters();
                super.avoidAttackingMonsters();

                // travel back and forth between characters
                if (parent.distance(parent.character, parent.party["earthiverse"]) < 250) {
                    game_log("moving to town from earthiverse")
                    smart_move({ map: "main", x: -50, y: -390 })
                } else if (parent.distance(parent.character, parent.party["earthMag"]) < 250) {
                    game_log("moving to town from earthMag")
                    smart_move({ map: "main", x: -60, y: -390 })
                } else if (parent.distance(parent.character, parent.party["earthWar"]) < 250) {
                    game_log("moving to town from earthWar")
                    smart_move({ map: "main", x: -40, y: -390 })
                } else if (parent.distance(parent.character, { map: "main", x: -50, y: -390 }) < 5) {
                    game_log("moving to earthMag")
                    smart_move(parent.party["earthMag"])
                } else if (parent.distance(parent.character, { map: "main", x: -60, y: -390 }) < 5) {
                    game_log("moving to earthWar")
                    smart_move(parent.party["earthWar"])
                } else if (parent.distance(parent.character, { map: "main", x: -40, y: -390 }) < 5) {
                    game_log("moving to earthiverse")
                    smart_move(parent.party["earthiverse"])
                } else {
                    game_log("default moving to earthiverse")
                    smart_move(parent.party["earthiverse"])
                }
            }

            sellUnwantedItems();
            exchangeItems();

            //// Wearables
            // Rings
            compoundItem("dexring", 3);
            compoundItem("intring", 3);
            compoundItem("strring", 3);

            // Amulets
            compoundItem("dexamulet", 3);
            compoundItem("intamulet", 3);
            compoundItem("stramulet", 3);

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

            // Heavy Set
            upgradeItem("helmet1", 8)
            upgradeItem("coat1", 8)
            upgradeItem("pants1", 8)
            upgradeItem("shoes1", 8)
            upgradeItem("gloves1", 8)

            // Normal Set
            upgradeItem("coat", 9);
            upgradeItem("pants", 9);
            upgradeItem("gloves", 9);
            upgradeItem("shoes", 9);
            upgradeItem("helmet", 9);
            upgradeItem("bow", 9);

            // buyAndUpgrade("coat")
            // buyAndUpgrade("pants")
            // buyAndUpgrade("gloves")
            // buyAndUpgrade("shoes")
            // buyAndUpgrade("helmet")

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