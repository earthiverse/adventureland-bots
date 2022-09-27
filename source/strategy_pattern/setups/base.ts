import { CharacterType, Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, Warrior } from "alclient"
import { Strategist, Strategy } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { constructArmadilloSetup } from "./armadillo.js"
import { constructGigaCrabSetup } from "./crabxxx.js"
import { constructOSnakeSetup } from "./osnake.js"
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

export function constructGenericSetup(contexts: Strategist<PingCompensatedCharacter>[], monsters: MonsterName[]): Setup {
    const id_prefix = monsters.join("+")
    return {
        configs: [
            {
                id: `${id_prefix}_mage`,
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters)
                    }
                ]
            },
            {
                id: `${id_prefix}_priest`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters)
                    }
                ]
            },
            {
                id: `${id_prefix}_ranger`,
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters)
                    }
                ]
            },
            {
                id: `${id_prefix}_warrior`,
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters)
                    }
                ]
            }
        ]
    }
}

export function constructSetups(contexts: Strategist<PingCompensatedCharacter>[]): Setups {
    return {
        arcticbee: constructGenericSetup(contexts, ["arcticbee"]),
        armadillo: constructArmadilloSetup(contexts),
        cgoo: constructGenericSetup(contexts, ["cgoo"]),
        crab: constructGenericSetup(contexts, ["crab"]),
        crabx: constructGenericSetup(contexts, ["crabx"]),
        crabxx: constructGigaCrabSetup(contexts),
        croc: constructGenericSetup(contexts, ["croc"]),
        frog: constructGenericSetup(contexts, ["frog"]),
        goo: constructGenericSetup(contexts, ["goo"]),
        osnake: constructOSnakeSetup(contexts),
        plantoid: constructPlantoidSetup(contexts),
        poisio: constructGenericSetup(contexts, ["poisio"]),
        porcupine: constructPorcupineSetup(contexts),
        scorpion: constructGenericSetup(contexts, ["scorpion"]),
        snake: constructGenericSetup(contexts, ["snake", "osnake"]),
        spider: constructGenericSetup(contexts, ["spider"]),
        tortoise: constructGenericSetup(contexts, ["tortoise"]),
    }
}