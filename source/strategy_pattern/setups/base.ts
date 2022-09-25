import { Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, Warrior } from "alclient"
import { Strategist, Strategy } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { constructPlantoidSetup } from "./plantoid.js"
import { constructPorcupineSetup } from "./porcupine.js"

export type CharacterConfig = {
    ctype: "mage"
    attack: Strategy<Mage>
    move: Strategy<Mage>
} | {
    ctype: "merchant"
    attack: Strategy<Merchant>
    move: Strategy<Merchant>
} | {
    ctype: "paladin"
    attack: Strategy<Paladin>
    move: Strategy<Paladin>
} | {
    ctype: "priest"
    attack: Strategy<Priest>
    move: Strategy<Priest>
} | {
    ctype: "ranger"
    attack: Strategy<Ranger>
    move: Strategy<Ranger>
} | {
    ctype: "rogue"
    attack: Strategy<Rogue>
    move: Strategy<Rogue>
} | {
    ctype: "warrior"
    attack: Strategy<Warrior>
    move: Strategy<Warrior>
}

export type Config = {
    id: string
    characters: CharacterConfig[]
}

export type Setup = {
    configs: Config[]
}

export type Setups = { [T in MonsterName]?: Setup }

export function constructGenericSetup(contexts: Strategist<PingCompensatedCharacter>[], monster: MonsterName): Setup {
    return {
        configs: [
            {
                id: "goo_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            },
            {
                id: "goo_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            },
            {
                id: "goo_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            },
            {
                id: "goo_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, type: monster }),
                        move: new ImprovedMoveStrategy(monster)
                    }
                ]
            }
        ]
    }
}

export function constructSetups(contexts: Strategist<PingCompensatedCharacter>[]): Setups {
    return {
        arcticbee: constructGenericSetup(contexts, "arcticbee"),
        armadillo: constructGenericSetup(contexts, "armadillo"),
        crab: constructGenericSetup(contexts, "armadillo"),
        crabx: constructGenericSetup(contexts, "crabx"),
        croc: constructGenericSetup(contexts, "croc"),
        goo: constructGenericSetup(contexts, "goo"),
        plantoid: constructPlantoidSetup(contexts),
        poisio: constructGenericSetup(contexts, "poisio"),
        porcupine: constructPorcupineSetup(contexts),
        spider: constructGenericSetup(contexts, "spider"),
        tortoise: constructGenericSetup(contexts, "tortoise"),
    }
}