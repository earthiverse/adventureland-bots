import AL from "alclient-mongo"
import { LOOP_MS, moveInCircle } from "../base/general.js"
import { attackTheseTypes } from "../base/ranger.js"
import { Strategy } from "../definitions/bot.js"

export async function startRanger(bot: AL.Ranger, friends: AL.Character[]): Promise<void> {
    const strategy: Strategy = {
        arcticbee: {
            attack: async () => { await attackTheseTypes(bot, ["arcticbee"], friends) },
            move: async () => { await bot.smartMove({ map: "winterland", x: 1082, y: -873 }) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            attackWhileIdle: true
        },
        armadillo: {
            attack: async () => { await attackTheseTypes(bot, ["armadillo"], friends) },
            move: async () => { await bot.smartMove({ map: "main", x: 526, y: 1846 }) },
            equipment: { mainhand: "hbow", orb: "test_orb" },
            attackWhileIdle: true
        },
        bat: {
            attack: async () => { await attackTheseTypes(bot, ["bat", "goldenbat", "mvampire"], friends) },
            move: async () => { await bot.smartMove({ map: "cave", x: -194, y: -461 }) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            attackWhileIdle: true
        },
        bbpompom: {
            attack: async () => { await attackTheseTypes(bot, ["bbpompom"], friends) },
            move: async () => { await bot.smartMove({ map: "winter_cave", x: 51, y: -164 }) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            attackWhileIdle: true
        },
        bee: {
            attack: async () => { await attackTheseTypes(bot, ["bee", "cutebee"], friends) },
            move: async () => { await bot.smartMove({ map: "main", x: 494, y: 1101 }) },
            equipment: { mainhand: "hbow", orb: "test_orb" },
            attackWhileIdle: true
        },
        bigbird: {
            attack: async () => { await attackTheseTypes(bot, ["bee", "cutebee"], friends) },
            move: async () => { await bot.smartMove({ map: "main", x: 1343, y: 248 }) },
            equipment: { mainhand: "firebow", orb: "test_orb" },
            attackWhileIdle: true
        },
        boar: {
            attack: async () => { await attackTheseTypes(bot, ["boar"], friends) },
            move: async () => { await bot.smartMove({ map: "winterland", x: 20, y: -1109 }) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
            attackWhileIdle: true
        },
        booboo: {
            attack: async () => { await attackTheseTypes(bot, ["booboo"], friends) },
            move: async () => { await bot.smartMove({ map: "spookytown", x: 265, y: -645 }) },
            equipment: { mainhand: "crossbow", orb: "test_orb" },
        },
        bscorpion: {
            attack: async () => { return attackTheseTypes(bot, ["bscorpion"], friends, { targetingPlayer: "earthPri" }) },
            move: async () => { await moveInCircle(bot, bot.locateMonster("bscorpion")[0]) },
            equipment: { mainhand: "firebow", orb: "test_orb" }
        },
    }

    async function attackLoop() {
        try {
            if (!bot.socket || bot.socket.disconnected) return // Stop if disconnected

            if (bot.rip) {
                bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, LOOP_MS))
                return
            }
        } catch (e) {
            console.error(e)
        }
        bot.timeouts.set("attackloop", setTimeout(async () => { attackLoop() }, Math.max(LOOP_MS, bot.getCooldown("attack"))))
    }
    attackLoop()
}