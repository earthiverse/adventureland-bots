import { PingCompensatedCharacter, Priest } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

class PriestFireRoamerAttackStrategy extends PriestAttackStrategy {
    protected attack(bot: Priest): Promise<void> {
        const entity = bot.getEntity({ type: "fireroamer", returnHighestLevel: true })
        if (entity && entity.level > 10) {
            this.options.maximumTargets = 1
        } else if (entity && entity.level > 5) {
            this.options.maximumTargets = 2
        } else {
            this.options.maximumTargets = undefined
        }

        return super.attack(bot)
    }
}

// TODO: Fire roamer move strategy based on level of monsters

export function constructFireRoamerSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestFireRoamerAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableAbsorbToTank: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "firesistance", "int", "attack"],
            },
            type: "fireroamer",
        }),
        move: new HoldPositionMoveStrategy({ map: "desertland", x: 180, y: -675 }),
    }

    return {
        configs: [
            {
                id: "fireroamer_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "blast", "explosion"],
                            },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "fireroamer",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 160, y: -675 }),
                    },
                    priestConfig,
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            enableEquipForStomp: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "blast", "explosion"],
                            },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "fireroamer",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 200, y: -675 }),
                    },
                ],
            },
            {
                id: "fireroamer_priest,ranger",
                characters: [
                    priestConfig,
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "firesistance", "blast", "explosion"],
                            },
                            maximumTargets: 1,
                            targetingPartyMember: true,
                            type: "fireroamer",
                        }),
                        move: new HoldPositionMoveStrategy({ map: "desertland", x: 200, y: -675 }),
                    },
                ],
            },
        ],
    }
}
