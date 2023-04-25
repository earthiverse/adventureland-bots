import AL, { Attribute, Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, Warrior } from "alclient"
import { Strategist, Strategy } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { constructArmadilloHelperSetup, constructArmadilloSetup } from "./armadillo.js"
import { constructBBPomPomSetup } from "./bbpompom.js"
import { constructBigBirdSetup } from "./bigbird.js"
import { constructBoarSetup } from "./boar.js"
import { constructBooBooSetup } from "./booboo.js"
import { constructBScorpionSetup } from "./bscorpion.js"
import { constructCGooSetup } from "./cgoo.js"
import { constructGigaCrabHelperSetup, constructGigaCrabSetup } from "./crabxx.js"
import { constructCuteBeeHelperSetup, constructCuteBeeSetup } from "./cutebee.js"
import { constructDragoldHelperSetup, constructDragoldSetup } from "./dragold.js"
import { constructEntHelperSetup, constructEntSetup } from "./ent.js"
import { MAGE_NORMAL, MAGE_SPLASH, PRIEST_NORMAL, WARRIOR_NORMAL, WARRIOR_SPLASH } from "./equipment.js"
import { constructFireRoamerSetup } from "./fireroamer.js"
import { constructFrankyHelperSetup, constructFrankySetup } from "./franky.js"
import { constructFrogHelperSetup, constructFrogSetup } from "./frog.js"
import { constructFVampireSetup } from "./fvampire.js"
import { constructGhostSetup } from "./ghost.js"
import { constructGoldenbatSetup } from "./goldenbat.js"
import { constructGreenJrSetup } from "./greenjr.js"
import { constructGrinchHelperSetup, constructGrinchSetup } from "./grinch.js"
import { constructHarpySetup } from "./harpy.js"
import { constructIceGolemHelperSetup, constructIceGolemSetup } from "./icegolem.js"
import { constructJrSetup } from "./jr.js"
import { constructMoleSetup } from "./mole.js"
import { constructMrGreenHelperSetup, constructMrGreenSetup } from "./mrgreen.js"
import { constructMrPumpkinHelperSetup, constructMrPumpkinSetup } from "./mrpumpkin.js"
import { constructMummySetup } from "./mummy.js"
import { constructMVampireSetup } from "./mvampire.js"
import { constructOneEyeSetup } from "./oneeye.js"
import { constructOSnakeHelperSetup, constructOSnakeSetup } from "./osnake.js"
import { constructPhoenixHelperSetup, constructPhoenixSetup } from "./phoenix.js"
import { constructPinkGooHelperSetup, constructPinkGooSetup } from "./pinkgoo.js"
import { constructPlantoidSetup } from "./plantoid.js"
import { constructPorcupineHelperSetup, constructPorcupineSetup } from "./porcupine.js"
import { constructPPPomPomSetup } from "./pppompom.js"
import { constructPRatSetup } from "./prat.js"
import { constructRatSetup } from "./rat.js"
import { constructRGooHelperSetup, constructRGooSetup } from "./rgoo.js"
import { constructRHarpySetup } from "./rharpy.js"
import { constructSkeletorSetup } from "./skeletor.js"
import { constructSnowmanHelperSetup, constructSnowmanSetup } from "./snowman.js"
import { constructSquigToadHelperSetup, constructSquigToadSetup } from "./squigtoad.js"
import { constructStompySetup } from "./stompy.js"
import { constructStoneWormHelperSetup, constructStoneWormSetup } from "./stoneworm.js"
import { constructTigerHelperSetup, constructTigerSetup } from "./tiger.js"
import { constructWabbitHelperSetup, constructWabbitSetup } from "./wabbit.js"
import { constructWolfSetup } from "./wolf.js"
import { constructWolfieSetup } from "./wolfie.js"
import { constructXScorpionSetup } from "./xscorpion.js"
import { constructGooSetup } from "./goo.js"
import { constructMinimushSetup } from "./minimush.js"
import { constructCrabSetup } from "./crab.js"
import { constructBeeSetup } from "./bee.js"
import { constructIceRoamerHelperSetup, constructIceRoamerSetup } from "./iceroamer.js"

export type Requirements = { [T in Attribute]?: number }

