import { Character } from './character'
import { MonsterName } from './definitions/adventureland';
import { compoundItem } from './upgrade'
import { sellUnwantedItems } from './trade';

class Merchant extends Character {
    targetPriority: MonsterName[] = []; // Nothing for now, merchants can't usually attack.

    protected mainLoop(): void {
        super.mainLoop();
        super.avoidAttackingMonsters();
        super.avoidAggroMonsters();

        sellUnwantedItems();

        // Target compounds
        compoundItem("lostearring", 2);
        // TODO: add more from old bot
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

        setTimeout(() => { this.luckLoop() }, Math.max(100, parent.next_skill["mluck"] - Date.now()));
    }
}

export let merchant = new Merchant();