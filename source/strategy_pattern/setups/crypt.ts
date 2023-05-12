import { Character, IPosition, Mage, MonsterName, Pathfinder, PingCompensatedCharacter, Priest, Warrior } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { KiteMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base.js"
import { MAGE_NORMAL, MAGE_SPLASH, PRIEST_ARMOR, PRIEST_FAST, PRIEST_NORMAL, WARRIOR_NORMAL, WARRIOR_SPLASH } from "./equipment.js"
import { offsetPositionParty } from "../../base/locations.js"
import { suppress_errors } from "../logging.js"

const CRYPT_MONSTERS: MonsterName[] = ["zapper0", "vbat", "nerfedbat", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"]

class CryptMoveStratey extends KiteMonsterMoveStrategy {
    public constructor(contexts: Strategist<PingCompensatedCharacter>[]) {
        super({
            contexts: contexts,
            ignoreMaps: ["cave"],
            typeList: CRYPT_MONSTERS
        })

        // Only include crypt map positions
        this.spawns = this.spawns.filter(p => p.map === "crypt")
    }

    protected async move(bot: Character): Promise<IPosition> {
        const entity = bot.getEntity({ ...this.options, returnNearest: true })
        if (!entity) return super.move(bot) // Go find an entity

        switch (entity.type) {
            case "a1": // Spike
            case "a4": // Orlok
            case "nerfedbat":
            case "zapper0":
                // Spike spawns bats, stand on top of spike to optimize splash damage
                // Orlok spawns zappers, stand on top of Orlok to optimize splash damage
                bot.smartMove(offsetPositionParty(entity, bot)).catch(suppress_errors)
                break;
            case "a2": // Bill
            case "a3": // Lestat
            case "a5": // Elena
            case "a6": // Marceline
            case "a7": // Lucinda
            case "a8": // Angel
            case "vbat":
                this.kite(bot, entity)
                break;
        }
    }
}

class MageCryptAttackStrategy extends MageAttackStrategy {
    protected async attack(bot: Mage): Promise<void> {
        const entity = bot.getEntity({ ...this.options, returnNearest: true })
        if(entity) {
            switch (entity.type) {
                case "a1": // Spike
                case "a4": // Orlok
                case "nerfedbat":
                case "zapper0":
                    // Optimize splash damage
                    this.options.ensureEquipped = { ...MAGE_SPLASH }
                    break;
                case "a2": // Bill
                case "a3": // Lestat
                case "a5": // Elena
                case "a6": // Marceline
                case "a7": // Lucinda
                case "a8": // Angel
                case "vbat":
                    // Optimize kiting
                    this.options.ensureEquipped = { ...MAGE_NORMAL }
                    break;
            }
        }

        return super.attack(bot)
    }
}

class PriestCryptAttackStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        const entity = bot.getEntity({ ...this.options, returnNearest: true })
        if(entity) {
            switch (entity.type) {
                case "a1": // Spike
                case "a4": // Orlok
                case "nerfedbat":
                case "zapper0":
                    // Optimize damage
                    this.options.ensureEquipped = { ...PRIEST_ARMOR }
                    break;
                case "a2": // Bill
                case "a3": // Lestat
                case "a5": // Elena
                case "a6": // Marceline
                case "a7": // Lucinda
                case "a8": // Angel
                case "vbat":
                    // Optimize kiting
                    this.options.ensureEquipped = { ...PRIEST_ARMOR }
                    break;
            }
        }

        return super.attack(bot)
    }
}

class WarriorCryptAttackStrategy extends WarriorAttackStrategy {
    protected async attack(bot: Warrior): Promise<void> {
        const entity = bot.getEntity({ ...this.options, returnNearest: true })
        if(entity) {
            switch (entity.type) {
                case "a1": // Spike
                case "a4": // Orlok
                case "nerfedbat":
                case "zapper0":
                    // Optimize splash damage
                    this.options.ensureEquipped = { ...WARRIOR_SPLASH }
                    break;
                case "a2": // Bill
                case "a3": // Lestat
                case "a5": // Elena
                case "a6": // Marceline
                case "a7": // Lucinda
                case "a8": // Angel
                case "vbat":
                    // Optimize kiting
                    this.options.ensureEquipped = { ...WARRIOR_NORMAL }
                    break;
            }
        }

        return super.attack(bot)
    }
}

export function constructCryptSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new CryptMoveStratey(contexts)

    return {
        configs: [
            {
                id: "crypt_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageCryptAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: CRYPT_MONSTERS,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "priest",
                        attack: new PriestCryptAttackStrategy({
                            contexts: contexts,
                            enableGreedyAggro: true,
                            ensureEquipped: { ...PRIEST_FAST },
                            typeList: CRYPT_MONSTERS,
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorCryptAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: CRYPT_MONSTERS,
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}
