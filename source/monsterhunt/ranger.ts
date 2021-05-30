import AL from "alclient-mongo"
import { attackTheseTypes } from "../base/ranger"
import { Strategy } from "../definitions/bot"

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
            equipment: { mainhand: "crossbow", orb: "test_orb" },
        }
    }
}