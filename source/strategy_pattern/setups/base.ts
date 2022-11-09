import AL, { Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, Warrior } from "alclient"
import { Strategist, Strategy } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { constructArmadilloSetup } from "./armadillo.js"
import { constructBBPomPomSetup } from "./bbpompom.js"
import { constructBigBirdSetup } from "./bigbird.js"
import { constructBoarSetup } from "./boar.js"
import { constructBooBooSetup } from "./booboo.js"
import { constructBScorpionSetup } from "./bscorpion.js"
import { constructGigaCrabSetup } from "./crabxx.js"
import { MAGE_NORMAL, WARRIOR_NORMAL, WARRIOR_SPLASH } from "./equipment.js"
import { constructFireRoamerSetup } from "./fireroamer.js"
import { constructFrankySetup } from "./franky.js"
import { constructFrogSetup } from "./frog.js"
import { constructFVampireSetup } from "./fvampire.js"
import { constructGhostSetup } from "./ghost.js"
import { constructGoldenbatSetup } from "./goldenbat.js"
import { constructGreenJrSetup } from "./greenjr.js"
import { constructHarpySetup } from "./harpy.js"
import { constructJrSetup } from "./jr.js"
import { constructMoleSetup } from "./mole.js"
import { constructMrGreenHelperSetup, constructMrGreenSetup } from "./mrgreen.js"
import { constructMrPumpkinHelperSetup, constructMrPumpkinSetup } from "./mrpumpkin.js"
import { constructMummySetup } from "./mummy.js"
import { constructMVampireSetup } from "./mvampire.js"
import { constructOSnakeSetup } from "./osnake.js"
import { constructPlantoidSetup } from "./plantoid.js"
import { constructPorcupineSetup } from "./porcupine.js"
import { constructPPPomPomSetup } from "./pppompom.js"
import { constructPRatSetup } from "./prat.js"
import { constructRGooSetup } from "./rgoo.js"
import { constructRHarpySetup } from "./rharpy.js"
import { constructSquigToadSetup } from "./squigtoad.js"
import { constructStoneWormSetup } from "./stoneworm.js"
import { constructTinyPSetup } from "./tinyp.js"
import { constructWolfSetup } from "./wolf.js"
import { constructWolfieSetup } from "./wolfie.js"
import { constructXScorpionSetup } from "./xscorpion.js"

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

export function constructGenericSetup(contexts: Strategist<PingCompensatedCharacter>[], monsters: MonsterName[], privateInstance = false): Setup {
    const id_prefix = monsters.join("+")
    const spawn = AL.Pathfinder.locateMonster(monsters[0])[0]

    let allMagical = true
    let allPhysical = true
    for (const monster of monsters) {
        if (AL.Constants.ONE_SPAWN_MONSTERS.includes(monster)) continue // There will only be one of this monster, that's okay
        const gInfo = AL.Game.G.monsters[monster]
        if (gInfo.damage_type == "pure") {
            allMagical = undefined
            allPhysical = undefined
            break
        } else if (gInfo.damage_type == "physical") {
            allMagical = undefined
        } else if (gInfo.damage_type == "magical") {
            allPhysical = undefined
        }
    }

    return {
        configs: [
            {
                id: `${id_prefix}_mage`,
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: privateInstance ? { ...MAGE_NORMAL } : undefined,
                            typeList: monsters
                        }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: spawn })
                    }
                ]
            },
            {
                id: `${id_prefix}_paladin`,
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: spawn })
                    }
                ]
            },
            {
                id: `${id_prefix}_priest`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: monsters,
                            enableGreedyAggro: (privateInstance && allMagical) ? true : undefined
                        }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: spawn })
                    }
                ]
            },
            {
                id: `${id_prefix}_ranger`,
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: spawn })
                    }
                ]
            },
            {
                id: `${id_prefix}_rogue`,
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: spawn })
                    }
                ]
            },
            {
                id: `${id_prefix}_warrior`,
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            typeList: monsters,
                            enableEquipForCleave: true,
                            enableGreedyAggro: (privateInstance && allPhysical) ? true : undefined,
                            ensureEquipped: privateInstance ? (allPhysical ? { ...WARRIOR_SPLASH } : { ...WARRIOR_NORMAL }) : undefined,
                        }),
                        move: new ImprovedMoveStrategy(monsters, { idlePosition: spawn })
                    }
                ]
            }
        ]
    }
}

