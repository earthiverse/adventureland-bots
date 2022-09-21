import { Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, Warrior } from "alclient"
import { Strategist, Strategy } from "../../strategy_pattern/context.js"
import { MageAttackStrategy } from "../../strategy_pattern/strategies/attack_mage.js"
import { PriestAttackStrategy } from "../../strategy_pattern/strategies/attack_priest.js"
import { RangerAttackStrategy } from "../../strategy_pattern/strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../../strategy_pattern/strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../../strategy_pattern/strategies/move.js"
import { constructPlantoidSetup } from "./plantoid.js"

export type MHSetup = {
    setups: {
        id: string
        characters: ({
            character: "mage"
            attack: Strategy<Mage>
            equip?: Strategy<Mage>
            move: Strategy<Mage>
        } | {
            character: "merchant"
            attack: Strategy<Merchant>
            equip?: Strategy<Merchant>
            move: Strategy<Merchant>
        } | {
            character: "paladin"
            attack: Strategy<Paladin>
            equip?: Strategy<Paladin>
            move: Strategy<Paladin>
        } | {
            character: "priest"
            attack: Strategy<Priest>
            equip?: Strategy<Priest>
            move: Strategy<Priest>
        } | {
            character: "ranger"
            attack: Strategy<Ranger>
            equip?: Strategy<Ranger>
            move: Strategy<Ranger>
        } | {
            character: "rogue"
            attack: Strategy<Rogue>
            equip?: Strategy<Rogue>
            move: Strategy<Rogue>
        } | {
            character: "warrior"
            attack: Strategy<Warrior>
            equip?: Strategy<Warrior>
            move: Strategy<Warrior>
        })[]
    }[]
}

export type MHSetups = { [T in MonsterName]?: MHSetup }

export function constructGenericSetup(contexts: Strategist<PingCompensatedCharacter>[], monster: MonsterName): MHSetup {
    return {
        setups: [
            {
                id: "goo_mage",
                characters: [
                    {
                        character: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            },
            {
                id: "goo_priest",
                characters: [
                    {
                        character: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            },
            {
                id: "goo_ranger",
                characters: [
                    {
                        character: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            },
            {
                id: "goo_warrior",
                characters: [
                    {
                        character: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            }
        ]
    }
}

export function constructSquads(contexts: Strategist<PingCompensatedCharacter>[]): MHSetups {
    return {
        goo: constructGenericSetup(contexts, "goo"),
        plantoid: constructPlantoidSetup(contexts)
    }
}