export type CharacterConfig = {
    require?: Requirements
} & ({
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
})

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
    const moveStrategy = new ImprovedMoveStrategy(monsters[0])

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
                            ensureEquipped: privateInstance ? (allMagical ? { ...MAGE_SPLASH } : { ...MAGE_NORMAL }) : undefined,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_paladin`,
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
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
                            ensureEquipped: privateInstance ? { ...PRIEST_NORMAL } : undefined,
                            typeList: monsters,
                            enableGreedyAggro: (privateInstance && allMagical) ? true : undefined
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_ranger`,
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_rogue`,
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({ contexts: contexts, typeList: monsters }),
                        move: moveStrategy
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
                            enableEquipForCleave: privateInstance ? true : undefined,
                            enableGreedyAggro: (privateInstance && allPhysical) ? true : undefined,
                            ensureEquipped: privateInstance ? (allPhysical ? { ...WARRIOR_SPLASH } : { ...WARRIOR_NORMAL }) : undefined,
                            typeList: monsters,
                        }),
                        move: moveStrategy
                    }
                ]
            }
        ]
    }
}

export function constructGenericWithPriestSetup(contexts: Strategist<PingCompensatedCharacter>[], monsters: MonsterName[]): Setup {
    const id_prefix = monsters.join("+") + "_w/priest"
    const moveStrategy = new ImprovedMoveStrategy(monsters[0])

    return {
        configs: [
            {
                id: `${id_prefix}_priest,mage`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            targetingPartyMember: true,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_priest,paladin`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            targetingPartyMember: true,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_priest,ranger`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            targetingPartyMember: true,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_priest,rogue`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            targetingPartyMember: true,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    }
                ]
            },
            {
                id: `${id_prefix}_priest,warrior`,
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            typeList: monsters
                        }),
                        move: moveStrategy
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            targetingPartyMember: true,
                            typeList: monsters,
                        }),
                        move: moveStrategy
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
        bat: constructGenericSetup(contexts, ["bat", "goldenbat", "phoenix", "mvampire"], true),
        bbpompom: constructBBPomPomSetup(contexts),
        bee: constructBeeSetup(contexts),
        bgoo: constructRGooSetup(contexts),
        bigbird: constructBigBirdSetup(contexts),
        boar: constructBoarSetup(contexts),
        booboo: constructBooBooSetup(contexts),
        bscorpion: constructBScorpionSetup(contexts),
        cgoo: constructCGooSetup(contexts),
        crab: constructCrabSetup(contexts),
        crabx: constructGenericSetup(contexts, ["crabx", "phoenix"], true),
        crabxx: constructGigaCrabSetup(contexts),
        croc: constructGenericSetup(contexts, ["croc", "phoenix"], true),
        cutebee: constructCuteBeeSetup(contexts),
        dragold: constructDragoldSetup(contexts),
        ent: constructEntSetup(contexts),
        fireroamer: constructFireRoamerSetup(contexts),
        franky: constructFrankySetup(contexts),
        frog: constructFrogSetup(contexts),
        fvampire: constructFVampireSetup(contexts),
        ghost: constructGhostSetup(contexts),
        goldenbat: constructGoldenbatSetup(contexts),
        goo: constructGooSetup(contexts),
        greenjr: constructGreenJrSetup(contexts),
        grinch: constructGrinchSetup(contexts),
        harpy: constructHarpySetup(contexts),
        icegolem: constructIceGolemSetup(contexts),
        iceroamer: constructIceRoamerSetup(contexts),
        jr: constructJrSetup(contexts),
        jrat: constructGenericSetup(contexts, ["jrat"], true),
        minimush: constructMinimushSetup(contexts),
        mole: constructMoleSetup(contexts),
        mrgreen: constructMrGreenSetup(contexts),
        mrpumpkin: constructMrPumpkinSetup(contexts),
        mummy: constructMummySetup(contexts),
        mvampire: constructMVampireSetup(contexts),
        oneeye: constructOneEyeSetup(contexts),
        osnake: constructOSnakeSetup(contexts),
        phoenix: constructPhoenixSetup(contexts),
        pinkgoo: constructPinkGooSetup(contexts),
        plantoid: constructPlantoidSetup(contexts),
        poisio: constructGenericSetup(contexts, ["poisio"], true),
        porcupine: constructPorcupineSetup(contexts),
        pppompom: constructPPPomPomSetup(contexts),
        prat: constructPRatSetup(contexts),
        rat: constructRatSetup(contexts),
        rgoo: constructRGooSetup(contexts),
        rharpy: constructRHarpySetup(contexts),
        scorpion: constructGenericSetup(contexts, ["scorpion", "phoenix"], true),
        skeletor: constructSkeletorSetup(contexts),
        snake: constructOSnakeSetup(contexts),
        snowman: constructSnowmanSetup(contexts),
        spider: constructGenericSetup(contexts, ["spider", "phoenix"], true),
        squig: constructSquigToadSetup(contexts),
        squigtoad: constructSquigToadSetup(contexts),
        stompy: constructStompySetup(contexts),
        stoneworm: constructStoneWormSetup(contexts),
        tiger: constructTigerSetup(contexts),
        // tinyp: constructTinyPSetup(contexts),
        tortoise: constructGenericSetup(contexts, ["tortoise", "frog", "phoenix"], true),
        wabbit: constructWabbitSetup(contexts),
        wolf: constructWolfSetup(contexts),
        wolfie: constructWolfieSetup(contexts),
        xscorpion: constructXScorpionSetup(contexts),
    }
}

