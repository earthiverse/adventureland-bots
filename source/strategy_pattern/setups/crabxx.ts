import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_ARMOR } from "./equipment.js"

export function constructGigaCrabSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy(["crabx", "crabxx"])

    return {
        configs: [
            {
                id: "crabxx_mage,priest,warrior",
                characters: [
                    // The mage will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            ensureEquipped: {
                                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    },
                    // The priest will tank the giga crab
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "crabxx",
                        }),
                        move: new ImprovedMoveStrategy("crabxx")
                    },
                    // The warrior will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "bataxe", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_ranger,priest,warrior",
                characters: [
                    // The ranger will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            disableEnergize: true,
                            ensureEquipped: {
                                mainhand: { name: "crossbow", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    },
                    // The priest will tank the giga crab
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "crabxx",
                        }),
                        move: new ImprovedMoveStrategy("crabxx")
                    },
                    // The warrior will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "bataxe", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: "crabxx_priest,warrior",
                characters: [
                    // The priest will tank the giga crab
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "crabxx",
                        }),
                        move: new ImprovedMoveStrategy("crabxx")
                    },
                    // The warrior will prioritize crabx so that the giga crab can take damage
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableCreditCheck: true, // Giga crab will only take 1 damage while any crabx are alive, so help kill others', too
                            enableEquipForCleave: true,
                            ensureEquipped: {
                                mainhand: { name: "bataxe", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            typeList: ["crabx", "crabxx"]
                        }),
                        move: moveStrategy
                    }
                ]
            },
        ]
    }
}