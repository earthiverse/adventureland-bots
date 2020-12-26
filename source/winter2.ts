import { Game } from "./Game.js"
import { Merchant } from "./Merchant.js"
import { Pathfinder } from "./Pathfinder.js"
import { Priest } from "./Priest.js"
import { Ranger } from "./Ranger.js"
import { Warrior } from "./Warrior.js"

let ranger: Ranger
let warrior: Warrior
let priest: Priest
let merchant: Merchant

async function run(rangerName: string, warriorName: string, priestName: string, merchantName: string) {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    try {
        const loopRanger = async () => {
            try {
                await Game.stopCharacter(rangerName)
                ranger = await Game.startRanger(rangerName, region, identifier)
                ranger.socket.on("disconnect", async () => { await loopRanger() })
                startRanger(ranger)
                generalBotStuff(ranger)
            } catch (e) {
                await Game.stopCharacter(rangerName)
                setTimeout(async () => { await loopRanger() }, 1000)
            }
        }
        const loopWarrior = async () => {
            try {
                await Game.stopCharacter(warriorName)
                warrior = await Game.startWarrior(warriorName, region, identifier)
                warrior.socket.on("disconnect", async () => { await loopWarrior() })
                startWarrior(warrior)
                generalBotStuff(warrior)
            } catch (e) {
                await Game.stopCharacter(warriorName)
                setTimeout(async () => { await loopWarrior() }, 1000)
            }
        }
        const loopPriest = async () => {
            try {
                await Game.stopCharacter(priestName)
                priest = await Game.startPriest(priestName, region, identifier)
                priest.socket.on("disconnect", async () => { await loopPriest() })
                startPriest(priest)
                generalBotStuff(priest)
            } catch (e) {
                await Game.stopCharacter(priestName)
                setTimeout(async () => { await loopPriest() }, 1000)
            }
        }
        const loopMerchant = async () => {
            try {
                await Game.stopCharacter(merchantName)
                merchant = await Game.startMerchant(merchantName, region, identifier)
                merchant.socket.on("disconnect", async () => { await loopMerchant() })
                startMerchant(merchant)
                generalBotStuff(merchant)
            } catch (e) {
                await Game.stopCharacter(merchantName)
                setTimeout(async () => { await loopMerchant() }, 1000)
            }
        }

        await loopRanger()
        await loopWarrior()
        await loopPriest()
        await loopMerchant()
    } catch (e) {
        await Game.disconnect(false)
    }
}
run("earthiverse", "earthWar", "earthPri", "earthMer")