export function constructHelperSetups(contexts: Strategist<PingCompensatedCharacter>[]): Setups {
    return {
        arcticbee: constructGenericSetup(contexts, ["arcticbee", "snowman"]),
        armadillo: constructArmadilloHelperSetup(contexts),
        bat: constructGenericSetup(contexts, ["bat"]),
        bbpompom: constructGenericWithPriestSetup(contexts, ["bbpompom"]),
        bee: constructGenericSetup(contexts, ["bee"]),
        bgoo: constructGenericSetup(contexts, ["rgoo", "bgoo"]),
        boar: constructGenericWithPriestSetup(contexts, ["boar"]),
        crab: constructGenericSetup(contexts, ["crab", "phoenix"]),
        crabx: constructGenericSetup(contexts, ["crabx", "phoenix"]),
        crabxx: constructGigaCrabHelperSetup(contexts),
        croc: constructGenericSetup(contexts, ["croc"]),
        cutebee: constructCuteBeeHelperSetup(contexts),
        dragold: constructDragoldHelperSetup(contexts),
        ent: constructEntHelperSetup(contexts),
        franky: constructFrankyHelperSetup(contexts),
        frog: constructFrogHelperSetup(contexts),
        goo: constructGenericSetup(contexts, ["goo"]),
        greenjr: constructGenericWithPriestSetup(contexts, ["greenjr", "osnake", "snake"]),
        grinch: constructGrinchHelperSetup(contexts),
        icegolem: constructIceGolemHelperSetup(contexts),
        iceroamer: constructIceRoamerHelperSetup(contexts),
        jr: constructGenericWithPriestSetup(contexts, ["jr"]),
        jrat: constructGenericSetup(contexts, ["jrat"]),
        minimush: constructGenericSetup(contexts, ["minimush", "phoenix", "tinyp"]),
        mrgreen: constructMrGreenHelperSetup(contexts),
        mrpumpkin: constructMrPumpkinHelperSetup(contexts),
        osnake: constructOSnakeHelperSetup(contexts),
        phoenix: constructPhoenixHelperSetup(contexts),
        pinkgoo: constructPinkGooHelperSetup(contexts),
        poisio: constructGenericSetup(contexts, ["poisio"]),
        porcupine: constructPorcupineHelperSetup(contexts),
        rat: constructGenericSetup(contexts, ["rat"]),
        rgoo: constructRGooHelperSetup(contexts),
        scorpion: constructGenericSetup(contexts, ["scorpion"]),
        snake: constructOSnakeHelperSetup(contexts),
        snowman: constructSnowmanHelperSetup(contexts),
        spider: constructGenericSetup(contexts, ["spider"]),
        squig: constructSquigToadHelperSetup(contexts),
        squigtoad: constructSquigToadHelperSetup(contexts),
        stoneworm: constructStoneWormHelperSetup(contexts),
        tiger: constructTigerHelperSetup(contexts),
        tortoise: constructGenericSetup(contexts, ["tortoise", "frog", "phoenix"]),
        wabbit: constructWabbitHelperSetup(contexts),
        wolfie: constructGenericWithPriestSetup(contexts, ["wolfie"]),
    }
}