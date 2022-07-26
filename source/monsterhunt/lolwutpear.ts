import AL, { IPosition, ItemName, Mage, Merchant, SlotType } from "alclient"
import { goToNearestWalkableToMonster2, goToNPC, goToSpecialMonster, sleep, startTrackerLoop } from "../base/general.js"
import { caveBatsNorthEast, desertlandPorcupines, halloweenGreenJr, halloweenMiniMushes, halloweenSafeSnakes, mainArmadillos, mainBeesNearTunnel, mainCrabs, mainCrabXs, mainCrocs, mainGoos, mainPoisios, mainScorpions, mainSpiders, mainSquigs, offsetPosition, offsetPositionParty, winterlandArcticBees } from "../base/locations.js"
import { attackTheseTypesMage } from "../base/mage.js"
import { partyLeader, partyMembers } from "../base/party.js"
import { getTargetServerFromPlayer } from "../base/serverhop.js"
import { Information, Strategy } from "../definitions/bot.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION, startMage, startMerchant } from "./shared.js"

const TARGET_REGION = DEFAULT_REGION
const TARGET_IDENTIFIER = DEFAULT_IDENTIFIER

const information: Information = {
    friends: [undefined, undefined, undefined, undefined],
    // eslint-disable-next-line sort-keys
    bot1: {
        bot: undefined,
        name: "lolwutpear",
        target: undefined
    },
    bot2: {
        bot: undefined,
        name: "ytmnd",
        target: undefined
    },
    bot3: {
        bot: undefined,
        name: "shoopdawhoop",
        target: undefined
    },
    merchant: {
        bot: undefined,
        name: "orlyowl",
        nameAlt: "orlyowl",
        target: undefined
    }
}

