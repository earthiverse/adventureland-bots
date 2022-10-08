import { PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"

export function constructSquigToadSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "squigtoad_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: ["squigtoad", "squig"] }),
                        move: new ImprovedMoveStrategy(["squigtoad", "squig"])
                    }
                ]
            },
            {
                id: "squigtoad_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: ["squigtoad", "squig"] }),
                        move: new ImprovedMoveStrategy(["squigtoad", "squig"])
                    }
                ]
            },
            {
                id: "squigtoad_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: ["squigtoad", "squig"] }),
                        move: new ImprovedMoveStrategy(["squigtoad", "squig"])
                    }
                ]
            },
            {
                id: "squigtoad_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, typeList: ["squigtoad", "squig"] }),
                        move: new ImprovedMoveStrategy(["squigtoad", "squig"])
                    }
                ]
            }
        ]
    }
}