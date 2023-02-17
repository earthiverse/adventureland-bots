import AL, { CharacterType, ItemName, Mage, MonsterName, PingCompensatedCharacter, Priest, Ranger, Rogue, ServerIdentifier, ServerRegion } from "alclient"
import { Strategist, Strategy } from "../strategy_pattern/context.js"
import { BaseStrategy } from "../strategy_pattern/strategies/base.js"
import { BuyStrategy } from "../strategy_pattern/strategies/buy.js"
import { RespawnStrategy } from "../strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "../strategy_pattern/strategies/tracker.js"
import { RangerAttackStrategy } from "../strategy_pattern/strategies/attack_ranger.js"
import { getMsToNextMinute } from "../base/general.js"
import { GetHolidaySpiritStrategy, ImprovedMoveStrategy } from "../strategy_pattern/strategies/move.js"
import { MageAttackStrategy } from "../strategy_pattern/strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategy_pattern/strategies/attack_priest.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "../strategy_pattern/strategies/party.js"
import { RogueAttackStrategy } from "../strategy_pattern/strategies/attack_rogue.js"
import { GiveRogueSpeedStrategy } from "../strategy_pattern/strategies/rspeed.js"
import { OptimizeItemsStrategy } from "../strategy_pattern/strategies/item.js"
import { MoveToBankAndDepositStuffStrategy } from "../strategy_pattern/strategies/bank.js"

await Promise.all([AL.Game.loginJSONFile("../../credentials.json", false), AL.Game.getGData(true)])
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
const getHolidaySpiritStrategy = new GetHolidaySpiritStrategy()
const trackerStrategy = new TrackerStrategy()
const respawnStrategy = new RespawnStrategy()
const itemStrategy = new OptimizeItemsStrategy()
const bankStrategy = new MoveToBankAndDepositStuffStrategy({
    invisibleRogue: true,
    map: "bank_b"
})
const rSpeedStrategy = new GiveRogueSpeedStrategy()

// Party
const PARTY_LEADER = "earthRog"
const partyAcceptStrategy = new AcceptPartyRequestStrategy()
const partyRequestStrategy = new RequestPartyStrategy(PARTY_LEADER)

let eventData
let eventDataUpdated: Date
let charactersData
let charactersDataUpdated: Date

async function updateData() {
    try {
        console.log("Getting Event data...")
        const aldata = await fetch("https://aldata.earthiverse.ca/lunarnewyear")
        if (aldata.status == 200) {
            eventData = await aldata.json()
            eventDataUpdated = new Date()
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
    } finally {
        setTimeout(async () => { updateData() }, getMsToNextMinute())
    }
}
updateData()

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
            break
        case "rogue":
            try {
                bot = await AL.Game.startRogue(characterName, serverRegion, serverIdentifier)
            } catch (e) {
                console.error(e)
                setTimeout(startBot, getMsToNextMinute() + BUFFER, characterName, characterType, serverRegion, serverIdentifier, monsters)
                return
            }
            context = new Strategist<Rogue>(bot as Rogue, baseStrategy)
            break
        default:
            break
    }
    context.applyStrategy(buyStrategy)
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(itemStrategy)

    if (characterName == PARTY_LEADER) {
        context.applyStrategy(partyAcceptStrategy)
    } else {
        context.applyStrategy(partyRequestStrategy)
    }

    const moveStrategy = new ImprovedMoveStrategy(monsters)

    let attackStrategy: Strategy<PingCompensatedCharacter>
    switch (characterType) {
        case "mage":
            attackStrategy = new MageAttackStrategy({ contexts: CONTEXTS, typeList: monsters })
            break
        case "priest":
            attackStrategy = new PriestAttackStrategy({ contexts: CONTEXTS, typeList: monsters })
            break
        case "ranger":
            attackStrategy = new RangerAttackStrategy({ contexts: CONTEXTS, disableHuntersMark: true, disableMultiShot: true, typeList: monsters })
            break
        case "rogue":
            attackStrategy = new RogueAttackStrategy({ contexts: CONTEXTS, typeList: monsters })
            context.applyStrategy(rSpeedStrategy)
            break
    }

    const logicLoop = async () => {
        try {
            if (!context.isReady() || !context.bot.ready || context.bot.rip) return // Not ready
            if (context.bot.S.holidayseason && !context.bot.s.holidayspirit) {
                if (context.hasStrategy(moveStrategy)) context.removeStrategy(moveStrategy)
                if (!context.hasStrategy(getHolidaySpiritStrategy)) context.applyStrategy(getHolidaySpiritStrategy)
                setTimeout(() => { logicLoop() }, 1000)
                return
            }

            if (context.bot.esize == 0) {
                // We're full, go deposit items in the bank
                if (context.hasStrategy(attackStrategy)) context.removeStrategy(attackStrategy)
                if (context.hasStrategy(moveStrategy)) context.removeStrategy(moveStrategy)

                if (!context.hasStrategy(bankStrategy)) context.applyStrategy(bankStrategy)
                setTimeout(() => { logicLoop() }, getMsToNextMinute() + 60_000)
                return
            }

            // Defaults
            context.removeStrategy(bankStrategy)
            if (!context.hasStrategy(moveStrategy)) context.applyStrategy(moveStrategy)
            if (!context.hasStrategy(attackStrategy)) context.applyStrategy(attackStrategy)
        } catch (e) {
            console.error(e)
        }
        setTimeout(() => { logicLoop() }, 1000)
    }
    logicLoop()

    CONTEXTS.push(context)

    const connectLoop = async () => {
        try {
            if (eventDataUpdated.getTime() < Date.now() - 60_000) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Event data is old)!`)
                return
            }
            if (eventData?.length > 0 && eventData[0].serverRegion == serverRegion && eventData[0].serverIdentifier == serverIdentifier) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Main characters probably on event)!`)
                return
            }
            if (eventData?.length > 1 && eventData[1].serverRegion == serverRegion && eventData[1].serverIdentifier == serverIdentifier) {
                console.log(`Not connecting to ${serverRegion} ${serverIdentifier} (Main characters probably on event soon)!`)
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
            context?.bot?.socket?.removeAllListeners("disconnect")
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

setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthRog", "rogue", "US", "PVP", ["rat"])
setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthRog2", "rogue", "US", "PVP", ["rat"])
setTimeout(startBot, getMsToNextMinute() + BUFFER, "earthRog3", "rogue", "US", "PVP", ["rat"])
