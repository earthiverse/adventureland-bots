import AL, { Merchant, Priest, Warrior, GMap, ServerInfoDataLive, IPosition, Mage, Pathfinder } from "alclient"
import { goToAggroMonster, goToNearestWalkableToMonster, goToPriestIfHurt, goToSpecialMonster, kiteInCircle, requestMagiportService, sleep, startTrackerLoop } from "../base/general.js"
import { attackTheseTypesMage, magiportFriendsIfNotNearby } from "../base/mage.js"
import { attackTheseTypesMerchant } from "../base/merchant.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { attackTheseTypesPriest } from "../base/priest.js"
import { getTargetServerFromMonsters } from "../base/serverhop.js"
import { attackTheseTypesWarrior } from "../base/warrior.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startMage, startMerchant, startPriest, startWarrior } from "./shared.js"

let TARGET_REGION = DEFAULT_REGION
let TARGET_IDENTIFIER = DEFAULT_IDENTIFIER

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "earthPri",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "earthMag",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "earthWar",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "earthMer",
        nameAlt: "earthMer2",
        target: undefined
    }
}

function prepareMerchant(bot: Merchant) {
    const chickenCoop = Pathfinder.locateMonster("hen")[0]
    const goos = Pathfinder.locateMonster("goo")[0]
    const strategy: Strategy = {
        goo: {
            attack: async () => { await attackTheseTypesMerchant(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "dartgun", offhand: "wbook1" },
            move: async () => { await bot.smartMove(goos) }
        },
        hen: {
            attack: async () => { await attackTheseTypesMerchant(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "dartgun", offhand: "wbook1" },
            move: async () => { await bot.smartMove(chickenCoop) }
        },
        rooster: {
            attack: async () => { await attackTheseTypesMerchant(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "dartgun", offhand: "wbook1" },
            move: async () => { await bot.smartMove(chickenCoop) }
        },
        snowman: {
            attack: async () => { await attackTheseTypesMerchant(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "dartgun", offhand: "wbook1" },
            move: async () => { await goToSpecialMonster(bot, "snowman") }
        }
    }
    startMerchant(bot, information, strategy, { map: "main", x: 0, y: 0 }, partyLeader, partyMembers)
}

function preparePriest(bot: Priest) {
    const bscorpionSpawn = Pathfinder.locateMonster("bscorpion")[0]
    const strategy: Strategy = {
        defaultTarget: "spider",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesPriest(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1102, y: -873 }) },
        },
        armadillo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["armadillo", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "pmace", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 546, y: 1846 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "cave", x: 324, y: -1107 }) },
        },
        bbpompom: {
            attack: async () => { await attackTheseTypesPriest(bot, ["bbpompom"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winter_cave", x: 71, y: -164 }) },
        },
        bee: {
            attack: async () => { await attackTheseTypesPriest(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 152, y: 1487 }) },
        },
        bigbird: {
            attack: async () => { await attackTheseTypesPriest(bot, ["bigbird"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 1363, y: 248 }) },
        },
        boar: {
            attack: async () => { await attackTheseTypesPriest(bot, ["boar"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 40, y: -1109 }) },
        },
        booboo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["booboo"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 265, y: -605 }) },
        },
        bscorpion: {
            attack: async () => {
                // Get the bscorpion to target us if it's attacking a friend
                const bscorpion = bot.getEntity({ returnNearest: true, type: "bscorpion" })
                if (!bscorpion) return
                if (bscorpion.target && bscorpion.target !== bot.id && bscorpion.couldGiveCreditForKill(bot)) {
                    await bot.absorbSins(bscorpion.target)
                }

                if (bscorpion && bscorpion.target == bot.id && bscorpion.hp < 50000) {
                    // Equip items that have more luck
                    if (bot.slots.mainhand?.name !== "lmace" && bot.hasItem("lmace")) await bot.equip(bot.locateItem("lmace"))
                    if (bot.slots.orb?.name !== "rabbitsfoot" && bot.hasItem("rabbitsfoot")) await bot.equip(bot.locateItem("rabbitsfoot"))
                    if (bot.slots.offhand?.name !== "mshield" && bot.hasItem("mshield")) await bot.equip(bot.locateItem("mshield"))
                    if (bot.slots.shoes?.name !== "wshoes" && bot.hasItem("wshoes")) await bot.equip(bot.locateItem("wshoes"))
                } else {
                    // Equip items that do more damage
                    if (bot.slots.mainhand?.name !== "firestaff" && bot.hasItem("firestaff")) await bot.equip(bot.locateItem("firestaff"))
                    if (bot.slots.orb?.name !== "orbofint" && bot.hasItem("orbofint")) await bot.equip(bot.locateItem("orbofint"))
                    if (bot.slots.offhand?.name !== "wbook1" && bot.hasItem("wbook1")) await bot.equip(bot.locateItem("wbook1"))
                    if (bot.slots.shoes?.name !== "wingedboots" && bot.hasItem("wingedboots")) await bot.equip(bot.locateItem("wingedboots"))
                }

                await attackTheseTypesPriest(bot, ["bscorpion"], information.friends)
            },
            equipment: { /** We have custom equipment in the attack loop above */ },
            move: async () => { await kiteInCircle(bot, "bscorpion", bscorpionSpawn) }
        },
        cgoo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["cgoo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["cgoo"], { map: "arena", x: 650, y: -500 }) },
        },
        crab: {
            attack: async () => { await attackTheseTypesPriest(bot, ["crab", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -1182, y: -66 }) },
        },
        crabx: {
            attack: async () => { await attackTheseTypesPriest(bot, ["crabx", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -964, y: 1762 }) },
        },
        croc: {
            attack: async () => { await attackTheseTypesPriest(bot, ["croc", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 821, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { await attackTheseTypesPriest(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => {
                const nearby = bot.getEntity({ returnNearest: true, type: "cutebee" })
                if (nearby) {
                    if (!nearby.target) {
                        // The cutebee will avoid 99.9% of our attacks, so let's try to walk in front of it so that we can aggro it
                        await goToAggroMonster(bot, nearby)
                    } else {
                        await goToNearestWalkableToMonster(bot, ["cutebee"])
                    }
                } else {
                    await goToSpecialMonster(bot, "cutebee")
                }
            }
        },
        dragold: {
            attack: async () => { await attackTheseTypesPriest(bot, ["dragold"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "dragold") },
        },
        fireroamer: {
            attack: async () => { await attackTheseTypesPriest(bot, ["fireroamer"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "lantern", orb: "test_orb" },
            move: async () => { await bot.smartMove({ map: "desertland", x: 180, y: -675 }) },
        },
        franky: {
            attack: async () => { await attackTheseTypesPriest(bot, ["nerfedmummy", "franky"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "franky" })
                if (nearest && AL.Tools.distance(bot, nearest) > 25) {
                    // Move close to Franky because other characters might help blast away mummies
                    await bot.smartMove(nearest, { getWithin: 25 })
                } else {
                    if (bot.S.franky as ServerInfoDataLive) requestMagiportService(bot, bot.S.franky as IPosition)
                    await goToSpecialMonster(bot, "franky")
                }
            }
        },
        frog: {
            attack: async () => { await attackTheseTypesPriest(bot, ["frog"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["frog"], { map: "main", x: -1124, y: 1118 }) },
        },
        fvampire: {
            attack: async () => { await attackTheseTypesPriest(bot, ["fvampire"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "fvampire") },
        },
        ghost: {
            attack: async () => { await attackTheseTypesPriest(bot, ["ghost"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 276, y: -1224 }) },
        },
        goldenbat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -12, y: 787 }) },
        },
        greenjr: {
            attack: async () => { await attackTheseTypesPriest(bot, ["greenjr", "snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "greenjr") },
        },
        hen: {
            attack: async () => { await attackTheseTypesPriest(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -41.5, y: -282 }) },
        },
        icegolem: {
            attack: async () => { await attackTheseTypesPriest(bot, ["icegolem"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => {
                const iceGolem = bot.getEntity({ returnNearest: true, type: "icegolem" })
                if (!iceGolem) {
                    if (bot.S.icegolem as ServerInfoDataLive) requestMagiportService(bot, bot.S.icegolem as IPosition)
                    await bot.smartMove({ map: "winterland", x: 783, y: 277 })
                }
                if (iceGolem && !AL.Pathfinder.canWalkPath(bot, iceGolem)) {
                    // Cheat and walk across the water.
                    await bot.move(iceGolem.x, iceGolem.y, { disableSafetyCheck: true })
                } else if (iceGolem) {
                    await goToNearestWalkableToMonster(bot, ["icegolem"])
                }
            },
        },
        iceroamer: {
            attack: async () => { await attackTheseTypesPriest(bot, ["iceroamer"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1492, y: 104 }) },
        },
        jr: {
            attack: async () => { await attackTheseTypesPriest(bot, ["jr"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "jr") },
        },
        minimush: {
            attack: async () => { await attackTheseTypesPriest(bot, ["minimush", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 28, y: 631 }) },
        },
        mole: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mole"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "tunnel", x: -35, y: -329 }) },
        },
        mrgreen: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mrgreen"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => {
                if (bot.S.mrgreen as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrgreen as IPosition)
                await goToSpecialMonster(bot, "mrgreen")
            },
        },
        mrpumpkin: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mrpumpkin"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => {
                if (bot.S.mrpumpkin as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrpumpkin as IPosition)
                await goToSpecialMonster(bot, "mrpumpkin")
            },
        },
        mummy: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mummy"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 270, y: -1129 }) },
        },
        mvampire: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mvampire", "bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "mvampire") },
        },
        nerfedmummy: {
            attack: async () => { await attackTheseTypesPriest(bot, ["nerfedmummy"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "franky") },
        },
        oneeye: {
            attack: async () => { await attackTheseTypesPriest(bot, ["oneeye"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level2w", x: -155, y: 0 }) },
        },
        osnake: {
            attack: async () => { await attackTheseTypesPriest(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: -488, y: -708 }) },
        },
        phoenix: {
            attack: async () => { await attackTheseTypesPriest(bot, ["phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "phoenix") },
        },
        plantoid: {
            attack: async () => { await attackTheseTypesPriest(bot, ["plantoid"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -730, y: -125 }) },
        },
        poisio: {
            attack: async () => { await attackTheseTypesPriest(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -101, y: 1360 }) },
        },
        porcupine: {
            attack: async () => { await attackTheseTypesPriest(bot, ["porcupine"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -809, y: 135 }) },
        },
        pppompom: {
            attack: async () => { await attackTheseTypesPriest(bot, ["pppompom"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", offhand: "lantern", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level2n", x: 120, y: -130 }) },
            requireCtype: "warrior"
        },
        prat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["prat"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level1", x: -296, y: 557 }) },
        },
        rat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "mansion", x: -224, y: -313 }) },
        },
        rooster: {
            attack: async () => { await attackTheseTypesPriest(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -41.5, y: -282 }) },
        },
        scorpion: {
            attack: async () => { await attackTheseTypesPriest(bot, ["scorpion", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 1598, y: -168 }) },
        },
        skeletor: {
            attack: async () => { await attackTheseTypesPriest(bot, ["skeletor", "cgoo"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["skeletor"], { map: "arena", x: 400, y: -575 }) },
        },
        snake: {
            attack: async () => { await attackTheseTypesPriest(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -62, y: 1901 }) },
        },
        snowman: {
            attack: async () => { await attackTheseTypesPriest(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "snowman") },
        },
        spider: {
            attack: async () => { await attackTheseTypesPriest(bot, ["spider", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 968, y: -144 }) },
        },
        squig: {
            attack: async () => { await attackTheseTypesPriest(bot, ["squig", "squigtoad", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -1155, y: 422 }) },
        },
        squigtoad: {
            attack: async () => { await attackTheseTypesPriest(bot, ["squigtoad", "squig", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -1155, y: 422 }) },
        },
        stompy: {
            attack: async () => { await attackTheseTypesPriest(bot, ["stompy"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "stompy") }
        },
        stoneworm: {
            attack: async () => { await attackTheseTypesPriest(bot, ["stoneworm"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 697, y: 129 }) },
        },
        // tinyp: {
        //     attack: async () => { await attackTheseTypesPriest(bot, ["tinyp"], information.friends, { targetingPartyMember: true }) },
        //     equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
        //     move: async () => { await goToSpecialMonster(bot, "tinyp") },
        // },
        tortoise: {
            attack: async () => { await attackTheseTypesPriest(bot, ["tortoise", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1104, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { await attackTheseTypesPriest(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "wabbit") },
        },
        wolf: {
            attack: async () => { await attackTheseTypesPriest(bot, ["wolf"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 420, y: -2525 }) },
        },
        wolfie: {
            attack: async () => { await attackTheseTypesPriest(bot, ["wolfie"], information.friends) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["wolfie"], { map: "winterland", x: -149, y: -2026 }) },
        },
        xscorpion: {
            attack: async () => { await attackTheseTypesPriest(bot, ["xscorpion"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", offhand: "wbook1", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: -325, y: 725 }) },
        }
    }
    startPriest(bot, information, strategy, partyLeader, partyMembers)
}

function prepareMage(bot: Mage) {
    const bscorpionSpawn = Pathfinder.locateMonster("bscorpion")[0]
    const strategy: Strategy = {
        defaultTarget: "spider",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesMage(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1082, y: -873 }, { useBlink: true }) },
        },
        armadillo: {
            attack: async () => { await attackTheseTypesMage(bot, ["armadillo", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 526, y: 1846 }, { useBlink: true }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesMage(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "cave", x: -194, y: -461 }, { useBlink: true }) },
        },
        bbpompom: {
            attack: async () => { await attackTheseTypesMage(bot, ["bbpompom"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winter_cave", x: 51, y: -164 }, { useBlink: true }) },
        },
        bee: {
            attack: async () => { await attackTheseTypesMage(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 494, y: 1101 }, { useBlink: true }) },
        },
        bigbird: {
            attack: async () => { await attackTheseTypesMage(bot, ["bigbird"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 1343, y: 248 }, { useBlink: true }) },
        },
        boar: {
            attack: async () => { await attackTheseTypesMage(bot, ["boar"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 20, y: -1109 }, { useBlink: true }) },
        },
        booboo: {
            attack: async () => { await attackTheseTypesMage(bot, ["booboo"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 265, y: -645 }, { useBlink: true }) },
        },
        bscorpion: {
            attack: async () => { return attackTheseTypesMage(bot, ["bscorpion"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await kiteInCircle(bot, "bscorpion", bscorpionSpawn) },
            requireCtype: "priest"
        },
        cgoo: {
            attack: async () => { return attackTheseTypesMage(bot, ["cgoo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["cgoo"], { map: "arena", x: 0, y: -500 }) },
        },
        crab: {
            attack: async () => { return attackTheseTypesMage(bot, ["crab", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -1202, y: -66 }, { useBlink: true }) },
        },
        crabx: {
            attack: async () => { return attackTheseTypesMage(bot, ["crabx", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1202, y: -66 }) },
        },
        croc: {
            attack: async () => { return attackTheseTypesMage(bot, ["croc", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 801, y: 1710 }, { useBlink: true }) },
        },
        cutebee: {
            attack: async () => { return attackTheseTypesMage(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => {
                const nearby = bot.getEntity({ returnNearest: true, type: "cutebee" })
                if (nearby) {
                    if (!nearby.target) {
                        // The cutebee will avoid 99.9% of our attacks, so let's try to walk in front of it so that we can aggro it
                        await goToAggroMonster(bot, nearby)
                    } else {
                        await goToNearestWalkableToMonster(bot, ["cutebee"])
                    }
                } else {
                    await goToSpecialMonster(bot, "cutebee")
                }
                const entities = bot.getEntities({ type: "cutebee", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            }
        },
        dragold: {
            attack: async () => { return attackTheseTypesMage(bot, ["dragold"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "dragold")
                const entities = bot.getEntities({ type: "dragold", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
            requireCtype: "priest"
        },
        fireroamer: {
            attack: async () => { return attackTheseTypesMage(bot, ["fireroamer"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: 160, y: -675 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        franky: {
            attack: async () => { return attackTheseTypesMage(bot, ["nerfedmummy", "franky"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "franky" })
                if (nearest && AL.Tools.distance(bot, nearest) > 25) {
                    // Move close to Franky because other characters might help blast away mummies
                    await bot.smartMove(nearest, { getWithin: 25 })
                } else {
                    if (bot.S.franky as ServerInfoDataLive) requestMagiportService(bot, bot.S.franky as IPosition)
                    await goToSpecialMonster(bot, "franky")
                    const entities = bot.getEntities({ type: "franky", withinRange: bot.range })
                    if (entities.length) magiportFriendsIfNotNearby(bot, information)
                }
            },
            requireCtype: "priest"
        },
        fvampire: {
            attack: async () => { return attackTheseTypesMage(bot, ["fvampire", "ghost"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "fvampire")
                const entities = bot.getEntities({ type: "fvampire", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
            requireCtype: "priest"
        },
        ghost: {
            attack: async () => { return attackTheseTypesMage(bot, ["ghost"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 256, y: -1224 }, { useBlink: true }) }
        },
        goldenbat: {
            attack: async () => { return attackTheseTypesMage(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { return attackTheseTypesMage(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -32, y: 787 }, { useBlink: true }) },
        },
        greenjr: {
            attack: async () => { return attackTheseTypesMage(bot, ["greenjr", "snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await bot.smartMove("greenjr")
                const entities = bot.getEntities({ type: "greenjr", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
        },
        hen: {
            attack: async () => { return attackTheseTypesMage(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -61.5, y: -282 }, { useBlink: true }) },
        },
        icegolem: {
            attack: async () => { return attackTheseTypesMage(bot, ["icegolem"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                const iceGolem = bot.getEntity({ returnNearest: true, type: "icegolem" })
                if (!iceGolem) {
                    if (bot.S.icegolem as ServerInfoDataLive) requestMagiportService(bot, bot.S.icegolem as IPosition)
                    await bot.smartMove({ map: "winterland", x: 783, y: 277 }, { useBlink: true })
                    const entities = bot.getEntities({ type: "icegolem", withinRange: bot.range })
                    if (entities.length) magiportFriendsIfNotNearby(bot, information)
                }
                if (iceGolem && !AL.Pathfinder.canWalkPath(bot, iceGolem)) {
                    // Cheat and walk across the water.
                    await bot.move(iceGolem.x, iceGolem.y, { disableSafetyCheck: true })
                } else if (iceGolem) {
                    await goToNearestWalkableToMonster(bot, ["icegolem"])
                }
            },
        },
        iceroamer: {
            attack: async () => { return attackTheseTypesMage(bot, ["iceroamer"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1512, y: 104 }, { useBlink: true }) },
        },
        jr: {
            attack: async () => { return attackTheseTypesMage(bot, ["jr"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "jr")
                const entities = bot.getEntities({ type: "jr", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
        },
        minimush: {
            attack: async () => { return attackTheseTypesMage(bot, ["minimush", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: 8, y: 631 }, { useBlink: true }) },
        },
        mole: {
            attack: async () => { return attackTheseTypesMage(bot, ["mole"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "tunnel", x: -15, y: -329 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        mrgreen: {
            attack: async () => { return attackTheseTypesMage(bot, ["mrgreen"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                if (bot.S.mrgreen as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrgreen as IPosition)
                await goToSpecialMonster(bot, "mrgreen")
                const entities = bot.getEntities({ type: "mrgreen", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
            requireCtype: "priest"
        },
        mrpumpkin: {
            attack: async () => { return await attackTheseTypesMage(bot, ["mrpumpkin"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                if (bot.S.mrpumpkin as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrpumpkin as IPosition)
                await goToSpecialMonster(bot, "mrpumpkin")
                const entities = bot.getEntities({ type: "mrpumpkin", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
            requireCtype: "priest"
        },
        mummy: {
            attack: async () => { return attackTheseTypesMage(bot, ["mummy"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 250, y: -1129 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        mvampire: {
            attack: async () => { return attackTheseTypesMage(bot, ["mvampire", "bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "mvampire")
                const entities = bot.getEntities({ type: "mvampire", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
        },
        nerfedmummy: {
            attack: async () => { return attackTheseTypesMage(bot, ["nerfedmummy"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove("franky") },
        },
        oneeye: {
            attack: async () => { return attackTheseTypesMage(bot, ["oneeye"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level2w", x: -175, y: 0 }, { useBlink: true }) },
            requireCtype: "priest",
        },
        osnake: {
            attack: async () => { return attackTheseTypesMage(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: -589, y: -335 }) },
        },
        phoenix: {
            attack: async () => { return attackTheseTypesMage(bot, ["phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "phoenix")
                const entities = bot.getEntities({ type: "phoenix", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
        },
        plantoid: {
            attack: async () => { return attackTheseTypesMage(bot, ["plantoid"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -750, y: -125 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        poisio: {
            attack: async () => { return await attackTheseTypesMage(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -121, y: 1360 }, { useBlink: true }) },
        },
        porcupine: {
            attack: async () => { return attackTheseTypesMage(bot, ["porcupine"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -829, y: 135 }, { useBlink: true }) },
        },
        pppompom: {
            attack: async () => { return attackTheseTypesMage(bot, ["pppompom"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level2n", x: 120, y: -170 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        prat: {
            attack: async () => { return attackTheseTypesMage(bot, ["prat"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level1", x: -280, y: 541 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        rat: {
            // TODO: Optimize positioning
            attack: async () => { return attackTheseTypesMage(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "mansion", x: 100, y: -225 }, { useBlink: true }) },
        },
        rooster: {
            attack: async () => { return attackTheseTypesMage(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -61.5, y: -282 }, { useBlink: true }) },
        },
        scorpion: {
            attack: async () => { return attackTheseTypesMage(bot, ["scorpion", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 1578, y: -168 }, { useBlink: true }) },
        },
        skeletor: {
            attack: async () => { return attackTheseTypesMage(bot, ["skeletor", "cgoo"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToNearestWalkableToMonster(bot, ["skeletor"], { map: "arena", x: 380, y: -575 })
                const entities = bot.getEntities({ type: "skeletor", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
            requireCtype: "priest",
        },
        // slenderman: {
        //     attack: async () => { await attackTheseTypesMage(bot, ["slenderman"], information.friends) },
        //     attackWhileIdle: true,
        //     equipment: { mainhand: "firestaff", orb: "jacko" },
        //     move: async () => {
        //         await goToSpecialMonster(bot, "slenderman")
        //         const entities = bot.getEntities({ type: "slenderman", withinRange: bot.range })
        //         if (entities.length) magiportFriendsIfNotNearby(bot, information)
        //     },
        // },
        snake: {
            attack: async () => { return attackTheseTypesMage(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -82, y: 1901 }, { useBlink: true }) },
        },
        snowman: {
            attack: async () => { return attackTheseTypesMage(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "snowman")
                const entities = bot.getEntities({ type: "snowman", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
        },
        spider: {
            attack: async () => { return attackTheseTypesMage(bot, ["spider", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 948, y: -144 }, { useBlink: true }) },
        },
        squig: {
            attack: async () => { return attackTheseTypesMage(bot, ["squig", "squigtoad", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -1175, y: 422 }, { useBlink: true }) },
        },
        squigtoad: {
            attack: async () => { return attackTheseTypesMage(bot, ["squigtoad", "squig", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -1175, y: 422 }, { useBlink: true }) },
        },
        stompy: {
            attack: async () => { return attackTheseTypesMage(bot, ["stompy", "wolf"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "stompy")
                const entities = bot.getEntities({ type: "stompy", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            },
            requireCtype: "priest"
        },
        stoneworm: {
            attack: async () => { return attackTheseTypesMage(bot, ["stoneworm"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 677, y: 129 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        // tinyp: {
        //     attack: async () => { return attackTheseTypesMage(bot, ["tinyp"], information.friends, { targetingPartyMember: true }) },
        //     equipment: { mainhand: "firestaff", orb: "jacko" },
        //     move: async () => {
        //         await goToSpecialMonster(bot, "tinyp")
        //         const entities = bot.getEntities({ type: "tinyp", withinRange: bot.range })
        //         if (entities.length) magiportFriendsIfNotNearby(bot, information)
        //     },
        // },
        tortoise: {
            attack: async () => { return attackTheseTypesMage(bot, ["tortoise", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1124, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { return attackTheseTypesMage(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "wand", orb: "jacko" },
            move: async () => {
                await goToSpecialMonster(bot, "wabbit")
                const entities = bot.getEntities({ type: "wabbit", withinRange: bot.range })
                if (entities.length) magiportFriendsIfNotNearby(bot, information)
            }
        },
        wolf: {
            attack: async () => { return attackTheseTypesMage(bot, ["wolf"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 400, y: -2525 }, { useBlink: true }) },
            requireCtype: "priest"
        },
        wolfie: {
            attack: async () => { return await attackTheseTypesMage(bot, ["wolfie"], information.friends) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["wolfie"], { map: "winterland", x: -169, y: -2026 }) },
            requireCtype: "priest"
        },
        xscorpion: {
            attack: async () => { return await attackTheseTypesMage(bot, ["xscorpion"], information.friends, { targetingPartyMember: true }) },
            equipment: { mainhand: "firestaff", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: -325, y: 775 }, { useBlink: true }) },
            requireCtype: "priest"
        }
    }

    startMage(bot, information, strategy, partyLeader, partyMembers)
}

function prepareWarrior(bot: Warrior) {
    const bscorpionSpawn = Pathfinder.locateMonster("bscorpion")[0]
    const strategy: Strategy = {
        defaultTarget: "spider",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["arcticbee"], { map: "winterland", x: 1062, y: -873 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["bat"], { map: "cave", x: 1243, y: -27 }) },
        },
        bbpompom: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bbpompom"], information.friends, { disableAgitate: true }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToNearestWalkableToMonster(bot, ["bbpompom"], { map: "winter_cave", x: 31, y: -164 })
            },
        },
        bee: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["bee"], { map: "main", x: 737, y: 720 }) },
        },
        bigbird: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bigbird"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: 1323, y: 248 }) },
            requireCtype: "priest",
        },
        boar: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["boar"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 0, y: -1109 }) },
            requireCtype: "priest"
        },
        booboo: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["booboo"], information.friends, { maximumTargets: 1 }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 265, y: -625 }) },
            requireCtype: "priest"
        },
        bscorpion: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bscorpion"], information.friends, { disableAgitate: true, targetingPartyMember: true }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "bscorpion" })
                if (nearest && nearest.target && nearest.couldGiveCreditForKill(bot)) {
                    await goToNearestWalkableToMonster(bot, ["bscorpion"], bscorpionSpawn)
                } else {
                    await kiteInCircle(bot, "bscorpion", bscorpionSpawn)
                }
            },
            requireCtype: "priest"
        },
        cgoo: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["cgoo"], information.friends) },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToNearestWalkableToMonster(bot, ["cgoo"], { map: "arena", x: 151.6, y: 40.82 })
            },
        },
        crab: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["crab", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crab"], { map: "main", x: -1222, y: -66 }) },
        },
        crabx: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["crabx", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1004, y: 1762 }) },
        },
        croc: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["croc", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["croc"], { map: "main", x: 781, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                const nearby = bot.getEntity({ returnNearest: true, type: "cutebee" })
                if (nearby) {
                    if (!nearby.target) {
                        // The cutebee will avoid 99.9% of our attacks, so let's try to walk in front of it so that we can aggro it
                        await goToAggroMonster(bot, nearby)
                    } else {
                        await goToNearestWalkableToMonster(bot, ["cutebee"])
                    }
                } else {
                    await goToSpecialMonster(bot, "cutebee")
                }
            },
        },
        dragold: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["dragold"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToSpecialMonster(bot, "dragold")
            },
        },
        fireroamer: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["fireroamer"], information.friends, { disableAgitate: true, targetingPartyMember: true }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: 200, y: -675 }) },
            requireCtype: "priest"
        },
        franky: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["nerfedmummy", "franky"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                if (bot.S.franky as ServerInfoDataLive) requestMagiportService(bot, bot.S.franky as IPosition)
                await goToSpecialMonster(bot, "franky")
            },
            requireCtype: "priest"
        },
        fvampire: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["fvampire"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToSpecialMonster(bot, "fvampire")
            },
            requireCtype: "priest"
        },
        ghost: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["ghost"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToNearestWalkableToMonster(bot, ["ghost"], { map: "halloween", x: 236, y: -1224 })
            },
        },
        goldenbat: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["goo"], { map: "main", x: -52, y: 787 }) },
        },
        greenjr: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["greenjr", "snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "greenjr") },
        },
        hen: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -81.5, y: -282 }) },
        },
        icegolem: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["icegolem"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                const iceGolem = bot.getEntity({ returnNearest: true, type: "icegolem" })
                if (!iceGolem) {
                    if (bot.S.icegolem as ServerInfoDataLive) requestMagiportService(bot, bot.S.icegolem as IPosition)
                    await bot.smartMove({ map: "winterland", x: 783, y: 277 })
                }
                if (iceGolem && !AL.Pathfinder.canWalkPath(bot, iceGolem)) {
                    // Cheat and walk across the water.
                    await bot.move(iceGolem.x, iceGolem.y, { disableSafetyCheck: true })
                } else if (iceGolem) {
                    await goToNearestWalkableToMonster(bot, ["icegolem"])
                }
            },
        },
        iceroamer: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["iceroamer"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToNearestWalkableToMonster(bot, ["iceroamer"], { map: "winterland", x: 1532, y: 104 })
            }
        },
        jr: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["jr"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "jr") },
        },
        minimush: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["minimush", "phoenix"], information.friends, { disableAgitate: true }) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["minimush"], { map: "halloween", x: -18, y: 631 }) },
        },
        mole: {
            attack: async () => {
                // Agitate low level monsters that we can tank so the ranger can kill them quickly with 3shot and 5shot.
                if (bot.canUse("agitate") && bot.players.has(information.bot1.name)) {
                    let shouldAgitate = true
                    const toAgitate = []
                    for (const [, entity] of bot.entities) {
                        if (AL.Tools.distance(bot, entity) > bot.G.skills.agitate.range) continue // Too far to agitate
                        if (entity.target == bot.name) continue // Already targeting us
                        if (entity.type !== "mole" || entity.level > 3) {
                        // Only agitate low level moles
                            shouldAgitate = false
                            break
                        }
                        toAgitate.push(entity)
                    }
                    if (shouldAgitate && toAgitate.length > 0) await bot.agitate()
                }

                await attackTheseTypesWarrior(bot, ["mole"], information.friends, { maximumTargets: 3 })
            },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "tunnel", x: 5, y: -329 }) },
            requireCtype: "priest"
        },
        mrgreen: {
            attack: async () => {
                if (bot.isPVP()) await attackTheseTypesWarrior(bot, ["mrgreen"], information.friends, { disableCleave: true, disableStomp: true })
                else await attackTheseTypesWarrior(bot, ["mrgreen"], information.friends)
            },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                if (bot.S.mrgreen as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrgreen as IPosition)
                await goToSpecialMonster(bot, "mrgreen")
            },
            requireCtype: "priest"
        },
        mrpumpkin: {
            attack: async () => {
                if (bot.isPVP()) await attackTheseTypesWarrior(bot, ["mrpumpkin"], information.friends, { disableCleave: true, disableStomp: true })
                else await attackTheseTypesWarrior(bot, ["mrpumpkin"], information.friends)
            },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                if (bot.S.mrpumpkin as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrpumpkin as IPosition)
                await goToSpecialMonster(bot, "mrpumpkin")
            },
            requireCtype: "priest"
        },
        mummy: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["mummy"], information.friends, { maximumTargets: 3 }) },
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => {
                let highestMummyLevel = 0
                for (const [, entity] of bot.entities) {
                    if (entity.type !== "mummy") continue
                    if (entity.level > highestMummyLevel) highestMummyLevel = entity.level
                }
                if (highestMummyLevel <= 1) {
                    // Mummies are low level, stay and rage
                    await bot.smartMove({ map: "spookytown", x: 230, y: -1131 }).catch(() => { /* Suppress errors */ })
                } else {
                    // Stay back
                    await bot.smartMove({ map: "spookytown", x: 230, y: -1129 }).catch(() => { /* Suppress errors */ })
                }
            },
            requireCtype: "priest"
        },
        mvampire: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["mvampire", "bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "mvampire") },
        },
        nerfedmummy: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["nerfedmummy"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "franky") },
        },
        oneeye: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["oneeye"], information.friends, { maximumTargets: 1 }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level2w", x: -195, y: 0 }) },
            requireCtype: "priest"
        },
        osnake: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["osnake", "snake"], information.friends, { disableAgitate: true }) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: 347, y: -747 }) },
        },
        phoenix: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "phoenix") },
        },
        plantoid: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["plantoid"], information.friends, { maximumTargets: 1 }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "desertland", x: -770, y: -125 }) },
            requireCtype: "priest"
        },
        poisio: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["poisio"], { map: "main", x: -141, y: 1360 }) },
        },
        pppompom: {
            attack: async () => { return attackTheseTypesWarrior(bot, ["pppompom"], information.friends, { maximumTargets: 1 }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "level2n", x: 120, y: -150 }) },
            requireCtype: "priest"
        },
        rat: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["rat"], { map: "mansion", x: 0, y: -21 }) },
        },
        rooster: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "main", x: -81.5, y: -282 }) },
        },
        scorpion: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["scorpion", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["scorpion"], { map: "main", x: 1558, y: -168 }) },
        },
        skeletor: {
            attack: async () => { return await attackTheseTypesWarrior(bot, ["skeletor", "cgoo"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["skeletor"], { map: "arena", x: 360, y: -575 }) },
            requireCtype: "priest"
        },
        // slenderman: {
        //     attack: async () => { await attackTheseTypesWarrior(bot, ["slenderman"], information.friends) },
        //     attackWhileIdle: true,
        //     equipment: { mainhand: "bataxe", orb: "jacko" },
        //     move: async () => { await goToSpecialMonster(bot, "slenderman") },
        // },
        snake: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["snake", "osnake"], information.friends, { disableAgitate: true }) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["snake", "osnake"], { map: "main", x: -102, y: 1901 }) },
        },
        snowman: {
            attack: async () => {
                // Agitate bees to farm them while attacking the snowman
                let shouldAgitate = false
                for (const entity of bot.getEntities({
                    couldGiveCredit: true,
                    targetingMe: false,
                    withinRange: bot.G.skills.agitate.range
                })) {
                    if (entity.type !== "snowman" && !strategy[entity.type]?.attackWhileIdle) {
                        // Something else is here, don't agitate
                        shouldAgitate = false
                        break
                    }
                    shouldAgitate = true
                }
                if (shouldAgitate && bot.canUse("agitate")) bot.agitate()
                await attackTheseTypesWarrior(bot, ["snowman"], information.friends)
            },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "candycanesword", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "snowman") },
        },
        spider: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["spider", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["spider"], { map: "main", x: 928, y: -144 }) },
        },
        squig: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["squig", "squigtoad", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["squig"], { map: "main", x: -1195, y: 422 }) },
        },
        squigtoad: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["squigtoad", "squig", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["squigtoad", "squig"], { map: "main", x: -1195, y: 422 }) },
        },
        stompy: {
            attack: async () => {
                // Taunt extra wolves so the ranger can 3shot
                const stompy = bot.getEntity({ returnNearest: true, type: "stompy" })
                if (stompy && stompy.level <= 1 && bot.canUse("taunt")) {
                    const wolvesTargetingMe = bot.getEntities({ targetingMe: true, type: "wolf" })
                    const wolvesToTarget = bot.getEntities({ couldGiveCredit: true, targetingMe: false, type: "wolf", withinRange: bot.G.skills.taunt.range })
                    if (wolvesTargetingMe.length < 2 && wolvesToTarget.length > 0) {
                        bot.taunt(wolvesToTarget[0].id).catch(e => console.error(e))
                    }
                }
                await attackTheseTypesWarrior(bot, ["stompy"], information.friends, { disableAgitate: true })
            },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToSpecialMonster(bot, "stompy")
            },
            requireCtype: "priest"
        },
        stoneworm: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["stoneworm"], information.friends, { disableAgitate: true }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToNearestWalkableToMonster(bot, ["stoneworm"], { map: "spookytown", x: 717, y: 129 })
            },
            requireCtype: "priest"
        },
        // tinyp: {
        //     attack: async () => {
        //         const nearby = bot.getEntity({ returnNearest: true, type: "tinyp" })
        //         if (nearby?.monster) {
        //             if (!nearby.monster.s.stunned && bot.canUse("stomp") && AL.Tools.distance(bot, nearby.monster) < bot.range) {
        //                 // Stun before attacking
        //                 await bot.stomp()
        //             } else if (nearby.monster.s.stunned) {
        //                 await attackTheseTypesWarrior(bot, ["tinyp"], information.friends, { disableAgitate: true })
        //             }
        //         }
        //     },
        //     equipment: { mainhand: "basher", orb: "jacko" },
        //     move: async () => { await goToSpecialMonster(bot, "tinyp") },
        // },
        tortoise: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["tortoise", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "bataxe", orb: "jacko" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1144, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await goToSpecialMonster(bot, "wabbit") },
        },
        wolf: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["wolf"], information.friends, { maximumTargets: 2 }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "winterland", x: 380, y: -2525 }) },
            requireCtype: "priest"
        },
        wolfie: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["wolfie"], information.friends) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => {
                await goToPriestIfHurt(bot, information.bot1.bot)
                await goToNearestWalkableToMonster(bot, ["wolfie"], { map: "winterland", x: -189, y: -2026 }) },
            requireCtype: "priest"
        },
        xscorpion: {
            attack: async () => { return await attackTheseTypesWarrior(bot, ["xscorpion"], information.friends, { maximumTargets: 3 }) },
            equipment: { mainhand: "fireblade", offhand: "fireblade", orb: "jacko" },
            move: async () => { await bot.smartMove({ map: "halloween", x: -325, y: 750 }) },
            requireCtype: "priest"
        }
    }
    startWarrior(bot, information, strategy, partyLeader, partyMembers)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Start all characters
    console.log("Connecting...")

    const startMerchantLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.merchant.bot) information.merchant.bot.disconnect()
                if (TARGET_REGION == DEFAULT_REGION && TARGET_IDENTIFIER == DEFAULT_IDENTIFIER) {
                    information.merchant.bot = await AL.Game.startMerchant(information.merchant.name, TARGET_REGION, TARGET_IDENTIFIER)
                } else {
                    information.merchant.bot = await AL.Game.startMerchant(information.merchant.nameAlt, TARGET_REGION, TARGET_IDENTIFIER)
                }
                information.friends[0] = information.merchant.bot
                prepareMerchant(information.merchant.bot)
                information.merchant.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.merchant.bot) information.merchant.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startMerchantLoop().catch(() => { /* ignore errors */ })

    const startPriestLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startPriest(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[1] = information.bot1.bot
                preparePriest(information.bot1.bot as Priest)
                information.bot1.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) information.bot1.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startPriestLoop().catch(() => { /* ignore errors */ })

    const startRangerLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startMage(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                prepareMage(information.bot2.bot as Mage)
                startTrackerLoop(information.bot2.bot)
                information.bot2.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) information.bot2.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startRangerLoop().catch(() => { /* ignore errors */ })

    const startWarriorLoop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startWarrior(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[3] = information.bot3.bot
                prepareWarrior(information.bot3.bot as Warrior)
                information.bot3.bot.socket.on("disconnect", async () => { loopBot() })
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) information.bot3.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(async () => { loopBot() }, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(async () => { loopBot() }, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(async () => { loopBot() }, 500)
                } else {
                    setTimeout(async () => { loopBot() }, 10000)
                }
            }
        }
        loopBot()
    }
    startWarriorLoop().catch(() => { /* ignore errors */ })

    let lastServerChangeTime = Date.now()
    const serverLoop = async () => {
        try {
            console.log("DEBUG: Checking target server...")
            // We haven't logged in yet
            if (!information.bot1.bot) {
                console.log("DEBUG: We haven't logged in yet")
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers too fast
            if (lastServerChangeTime > Date.now() - AL.Constants.RECONNECT_TIMEOUT_MS) {
                console.log("DEBUG: Don't change servers too fast")
                setTimeout(async () => { serverLoop() }, Math.max(1000, lastServerChangeTime + AL.Constants.RECONNECT_TIMEOUT_MS - Date.now()))
                return
            }

            // Don't change servers if we're currently attacking something special. (unless it's event season)
            if ((!information.bot1.bot.S?.halloween && !information.bot1.bot.S?.holidayseason)
                && (AL.Constants.SPECIAL_MONSTERS.includes(information.bot1.target)
                || AL.Constants.SPECIAL_MONSTERS.includes(information.bot2.target)
                || AL.Constants.SPECIAL_MONSTERS.includes(information.bot3.target))) {
                console.log(`DEBUG: We are targeting something special (${information.bot1.target}, ${information.bot2.target}, ${information.bot3.target})`)
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Don't change servers if we're running a crypt
            const merchantMap: GMap = AL.Game.G.maps[information.merchant?.bot?.map]
            if (merchantMap && merchantMap.instance) {
                console.log("DEBUG: Merchant is in an instance")
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            const currentRegion = information.bot1.bot.server.region
            const currentIdentifier = information.bot1.bot.server.name
            const G = information.bot1.bot.G

            const targetServer = await getTargetServerFromMonsters(G, DEFAULT_REGION, DEFAULT_IDENTIFIER)
            if (currentRegion == targetServer[0] && currentIdentifier == targetServer[1]) {
                // We're already on the correct server
                console.log("DEBUG: We're already on the correct server")
                setTimeout(async () => { serverLoop() }, 1000)
                return
            }

            // Change servers to attack this entity
            TARGET_REGION = targetServer[0]
            TARGET_IDENTIFIER = targetServer[1]
            console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${TARGET_REGION} ${TARGET_IDENTIFIER}`)

            // Sleep to give a chance to loot
            await sleep(5000)

            // Disconnect everyone
            console.log("Disconnecting characters")
            information.bot1.bot.disconnect(),
            information.bot2.bot?.disconnect(),
            information.bot3.bot?.disconnect(),
            information.merchant.bot?.disconnect()
            await sleep(5000)
            lastServerChangeTime = Date.now()
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { serverLoop() }, 1000)
    }
    serverLoop()
}
run()