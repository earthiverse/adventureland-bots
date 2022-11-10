import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { SpecialMonsterMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { MAGE_SPLASH, WARRIOR_SPLASH } from "./equipment.js"

export function constructCuteBeeSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "cutebee_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableZapper: true,
                            enableEquipForCleave: true,
                            ensureEquipped: { ...WARRIOR_SPLASH },
                            typeList: ["cutebee", "bee", "crab", "crabx", "croc", "frog", "goo", "phoenix", "poisio", "scorpion", "snake", "spider", "squig", "squigtoad", "tortoise"]
                        }),
                        move: new SpecialMonsterMoveStrategy("cutebee")
                    }
                ]
            },
            {
                id: "cutebee_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            ensureEquipped: { ...MAGE_SPLASH },
                            typeList: ["cutebee", "bee", "crab", "crabx", "croc", "frog", "goo", "phoenix", "poisio", "scorpion", "snake", "spider", "squig", "squigtoad", "tortoise"]
                        }),
                        move: new SpecialMonsterMoveStrategy("cutebee")
                    }
                ]
            }
        ]
    }
}