function prepareMage(bot: Mage) {
    const maxAttackSpeedEquipment: { [T in SlotType]?: ItemName } = { amulet: "intamulet", belt: "intbelt", cape: "cape", chest: "wattire", earring1: "cearring", earring2: "cearring", gloves: "wgloves", helmet: "wcap", mainhand: "wand", offhand: "wbookhs", orb: "jacko", pants: "wbreeches", ring1: "cring", ring2: "cring", shoes: "wshoes" }
    const maxDamageEquipment: { [T in SlotType]?: ItemName } = { ...maxAttackSpeedEquipment, mainhand: "firestaff", offhand: "wbook0" }

    const strategy: Strategy = {
        defaultTarget: "armadillo",
        // eslint-disable-next-line sort-keys
        arcticbee: {
            attack: async () => { await attackTheseTypesMage(bot, ["arcticbee", "snowman"], information.friends, { cburstWhenHPLessThan: bot.G.monsters.goo.hp + 1 }) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["arcticbee", "snowman"], offsetPosition(winterlandArcticBees, -50, 0))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["arcticbee", "snowman"], offsetPosition(winterlandArcticBees, -150, 0))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["arcticbee", "snowman"], offsetPosition(winterlandArcticBees, -250, 0))
                }
            }
        },
        armadillo: {
            attack: async () => { await attackTheseTypesMage(bot, ["armadillo", "phoenix", "croc"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["armadillo", "phoenix", "croc"], offsetPosition(mainArmadillos, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["armadillo", "phoenix", "croc"], offsetPosition(mainArmadillos, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["armadillo", "phoenix", "croc"], offsetPosition(mainArmadillos, 75, -75))
                }
            },
        },
        bat: {
            attack: async () => { await attackTheseTypesMage(bot, ["bat"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["bat"], offsetPosition(caveBatsNorthEast, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["bat"], offsetPosition(caveBatsNorthEast, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["bat"], offsetPosition(caveBatsNorthEast, 75, -75))
                }
            }
        },
        bee: {
            attack: async () => { await attackTheseTypesMage(bot, ["bee"], information.friends, { cburstWhenHPLessThan: bot.G.monsters.bee.hp + 1 }) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["bee"], offsetPosition(mainBeesNearTunnel, -25, 0))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["bee"], offsetPosition(mainBeesNearTunnel, -75, 0))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["bee"], offsetPosition(mainBeesNearTunnel, -125, 0))
                }
            }
        },
        crab: {
            attack: async () => { await attackTheseTypesMage(bot, ["crab", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["crab", "phoenix"], offsetPosition(mainCrabs, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["crab", "phoenix"], offsetPosition(mainCrabs, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["crab", "phoenix"], offsetPosition(mainCrabs, 75, -75))
                }
            },
        },
        crabx: {
            attack: async () => { await attackTheseTypesMage(bot, ["crabx", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["crabx", "phoenix"], offsetPosition(mainCrabXs, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["crabx", "phoenix"], offsetPosition(mainCrabXs, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["crabx", "phoenix"], offsetPosition(mainCrabXs, 75, -75))
                }
            },
        },
        crabxx: {
            attack: async () => {
                await attackTheseTypesMage(bot, ["crabx"], information.friends, { disableCburst: true, disableCreditCheck: true, disableZapper: true })
                await attackTheseTypesMage(bot, ["crabxx"], information.friends, { disableCreditCheck: true })
            },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "crabxx" })
                if (nearest && AL.Tools.distance(bot, nearest) > 25) {
                    // Move close to crabxx because other characters might help blast away crabx
                    await bot.smartMove(nearest, { getWithin: 25 })
                } else {
                    await goToSpecialMonster(bot, "crabxx", { requestMagiport: true })
                }
            }
        },
        croc: {
            attack: async () => { await attackTheseTypesMage(bot, ["croc", "phoenix", "armadillo"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["croc", "phoenix", "armadillo"], offsetPosition(mainCrocs, 0, -25))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["croc", "phoenix", "armadillo"], offsetPosition(mainCrocs, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["croc", "phoenix", "armadillo"], offsetPosition(mainCrocs, 0, -125))
                }
            },
        },
        franky: {
            attack: async () => { await attackTheseTypesMage(bot, ["nerfedmummy", "franky"], information.friends, { disableCreditCheck: true }) },
            equipment: maxDamageEquipment,
            move: async () => {
                const nearest = bot.getEntity({ returnNearest: true, type: "franky" })
                if (nearest && AL.Tools.distance(bot, nearest) > 25) {
                    // Move close to Franky because other characters might help blast away mummies
                    await bot.smartMove(nearest, { getWithin: 25 })
                } else {
                    await goToSpecialMonster(bot, "franky")
                }
            }
        },
        frog: {
            attack: async () => { await attackTheseTypesMage(bot, ["frog", "tortoise"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { goToNearestWalkableToMonster2(bot, ["frog", "tortoise"]) },
        },
        goldenbat: {
            attack: async () => { await attackTheseTypesMage(bot, ["goldenbat"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "goldenbat") },
        },
        goo: {
            attack: async () => { await attackTheseTypesMage(bot, ["goo"], information.friends, { cburstWhenHPLessThan: bot.G.monsters.goo.hp + 1 }) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["goo"], offsetPosition(mainGoos, -50, 0))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["goo"], offsetPosition(mainGoos, -150, 0))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["goo"], offsetPosition(mainGoos, -250, 0))
                }
            }
        },
        greenjr: {
            attack: async () => { await attackTheseTypesMage(bot, ["greenjr", "snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "greenjr") },
        },
        grinch: {
            attack: async () => { await attackTheseTypesMage(bot, ["grinch"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.S.grinch?.live && bot.S.grinch.hp <= 1_000_000) {
                    // Go to Kane when Grinch is nearing death for extra luck
                    await goToNPC(bot, "citizen0")
                    return
                }

                const grinch = bot.getEntity({ returnNearest: true, type: "grinch" })
                if (grinch) {
                    // TODO: If we see Kane, and the grinch is targeting us, kite him to Kane
                    if (!bot.smartMoving) bot.smartMove(grinch, { getWithin: Math.min(bot.range - 10, 50) }).catch(e => console.error(e))
                    else if (AL.Tools.distance(grinch, bot.smartMoving) > 100) bot.smartMove(grinch, { getWithin: Math.min(bot.range - 10, 50) }).catch(e => console.error(e))
                } else if (bot.S.grinch?.live) {
                    if (["woffice", "bank", "bank_b", "bank_u"].includes(bot.S.grinch.map)) return // Wait for the grinch to move to a place we can attack him

                    if (!bot.smartMoving) goToSpecialMonster(bot, "grinch").catch(e => console.error(e))
                    else if (AL.Tools.distance(bot.S.grinch as IPosition, bot.smartMoving) > 100) {
                        bot.smartMove(bot.S.grinch as IPosition, { getWithin: Math.min(bot.range - 10, 50) }).catch(e => console.error(e))
                    }
                }
            }
        },
        jr: {
            attack: async () => { await attackTheseTypesMage(bot, ["jr"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "jr") },
        },
        minimush: {
            attack: async () => { await attackTheseTypesMage(bot, ["minimush", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["minimush", "phoenix"], offsetPosition(halloweenMiniMushes, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["minimush", "phoenix"], offsetPosition(halloweenMiniMushes, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["minimush", "phoenix"], offsetPosition(halloweenMiniMushes, 75, -75))
                }
            }
        },
        mrgreen: {
            attack: async () => { await attackTheseTypesMage(bot, ["mrgreen"], information.friends) },
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "mrgreen") },
        },
        mrpumpkin: {
            attack: async () => { await attackTheseTypesMage(bot, ["mrpumpkin"], information.friends) },
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "mrpumpkin") },
        },
        mvampire: {
            attack: async () => { await attackTheseTypesMage(bot, ["mvampire", "bat"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "mvampire") },
        },
        osnake: {
            attack: async () => { await attackTheseTypesMage(bot, ["osnake", "snake"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["osnake"], offsetPosition(halloweenGreenJr, 0, -100))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["osnake"], offsetPosition(halloweenSafeSnakes, 0, 0))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["osnake"], offsetPosition(halloweenSafeSnakes, 0, 100))
                }
            },
        },
        pinkgoo: {
            attack: async () => { await attackTheseTypesMage(bot, ["pinkgoo"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                const pinkgoo = bot.getEntity({ returnNearest: true, type: "pinkgoo" })
                if (pinkgoo) {
                    const position = offsetPositionParty(pinkgoo, bot)
                    if (AL.Pathfinder.canWalkPath(bot, position)) bot.move(position.x, position.y).catch(() => { /* Suppress Warnings */ })
                    else if (!bot.smartMoving || AL.Tools.distance(position, bot.smartMoving) > 100) bot.smartMove(position).catch(() => { /* Suppress Warnings */ })
                } else {
                    if (!bot.smartMoving) goToSpecialMonster(bot, "pinkgoo", { requestMagiport: true }).catch(console.error)
                }
            },
        },
        poisio: {
            attack: async () => { await attackTheseTypesMage(bot, ["poisio", "bee"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["poisio", "bee"], offsetPosition(mainPoisios, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["poisio", "bee"], offsetPosition(mainPoisios, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["poisio", "bee"], offsetPosition(mainPoisios, 75, -75))
                }
            }
        },
        porcupine: {
            attack: async () => { await attackTheseTypesMage(bot, ["porcupine"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["porcupine"], offsetPosition(desertlandPorcupines, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["porcupine"], offsetPosition(desertlandPorcupines, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["porcupine"], offsetPosition(desertlandPorcupines, 75, -75))
                }
            },
        },
        rat: {
            attack: async () => { await attackTheseTypesMage(bot, ["rat"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["rat"], { map: "mansion", x: -240, y: -488 })
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["rat"], { map: "mansion", x: -223, y: -312 })
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["rat"], { map: "mansion", x: -223, y: -100 })
                }
            }
        },
        scorpion: {
            attack: async () => { await attackTheseTypesMage(bot, ["scorpion", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["scorpion", "phoenix"], offsetPosition(mainScorpions, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["scorpion", "phoenix"], offsetPosition(mainScorpions, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["scorpion", "phoenix"], offsetPosition(mainScorpions, 75, -75))
                }
            },
        },
        snake: {
            attack: async () => { await attackTheseTypesMage(bot, ["snake", "osnake"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["snake", "osnake"], offsetPosition(halloweenSafeSnakes, -75, -25))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["snake", "osnake"], offsetPosition(halloweenSafeSnakes, 0, -25))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["snake", "osnake"], offsetPosition(halloweenSafeSnakes, 75, -25))
                }
            },
        },
        snowman: {
            attack: async () => { await attackTheseTypesMage(bot, ["snowman"], information.friends) },
            attackWhileIdle: true,
            equipment: maxAttackSpeedEquipment,
            move: async () => { await goToSpecialMonster(bot, "snowman") }
        },
        spider: {
            attack: async () => { await attackTheseTypesMage(bot, ["spider", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["spider", "phoenix"], offsetPosition(mainSpiders, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["spider", "phoenix"], offsetPosition(mainSpiders, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["spider", "phoenix"], offsetPosition(mainSpiders, 75, -75))
                }
            }
        },
        squig: {
            attack: async () => { await attackTheseTypesMage(bot, ["squig", "squigtoad", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["squig", "squigtoad", "phoenix"], offsetPosition(mainSquigs, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["squig", "squigtoad", "phoenix"], offsetPosition(mainSquigs, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["squig", "squigtoad", "phoenix"], offsetPosition(mainSquigs, 75, -75))
                }
            }
        },
        squigtoad: {
            attack: async () => { await attackTheseTypesMage(bot, ["squigtoad", "squig", "phoenix"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => {
                if (bot.id == information.bot1.name) {
                    goToNearestWalkableToMonster2(bot, ["squigtoad", "squig", "phoenix"], offsetPosition(mainSquigs, -75, -75))
                } else if (bot.id == information.bot2.name) {
                    goToNearestWalkableToMonster2(bot, ["squigtoad", "squig", "phoenix"], offsetPosition(mainSquigs, 0, -75))
                } else if (bot.id == information.bot3.name) {
                    goToNearestWalkableToMonster2(bot, ["squigtoad", "squig", "phoenix"], offsetPosition(mainSquigs, 75, -75))
                }
            }
        },
        // tiger: {
        //     attack: async () => {
        //         const tiger = bot.getEntity({ returnNearest: true, type: "tiger" })
        //         if (tiger) {
        //             if (bot.slots.offhand && bot.slots.offhand.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("offhand")
        //             if (bot.slots.mainhand && bot.slots.mainhand.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("mainhand")
        //             if (bot.slots.helmet && bot.slots.helmet.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("helmet")
        //             if (bot.slots.chest && bot.slots.chest.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("chest")
        //             if (bot.slots.pants && bot.slots.pants.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("pants")
        //             if (bot.slots.shoes && bot.slots.shoes.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("shoes")
        //             if (bot.slots.gloves && bot.slots.gloves.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("gloves")
        //             if (bot.slots.orb && bot.slots.orb.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("orb")
        //             if (bot.slots.amulet && bot.slots.amulet.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("amulet")
        //             if (bot.slots.earring1 && bot.slots.earring1.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("earring1")
        //             if (bot.slots.earring2 && bot.slots.earring2.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("earring2")
        //             if (bot.slots.ring1 && bot.slots.ring1.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("ring1")
        //             if (bot.slots.ring2 && bot.slots.ring2.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("ring2")
        //             if (bot.slots.cape && bot.slots.cape.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("cape")
        //             if (bot.slots.belt && bot.slots.belt.l && bot.esize > 1 && bot.cc < 100) await bot.unequip("belt")
        //         }
        //         await attackTheseTypesMage(bot, ["tiger"], information.friends)
        //     },
        //     attackWhileIdle: true,
        //     move: async () => {
        //     const tiger = bot.getEntity({ returnNearest: true, type: "tiger" })
        //     if (tiger) {
        //         const position = offsetPositionParty(tiger, bot)
        //         if (AL.Pathfinder.canWalkPath(bot, position)) bot.move(position.x, position.y).catch(() => { /* Suppress Warnings */ })
        //         else if (!bot.smartMoving || AL.Tools.distance(position, bot.smartMoving) > 100) bot.smartMove(position).catch(() => { /* Suppress Warnings */ })
        //     } else {
        //         if (!bot.smartMoving) goToSpecialMonster(bot, "tiger", { requestMagiport: true })
        //     }
        // }
        // },
        tortoise: {
            attack: async () => { await attackTheseTypesMage(bot, ["tortoise", "frog"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { goToNearestWalkableToMonster2(bot, ["tortoise", "frog"]) },
        },
        wabbit: {
            attack: async () => { return attackTheseTypesMage(bot, ["wabbit", "arcticbee", "bat", "bee", "boar", "cgoo", "crab", "cutebee", "crabx", "croc", "goldenbat", "goo", "greenjr", "hen", "jr", "minimush", "osnake", "phoenix", "poisio", "rooster", "scorpion", "snake", "spider", "squig", "squigtoad", "tortoise"], information.friends) },
            attackWhileIdle: true,
            equipment: maxDamageEquipment,
            move: async () => { await goToSpecialMonster(bot, "wabbit") }
        }
    }

    startMage(bot, information, strategy, partyLeader, partyMembers).catch(console.error)
}

function prepareMerchant(bot: Merchant) {
    const strategy: Strategy = {
    }

    startMerchant(bot, information, strategy, { map: "main", x: -250, y: -100 }, partyLeader, partyMembers).catch(console.error)
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
        loopBot().catch(console.error)
    }
    startMerchantLoop().catch(() => { /* ignore errors */ })

    const startMage1Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot1.bot) information.bot1.bot.disconnect()
                information.bot1.bot = await AL.Game.startMage(information.bot1.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[1] = information.bot1.bot
                prepareMage(information.bot1.bot as Mage)
                startTrackerLoop(information.bot1.bot)
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
        loopBot().catch(console.error)
    }
    startMage1Loop().catch(() => { /* ignore errors */ })

    const startMage2Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot2.bot) information.bot2.bot.disconnect()
                information.bot2.bot = await AL.Game.startMage(information.bot2.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[2] = information.bot2.bot
                prepareMage(information.bot2.bot as Mage)
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
        loopBot().catch(console.error)
    }
    startMage2Loop().catch(() => { /* ignore errors */ })

    const startMage3Loop = async () => {
        // Start the characters
        const loopBot = async () => {
            try {
                if (information.bot3.bot) information.bot3.bot.disconnect()
                information.bot3.bot = await AL.Game.startMage(information.bot3.name, TARGET_REGION, TARGET_IDENTIFIER)
                information.friends[3] = information.bot3.bot
                prepareMage(information.bot3.bot as Mage)
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
        loopBot().catch(console.error)
    }
    startMage3Loop().catch(() => { /* ignore errors */ })

    // let lastServerChangeTime = Date.now()
    // const serverLoop = async () => {
    //     try {
    //         console.log("DEBUG: Checking target server...")
    //         // We haven't logged in yet
    //         if (!information.bot1.bot) {
    //             console.log("DEBUG: We haven't logged in yet")
    //             setTimeout(serverLoop, 1000)
    //             return
    //         }

    //         // Don't change servers too fast
    //         if (lastServerChangeTime > Date.now() - AL.Constants.RECONNECT_TIMEOUT_MS) {
    //             console.log("DEBUG: Don't change servers too fast")
    //             setTimeout(serverLoop, Math.max(1000, lastServerChangeTime + AL.Constants.RECONNECT_TIMEOUT_MS - Date.now()))
    //             return
    //         }

    //         const currentRegion = information.bot1.bot.server.region
    //         const currentIdentifier = information.bot1.bot.server.name

    //         const targetServer = await getTargetServerFromPlayer(currentRegion, currentIdentifier, partyLeader)
    //         if (currentRegion == targetServer[0] && currentIdentifier == targetServer[1]) {
    //             // We're already on the correct server
    //             console.log("DEBUG: We're already on the correct server")
    //             setTimeout(serverLoop, 1000)
    //             return
    //         }

    //         // Change servers to attack this entity
    //         TARGET_REGION = targetServer[0]
    //         TARGET_IDENTIFIER = targetServer[1]
    //         console.log(`Changing from ${currentRegion} ${currentIdentifier} to ${TARGET_REGION} ${TARGET_IDENTIFIER}`)

    //         // Sleep to give a chance to loot
    //         await sleep(5000)

    //         // Disconnect everyone
    //         console.log("Disconnecting characters")
    //         information.bot1.bot.disconnect(),
    //         information.bot2.bot?.disconnect(),
    //         information.bot3.bot?.disconnect(),
    //         information.merchant.bot?.disconnect()
    //         await sleep(5000)
    //         lastServerChangeTime = Date.now()
    //     } catch (e) {
    //         console.error(e)
    //     }
    //     setTimeout(serverLoop, 1000)
    // }
    // serverLoop().catch(console.error)
}
run().catch(console.error)