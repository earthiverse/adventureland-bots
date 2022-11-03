import AL, { CharacterType, ItemName, Mage, MonsterName, PingCompensatedCharacter, Priest, Ranger, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { getMsToNextMinute } from "../base/general.js"
import { ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

const BUFFER = 6_500

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

const baseStrategy = new BaseStrategy(CONTEXTS)
const buyStrategy = new BuyStrategy({
    buyMap: undefined,
    replenishables: new Map<ItemName, number>([
        ["hpot1", 2500],
        ["mpot1", 2500],
        ["xptome", 1],
    ])
})
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()

async function startRanger(context: Strategist<Ranger>, monsters: MonsterName[]) {

    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)

    // Attack
    context.applyStrategy(new RangerAttackStrategy({ contexts: CONTEXTS, disableHuntersMark: true, disableMultiShot: true, typeList: monsters }))

    // Move
    context.applyStrategy(new ImprovedMoveStrategy(monsters))
}

let halloweenData
let halloweenDataUpdated: Date
let charactersData
let charactersDataUpdated: Date

setInterval(async () => {
    try {
        console.log("Getting Halloween data...")
        const aldata = await fetch("https://aldata.earthiverse.ca/halloween")
        if (aldata.status == 200) {
            halloweenData = await aldata.json()
            halloweenDataUpdated = new Date()
        }
    } catch (e) {
        console.error(e)
    }

    try {
        console.log("Getting Characters data...")
        const aldata = await fetch("https://aldata.earthiverse.ca/characters/earthWar,earthPri,earthMag")
        if (aldata.status == 200) {
            charactersData = await aldata.json()
            charactersDataUpdated = new Date()
        }
    } catch (e) {
        console.error(e)
    }
}, 20_000)

async function startBot(characterName: string, characterType: CharacterType, serverRegion: ServerRegion, serverIdentifier: ServerIdentifier, monsters: MonsterName[]) {
    if (charactersDataUpdated.getTime() < Date.now() - 60_000) {
        console.log(`Not starting ${characterName} on ${serverRegion} ${serverIdentifier} (Characters data is old)!`)
        setTimeout(startBot, getMsToNextMinute() + BUFFER, characterName, characterType, serverRegion, serverIdentifier, monsters)
        return
    }
    for (const character of charactersData) {
        if (character.serverRegion == serverRegion && character.serverIdentifier == serverIdentifier) {
            console.log(`Not starting ${characterName} on ${serverRegion} ${serverIdentifier} (${character.id} is Online)!`)
            setTimeout(startBot, getMsToNextMinute() + BUFFER, characterName, characterType, serverRegion, serverIdentifier, monsters)
            return
        }
    }
    let bot: PingCompensatedCharacter
    let context: Strategist<PingCompensatedCharacter>
    switch (characterType) {
        case "mage":
            try {
                bot = await AL.Game.startMage(characterName, serverRegion, serverIdentifier)
            } catch (e) {
                console.error(e)
                setTimeout(startBot, getMsToNextMinute() + BUFFER, characterName, characterType, serverRegion, serverIdentifier, monsters)
                return
            }
            context = new Strategist<Mage>(bot as Mage, baseStrategy)
            context.applyStrategy(new MageAttackStrategy({ contexts: CONTEXTS, typeList: monsters }))
            break
        case "priest":
            try {
                bot = await AL.Game.startPriest(characterName, serverRegion, serverIdentifier)
            } catch (e) {
                console.error(e)
                setTimeout(startBot, getMsToNextMinute() + BUFFER, characterName, characterType, serverRegion, serverIdentifier, monsters)
                return
            }
            context = new Strategist<Priest>(bot as Priest, baseStrategy)
            context.applyStrategy(new PriestAttackStrategy({ contexts: CONTEXTS, typeList: monsters }))
            break
        case "ranger":
            try {
                bot = await AL.Game.startRanger(characterName, serverRegion, serverIdentifier)
            } catch (e) {
                console.error(e)
                setTimeout(startBot, getMsToNextMinute() + BUFFER, characterName, characterType, serverRegion, serverIdentifier, monsters)
                return
            }
            context = new Strategist<Ranger>(bot as Ranger, baseStrategy)
            context.applyStrategy(new RangerAttackStrategy({ contexts: CONTEXTS, disableHuntersMark: true, disableMultiShot: true, typeList: monsters }))
            break
        default:
            break
    }
    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(new ImprovedMoveStrategy(monsters))
    CONTEXTS.push(context)

    const connectLoop = async () => {
        try {
            if (halloweenDataUpdated.getTime() < Date.now() - 60_000) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Halloween data is old)!`)
                return
            }
            if (halloweenData[0].serverRegion == serverRegion && halloweenData[0].serverIdentifier == serverIdentifier) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Currently on Halloween)!`)
                return
            }
            if (halloweenData[1].serverRegion == serverRegion && halloweenData[1].serverIdentifier == serverIdentifier) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Next on Halloween)!`)
                return
            }

            if (charactersDataUpdated.getTime() < Date.now() - 60_000) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Characters data is old)!`)
                return
            }
            for (const character of charactersData) {
                if (character.serverRegion == serverRegion && character.serverIdentifier == serverIdentifier) {
                    console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (${character.id} is Online)!`)
                    return
                }
            }

            console.log(`Connecting to ${serverRegion} ${serverIdentifier}...`)
            await context.reconnect()
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + BUFFER)
        }
    }
    setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + BUFFER)

    const disconnectLoop = async () => {
        try {
            console.log("Disconnecting...")

            context.bot.socket.removeAllListeners("disconnect")
            await context.bot.disconnect()

        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() + (60_000 - BUFFER))
        }
    }
    setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() - BUFFER)
}

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthiverse", "ranger", "US", "I", ["jrat"])

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthPri2", "priest", "US", "II", ["jrat"])

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthMag2", "priest", "US", "III", ["jrat"])

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthRan2", "ranger", "US", "PVP", ["jrat"])

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthMag3", "priest", "EU", "I", ["jrat"])

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthRan3", "ranger", "EU", "PVP", ["jrat"])