export function constructSetups(contexts: Strategist<PingCompensatedCharacter>[]): Setups {
    return {
        arcticbee: constructGenericSetup(contexts, ["arcticbee", "snowman"], true),
        armadillo: constructArmadilloSetup(contexts),
        bbpompom: constructBBPomPomSetup(contexts),
        bat: constructGenericSetup(contexts, ["goldenbat", "bat"], true),
        bee: constructGenericSetup(contexts, ["bee"], true),
        bgoo: constructRGooSetup(contexts),
        bigbird: constructBigBirdSetup(contexts),
        boar: constructBoarSetup(contexts),
        booboo: constructBooBooSetup(contexts),
        bscorpion: constructBScorpionSetup(contexts),
        cgoo: constructGenericSetup(contexts, ["cgoo"], true),
        crab: constructGenericSetup(contexts, ["crab", "phoenix"], true),
        crabx: constructGenericSetup(contexts, ["crabx"], true),
        crabxx: constructGigaCrabSetup(contexts),
        croc: constructGenericSetup(contexts, ["croc", "phoenix"], true),
        fireroamer: constructFireRoamerSetup(contexts),
        franky: constructFrankySetup(contexts),
        frog: constructFrogSetup(contexts),
        fvampire: constructFVampireSetup(contexts),
        ghost: constructGhostSetup(contexts),
        goldenbat: constructGoldenbatSetup(contexts),
        goo: constructGenericSetup(contexts, ["goo"], true),
        greenjr: constructGreenJrSetup(contexts),
        // harpy: constructHarpySetup(contexts),
        iceroamer: constructGenericSetup(contexts, ["iceroamer"], true),
        jr: constructJrSetup(contexts),
        minimush: constructGenericSetup(contexts, ["minimush", "phoenix", "tinyp"], true),
        mole: constructMoleSetup(contexts),
        mrgreen: constructMrGreenSetup(contexts),
        mrpumpkin: constructMrPumpkinSetup(contexts),
        mummy: constructMummySetup(contexts),
        mvampire: constructMVampireSetup(contexts),
        osnake: constructOSnakeSetup(contexts),
        plantoid: constructPlantoidSetup(contexts),
        poisio: constructGenericSetup(contexts, ["poisio"], true),
        porcupine: constructPorcupineSetup(contexts),
        pppompom: constructPPPomPomSetup(contexts),
        prat: constructPRatSetup(contexts),
        rat: constructGenericSetup(contexts, ["rat"], true),
        rgoo: constructRGooSetup(contexts),
        // rharpy: constructRHarpySetup(contexts),
        scorpion: constructGenericSetup(contexts, ["scorpion"], true),
        snake: constructGenericSetup(contexts, ["snake", "osnake", "tinyp"], true),
        snowman: constructGenericSetup(contexts, ["snowman", "arcticbee"], true),
        spider: constructGenericSetup(contexts, ["spider"], true),
        squig: constructSquigToadSetup(contexts),
        squigtoad: constructSquigToadSetup(contexts),
        stoneworm: constructStoneWormSetup(contexts),
        tinyp: constructTinyPSetup(contexts),
        tortoise: constructGenericSetup(contexts, ["tortoise", "frog", "phoenix"], true),
        wolf: constructWolfSetup(contexts),
        wolfie: constructWolfieSetup(contexts),
        xscorpion: constructXScorpionSetup(contexts),
    }
}

export function constructHelperSetups(contexts: Strategist<PingCompensatedCharacter>[]): Setups {
    return {
        bee: constructGenericSetup(contexts, ["bee"]),
        crab: constructGenericSetup(contexts, ["phoenix", "crab"]),
        crabx: constructGenericSetup(contexts, ["crabx"]),
        croc: constructGenericSetup(contexts, ["croc"]),
        goo: constructGenericSetup(contexts, ["goo"]),
        mrgreen: constructMrGreenHelperSetup(contexts),
        mrpumpkin: constructMrPumpkinHelperSetup(contexts),
        poisio: constructGenericSetup(contexts, ["poisio"]),
        scorpion: constructGenericSetup(contexts, ["scorpion"]),
        snake: constructGenericSetup(contexts, ["snake", "osnake"]),
        spider: constructGenericSetup(contexts, ["spider"]),
        squig: constructSquigToadSetup(contexts),
        squigtoad: constructSquigToadSetup(contexts),
    }
}