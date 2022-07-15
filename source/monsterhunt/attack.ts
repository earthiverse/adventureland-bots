import AL, { Merchant, Priest, Ranger, Warrior, ServerInfoDataLive, IPosition } from "alclient"
import { goToAggroMonster, goToKiteStuff, goToNearestWalkableToMonster, goToSpecialMonster, requestMagiportService, startTrackerLoop } from "../base/general.js"
import { attackTheseTypesPriest } from "../base/priest.js"
import { attackTheseTypesRanger } from "../base/ranger.js"
import { attackTheseTypesWarrior } from "../base/warrior.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startMerchant, startPriest, startRanger, startWarrior } from "./shared.js"

const TARGET_REGION = DEFAULT_REGION
const TARGET_IDENTIFIER = DEFAULT_IDENTIFIER
const partyLeader = "attackRan"
const partyMembers = ["attackRan", "attackPri", "attackWar"]

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "attackPri",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "attackRan",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "attackWar",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "attackMer",
        nameAlt: "attackMer",
        target: undefined
    }
}

function prepareMerchant(bot: Merchant) {
    const strategy: Strategy = { }
    startMerchant(bot, information, strategy, { map: "main", x: 0, y: 0 }, partyLeader, partyMembers)
}

function preparePriest(bot: Priest) {
    const strategy: Strategy = {
        defaultTarget: "spider",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesPriest(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "winterland", x: 1102, y: -873 }) },
        },
        armadillo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["armadillo"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 546, y: 1846 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "cave", x: 324, y: -1107 }) },
        },
        bee: {
            attack: async () => { await attackTheseTypesPriest(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 152, y: 1487 }) },
        },
        cgoo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["cgoo"], information.friends) },
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "cgoo" })
                if (nearest) {
                    goToKiteStuff(bot, { typeList: ["cgoo"] })
                } else if (!bot.smartMoving) {
                    bot.smartMove({ map: "arena", x: 650, y: -500 }).catch(/** Suppress errors */)
                }
            },
        },
        crab: {
            attack: async () => { await attackTheseTypesPriest(bot, ["crab"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -1182, y: -66 }) },
        },
        crabx: {
            attack: async () => { await attackTheseTypesPriest(bot, ["crabx"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -964, y: 1762 }) },
        },
        croc: {
            attack: async () => { await attackTheseTypesPriest(bot, ["croc"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 821, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { await attackTheseTypesPriest(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
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
        frog: {
            attack: async () => { await attackTheseTypesPriest(bot, ["frog"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["frog"], { map: "main", x: -1124, y: 1118 }) },
        },
        goldenbat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { await attackTheseTypesPriest(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -12, y: 787 }) },
        },
        hen: {
            attack: async () => { await attackTheseTypesPriest(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -41.5, y: -282 }) },
        },
        minimush: {
            attack: async () => { await attackTheseTypesPriest(bot, ["minimush"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "halloween", x: 28, y: 631 }) },
        },
        mrgreen: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mrgreen"], information.friends) },
            move: async () => {
                if (bot.S.mrgreen as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrgreen as IPosition)
                await goToSpecialMonster(bot, "mrgreen")
            },
        },
        mrpumpkin: {
            attack: async () => { await attackTheseTypesPriest(bot, ["mrpumpkin"], information.friends) },
            move: async () => {
                if (bot.S.mrpumpkin as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrpumpkin as IPosition)
                await goToSpecialMonster(bot, "mrpumpkin")
            },
        },
        osnake: {
            attack: async () => { await attackTheseTypesPriest(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: -488, y: -708 }) },
        },
        poisio: {
            attack: async () => { await attackTheseTypesPriest(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -101, y: 1360 }) },
        },
        porcupine: {
            attack: async () => { await attackTheseTypesPriest(bot, ["porcupine"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "desertland", x: -809, y: 135 }) },
        },
        rat: {
            attack: async () => { await attackTheseTypesPriest(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "mansion", x: -224, y: -313 }) },
        },
        rooster: {
            attack: async () => { await attackTheseTypesPriest(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -41.5, y: -282 }) },
        },
        scorpion: {
            attack: async () => { await attackTheseTypesPriest(bot, ["scorpion"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 1598, y: -168 }) },
        },
        snake: {
            attack: async () => { await attackTheseTypesPriest(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -62, y: 1901 }) },
        },
        snowman: {
            attack: async () => { await attackTheseTypesPriest(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToSpecialMonster(bot, "snowman") },
        },
        spider: {
            attack: async () => { await attackTheseTypesPriest(bot, ["spider"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 968, y: -144 }) },
        },
        squig: {
            attack: async () => { await attackTheseTypesPriest(bot, ["squig", "squigtoad"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -1155, y: 422 }) },
        },
        squigtoad: {
            attack: async () => { await attackTheseTypesPriest(bot, ["squigtoad", "squig"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -1155, y: 422 }) },
        },
        tortoise: {
            attack: async () => { await attackTheseTypesPriest(bot, ["tortoise"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1104, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { await attackTheseTypesPriest(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToSpecialMonster(bot, "wabbit") },
        },
    }
    startPriest(bot, information, strategy, partyLeader, partyMembers)
}

function prepareRanger(bot: Ranger) {
    const strategy: Strategy = {
        defaultTarget: "spider",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesRanger(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "winterland", x: 1082, y: -873 }) },
        },
        armadillo: {
            attack: async () => { await attackTheseTypesRanger(bot, ["armadillo"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 526, y: 1846 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesRanger(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "cave", x: -194, y: -461 }) },
        },
        bee: {
            attack: async () => { await attackTheseTypesRanger(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 494, y: 1101 }) },
        },
        cgoo: {
            attack: async () => { await attackTheseTypesRanger(bot, ["cgoo"], information.friends) },
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "cgoo" })
                if (nearest) {
                    goToKiteStuff(bot, { typeList: ["cgoo"] })
                } else if (!bot.smartMoving) {
                    bot.smartMove({ map: "arena", x: 0, y: -500 }).catch(/** Suppress errors */)
                }
            },
        },
        crab: {
            attack: async () => { return attackTheseTypesRanger(bot, ["crab"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -1202, y: -66 }) },
        },
        crabx: {
            attack: async () => { return attackTheseTypesRanger(bot, ["crabx"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1202, y: -66 }) },
        },
        croc: {
            attack: async () => { return attackTheseTypesRanger(bot, ["croc"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 801, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { return attackTheseTypesRanger(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
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
        goldenbat: {
            attack: async () => { return attackTheseTypesRanger(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { return attackTheseTypesRanger(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -32, y: 787 }) },
        },
        hen: {
            attack: async () => { return attackTheseTypesRanger(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -61.5, y: -282 }) },
        },
        minimush: {
            attack: async () => { return attackTheseTypesRanger(bot, ["minimush"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "halloween", x: 8, y: 631 }) },
        },
        mrgreen: {
            attack: async () => { return attackTheseTypesRanger(bot, ["mrgreen"], information.friends) },
            move: async () => {
                if (bot.S.mrgreen as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrgreen as IPosition)
                await goToSpecialMonster(bot, "mrgreen")
            },
            requireCtype: "priest"
        },
        mrpumpkin: {
            attack: async () => { return await attackTheseTypesRanger(bot, ["mrpumpkin"], information.friends) },
            move: async () => {
                if (bot.S.mrpumpkin as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrpumpkin as IPosition)
                await goToSpecialMonster(bot, "mrpumpkin")
            },
            requireCtype: "priest"
        },
        osnake: {
            attack: async () => { return attackTheseTypesRanger(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: -589, y: -335 }) },
        },
        poisio: {
            // TODO: If we can 1shot with hbow, use that instead
            attack: async () => { return await attackTheseTypesRanger(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -121, y: 1360 }) },
        },
        porcupine: {
            attack: async () => { return attackTheseTypesRanger(bot, ["porcupine"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "desertland", x: -829, y: 135 }) },
        },
        rat: {
            // TODO: Optimize positioning
            attack: async () => { return attackTheseTypesRanger(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "mansion", x: 100, y: -225 }) },
        },
        rooster: {
            attack: async () => { return attackTheseTypesRanger(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -61.5, y: -282 }) },
        },
        scorpion: {
            attack: async () => { return attackTheseTypesRanger(bot, ["scorpion"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 1578, y: -168 }) },
        },
        snake: {
            attack: async () => { return attackTheseTypesRanger(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -82, y: 1901 }) },
        },
        snowman: {
            attack: async () => { return attackTheseTypesRanger(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToSpecialMonster(bot, "snowman") },
        },
        spider: {
            attack: async () => { return attackTheseTypesRanger(bot, ["spider"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: 948, y: -144 }) },
        },
        squig: {
            attack: async () => { return attackTheseTypesRanger(bot, ["squig", "squigtoad"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -1175, y: 422 }) },
        },
        squigtoad: {
            attack: async () => { return attackTheseTypesRanger(bot, ["squigtoad", "squig"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await bot.smartMove({ map: "main", x: -1175, y: 422 }) },
        },
        tortoise: {
            attack: async () => { return attackTheseTypesRanger(bot, ["tortoise"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1124, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { return attackTheseTypesRanger(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            move: async () => { await goToSpecialMonster(bot, "wabbit") }
        }
    }

    startRanger(bot, information, strategy, partyLeader, partyMembers)
}

function prepareWarrior(bot: Warrior) {
    const strategy: Strategy = {
        defaultTarget: "spider",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["arcticbee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["arcticbee"], { map: "winterland", x: 1062, y: -873 }) },
        },
        bat: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["bat"], { map: "cave", x: 1243, y: -27 }) },
        },
        bee: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["bee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["bee"], { map: "main", x: 737, y: 720 }) },
        },
        crab: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["crab"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crab"], { map: "main", x: -1222, y: -66 }) },
        },
        crabx: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["crabx"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["crabx"], { map: "main", x: -1004, y: 1762 }) },
        },
        croc: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["croc"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["croc"], { map: "main", x: 781, y: 1710 }) },
        },
        cutebee: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["cutebee"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
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
        goldenbat: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["goo"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["goo"], { map: "main", x: -52, y: 787 }) },
        },
        hen: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["hen"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await bot.smartMove({ map: "main", x: -81.5, y: -282 }) },
        },
        minimush: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["minimush"], information.friends, { disableAgitate: true }) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["minimush"], { map: "halloween", x: -18, y: 631 }) },
        },
        mrgreen: {
            attack: async () => {
                if (bot.isPVP()) await attackTheseTypesWarrior(bot, ["mrgreen"], information.friends, { disableCleave: true, disableStomp: true })
                else await attackTheseTypesWarrior(bot, ["mrgreen"], information.friends)
            },
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
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
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => {
                if (bot.S.mrpumpkin as ServerInfoDataLive) requestMagiportService(bot, bot.S.mrpumpkin as IPosition)
                await goToSpecialMonster(bot, "mrpumpkin")
            },
            requireCtype: "priest"
        },
        osnake: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["osnake", "snake"], information.friends, { disableAgitate: true }) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["osnake", "snake"], { map: "halloween", x: 347, y: -747 }) },
        },
        poisio: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["poisio"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["poisio"], { map: "main", x: -141, y: 1360 }) },
        },
        rat: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["rat"], { map: "mansion", x: 0, y: -21 }) },
        },
        rooster: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["rooster"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await bot.smartMove({ map: "main", x: -81.5, y: -282 }) },
        },
        scorpion: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["scorpion"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["scorpion"], { map: "main", x: 1558, y: -168 }) },
        },
        snake: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["snake", "osnake"], information.friends, { disableAgitate: true }) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
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
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToSpecialMonster(bot, "snowman") },
        },
        spider: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["spider"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["spider"], { map: "main", x: 928, y: -144 }) },
        },
        squig: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["squig", "squigtoad"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["squig"], { map: "main", x: -1195, y: 422 }) },
        },
        squigtoad: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["squigtoad", "squig"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["squigtoad", "squig"], { map: "main", x: -1195, y: 422 }) },
        },
        tortoise: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["tortoise"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToNearestWalkableToMonster(bot, ["tortoise"], { map: "main", x: -1144, y: 1118 }) },
        },
        wabbit: {
            attack: async () => { await attackTheseTypesWarrior(bot, ["wabbit"], information.friends) },
            attackWhileIdle: true,
            equipment: { mainhand: "candycanesword", offhand: "ololipop" },
            move: async () => { await goToSpecialMonster(bot, "wabbit") },
        }
    }
    startWarrior(bot, information, strategy, partyLeader, partyMembers)
}

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G, { cheat: true })

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
                information.merchant.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.merchant.bot) information.merchant.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
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
                information.bot1.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.bot1.bot) information.bot1.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
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
                information.bot2.bot = await AL.Game.startRanger(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                prepareRanger(information.bot2.bot as Ranger)
                startTrackerLoop(information.bot2.bot)
                information.bot2.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.bot2.bot) information.bot2.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
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
                information.bot3.bot.socket.on("disconnect", loopBot)
            } catch (e) {
                console.error(e)
                if (information.bot3.bot) information.bot3.bot.disconnect()
                const wait = /wait_(\d+)_second/.exec(e)
                if (wait && wait[1]) {
                    setTimeout(loopBot, 1000 + Number.parseInt(wait[1]) * 1000)
                } else if (/limits/.test(e)) {
                    setTimeout(loopBot, AL.Constants.RECONNECT_TIMEOUT_MS)
                } else if (/ingame/.test(e)) {
                    setTimeout(loopBot, 500)
                } else {
                    setTimeout(loopBot, 10000)
                }
            }
        }
        loopBot()
    }
    startWarriorLoop().catch(() => { /* ignore errors */ })
}
run()