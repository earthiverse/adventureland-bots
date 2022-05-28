import AL, { CharacterType, MonsterName, PingCompensatedCharacter, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist, Strategy } from "./context.js"
import { BasicAttackStrategy } from "./strategies/attack.js"
import { BaseStrategy } from "./strategies/base.js"
import { FinishMonsterHuntStrategy, GetMonsterHuntStrategy } from "./strategies/monsterhunt.js"

const SERVER_REGION: ServerRegion = "US"
const SERVER_ID: ServerIdentifier = "I"

export async function startLulzCharacter(type: CharacterType, userID: string, userAuth: string, characterID: string, monster: MonsterName) {
    const baseStrategy = new BaseStrategy()
    let bot: PingCompensatedCharacter
    if (type == "ranger") {
        bot = new AL.Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
    } else if (type == "mage") {
        bot = new AL.Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[SERVER_REGION][SERVER_ID])
    } else {
        throw `Unsupported character type: ${type}.`
    }
    const rangerContext = new Strategist(bot, baseStrategy)

    let strategy: Strategy<PingCompensatedCharacter>
    if (monster == "crab") {
        strategy = new BasicAttackStrategy([monster])
    } else {
        strategy = new BasicAttackStrategy([monster])
    }
    rangerContext.applyStrategy(strategy)

    setInterval(async () => {
        // Get Monster Hunt
        if (!bot.s.monsterhunt) {
            rangerContext.applyStrategy(new GetMonsterHuntStrategy())
            return
        }

        // Finish Monster Hunt
        if (bot.s.monsterhunt && bot.s.monsterhunt.c == 0) {
            rangerContext.applyStrategy(new FinishMonsterHuntStrategy())
            return
        }

        // Do Monster Hunt
        if (["bat", "bee", "crab", "goo", "poisio", "tortoise"].includes(bot.s.monsterhunt.id)) {
            rangerContext.applyStrategy(new BasicAttackStrategy([bot.s.monsterhunt.id]))
            return
        }

        // Do Base Strategy
        rangerContext.applyStrategy(new BasicAttackStrategy(["goo"]))
    }, 1000)
}