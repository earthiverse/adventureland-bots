import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { RETURN_HIGHEST } from "./equipment.js"

export function constructIceRoamerSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("iceroamer")

    const rangerConfig: CharacterConfig = {
        ctype: "ranger",
        attack: new RangerAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["attack", "dex"],
                prefer: {
                    helmet: { name: "cyber", filters: RETURN_HIGHEST },
                    mainhand: { name: "crossbow", filters: RETURN_HIGHEST },
                    orb: { name: "vorb", filters: RETURN_HIGHEST },
                },
            },
            type: "iceroamer",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "iceroamer_temp_ranger",
                characters: [rangerConfig, rangerConfig],
            },
            {
                id: "iceroamer_mage,priest",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                            },
                            type: "iceroamer",
                        }),
                        move: moveStrategy,
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                            },
                            type: "iceroamer",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableCurse: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "int", "attack"],
                            },
                            type: "iceroamer",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_ranger",
                characters: [rangerConfig],
            },
            {
                id: "iceroamer_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            type: "iceroamer",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                            generateEnsureEquipped: {
                                attributes: ["resistance", "str", "attack"],
                            },
                            type: "iceroamer",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}

export function constructIceRoamerHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("iceroamer")

    return {
        configs: [
            {
                id: "iceroamer_helper_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, type: "iceroamer" }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_helper_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableCurse: true,
                            type: "iceroamer",
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_helper_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: "iceroamer" }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_helper_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, type: "iceroamer" }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "iceroamer_helper_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, type: "iceroamer" }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
