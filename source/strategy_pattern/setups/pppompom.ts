import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { HoldPositionMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base"
import { RETURN_HIGHEST, ZAPPER_CRING, ZAPPER_STRRING } from "./equipment.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"

export function constructPPPomPomSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const bottomHold = new HoldPositionMoveStrategy({ map: "level2n", x: 120, y: -130 })
    const middleHold = new HoldPositionMoveStrategy({ map: "level2n", x: 120, y: -150 })
    const topHold = new HoldPositionMoveStrategy({ map: "level2n", x: 120, y: -170 })

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: {
                    ...ZAPPER_CRING,
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                },
            },
            maximumTargets: 1,
            targetingPartyMember: true,
            type: "pppompom",
        }),
        move: bottomHold,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableAbsorbToTank: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: {
                    ...ZAPPER_CRING,
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                },
            },
            maximumTargets: 1,
            type: "pppompom",
        }),
        move: middleHold,
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "attack"],
                prefer: {
                    ...ZAPPER_STRRING,
                    mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                    offhand: { name: "fireblade", filters: RETURN_HIGHEST },
                },
            },
            maximumTargets: 1,
            targetingPartyMember: true,
            type: "pppompom",
        }),
        move: topHold,
    }

    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["armor", "attack"],
                avoidAttributes: ["blast", "explosion"],
                prefer: {
                    ...ZAPPER_CRING,
                    mainhand: { name: "crossbow", filters: RETURN_HIGHEST },
                    offhand: { name: "t2quiver", filters: RETURN_HIGHEST },
                },
            },
            maximumTargets: 1,
            targetingPartyMember: true,
            type: "pppompom",
        }),
        move: topHold,
    }

    return {
        configs: [
            {
                id: "pppompom_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "pppompom_priest,ranger",
                characters: [priestConfig, rangerConfig],
            },
        ],
    }
}
