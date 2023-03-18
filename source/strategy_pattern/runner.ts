import AL, { CharacterType, IPosition, ItemName, Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { getMsToNextMinute, randomIntFromInterval } from "../base/general.js"
import { DEFAULT_ITEMS_TO_HOLD, DEFAULT_MERCHANT_ITEMS_TO_HOLD, DEFAULT_REPLENISHABLES, DEFAULT_REPLENISH_RATIO, MerchantMoveStrategyOptions, MerchantStrategy } from "../merchant/strategy.js"
import { Strategist, Strategy } from "./context.js"
import { BaseAttackStrategy } from "./strategies/attack.js"
import { MageAttackStrategy } from "./strategies/attack_mage.js"
import { PaladinAttackStrategy } from "./strategies/attack_paladin.js"
import { PriestAttackStrategy } from "./strategies/attack_priest.js"
import { RangerAttackStrategy } from "./strategies/attack_ranger.js"
import { RogueAttackStrategy } from "./strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "./strategies/attack_warrior.js"
import { AvoidStackingStrategy } from "./strategies/avoid_stacking.js"
import { MoveToBankAndDepositStuffStrategy } from "./strategies/bank.js"
import { BaseStrategy } from "./strategies/base.js"
import { BuyStrategy } from "./strategies/buy.js"
import { ChargeStrategy } from "./strategies/charge.js"
import { OptimizeItemsStrategy } from "./strategies/item.js"
import { GetHolidaySpiritStrategy, ImprovedMoveStrategy } from "./strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategies/party.js"
import { PartyHealStrategy } from "./strategies/partyheal.js"
import { RespawnStrategy } from "./strategies/respawn.js"
import { GiveRogueSpeedStrategy } from "./strategies/rspeed.js"
import { SellStrategy } from "./strategies/sell.js"
import { ToggleStandStrategy } from "./strategies/stand.js"
import { TrackerStrategy } from "./strategies/tracker.js"

// Variables
const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

// Strategies
const avoidStackingStrategy = new AvoidStackingStrategy()
const bankStrategy = new MoveToBankAndDepositStuffStrategy({
    invisibleRogue: true,
    map: "bank_b"
})
const baseStrategy = new BaseStrategy(CONTEXTS)
const chargeStrategy = new ChargeStrategy()
const getHolidaySpiritStrategy = new GetHolidaySpiritStrategy()
const partyHealStrategy = new PartyHealStrategy(CONTEXTS)
const respawnStrategy = new RespawnStrategy()
const rSpeedStrategy = new GiveRogueSpeedStrategy()
const trackerStrategy = new TrackerStrategy()

export type RunnerOptions = {
    monster: MonsterName
    buyMap?: Map<ItemName, number>
    sellMap?: Map<ItemName, [number, number][]>
    partyLeader?: string
    ephemeral?: {
        buffer: number
    }
    merchantOverrides?: Partial<MerchantMoveStrategyOptions>
}

export function startRunner(character: PingCompensatedCharacter, options: RunnerOptions): Strategist<PingCompensatedCharacter> {
    if (options.ephemeral && options.ephemeral.buffer >= 30_000) {
        throw new Error("Please choose a buffer time for `options.ephemeral.buffer` less than 30_000")
    }

    let context: Strategist<PingCompensatedCharacter>
    let attackStrategy: BaseAttackStrategy<PingCompensatedCharacter>
    switch (character.ctype) {
        case "mage":
            context = new Strategist<Mage>(character as Mage, baseStrategy)
            attackStrategy = new MageAttackStrategy({ type: options.monster, contexts: CONTEXTS })
            break
        case "merchant":
        {
            context = new Strategist<Merchant>(character as Merchant, baseStrategy)
            break
        }
        case "paladin":
            context = new Strategist<Paladin>(character as Paladin, baseStrategy)
            attackStrategy = new PaladinAttackStrategy({ type: options.monster, contexts: CONTEXTS })
            break
        case "priest":
            context = new Strategist<Priest>(character as Priest, baseStrategy)
            attackStrategy = new PriestAttackStrategy({ type: options.monster, contexts: CONTEXTS })
            context.applyStrategy(partyHealStrategy)
            break
        case "ranger":
            context = new Strategist<Ranger>(character as Ranger, baseStrategy)
            attackStrategy = new RangerAttackStrategy({ type: options.monster, contexts: CONTEXTS })
            break
        case "rogue":
            context = new Strategist<Rogue>(character as Rogue, baseStrategy)
            attackStrategy = new RogueAttackStrategy({ type: options.monster, contexts: CONTEXTS })
            context.applyStrategy(rSpeedStrategy)
            break
        case "warrior":
            context = new Strategist<Warrior>(character as Warrior, baseStrategy)
            attackStrategy = new WarriorAttackStrategy({ type: options.monster, contexts: CONTEXTS })
            context.applyStrategy(chargeStrategy)
            break
        default:
            context = new Strategist<PingCompensatedCharacter>(character as PingCompensatedCharacter, baseStrategy)
            break
    }

    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(new BuyStrategy({
        buyMap: options.buyMap,
        replenishables: new Map<ItemName, number>([
            ["hpot1", 2500],
            ["mpot1", 2500],
            ["xptome", 1],
        ])
    }))
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(new OptimizeItemsStrategy({
        contexts: CONTEXTS,
        itemsToHold: context.bot.ctype == "merchant" ? DEFAULT_MERCHANT_ITEMS_TO_HOLD : DEFAULT_ITEMS_TO_HOLD,
        itemsToSell: new Set<ItemName>(options.sellMap.keys())
    }))
    context.applyStrategy(new SellStrategy({
        sellMap: options.sellMap
    }))

    let moveStrategy: Strategy<PingCompensatedCharacter>
    if (character.ctype !== "merchant") {
        moveStrategy = new ImprovedMoveStrategy(options.monster)

        if (options.partyLeader) {
            if (character.id == options.partyLeader) {
                context.applyStrategy(new AcceptPartyRequestStrategy())
            } else {
                context.applyStrategy(new RequestPartyStrategy(options.partyLeader))
            }
        }
    } else {
        const defaultPosition: IPosition = {
            map: "main",
            x: randomIntFromInterval(-100, -50),
            y: randomIntFromInterval(-50, 50)
        }

        moveStrategy = new MerchantStrategy(CONTEXTS, {
            defaultPosition: defaultPosition,
            enableBuyAndUpgrade: {
                upgradeToLevel: 9
            },
            enableBuyReplenishables: {
                all: DEFAULT_REPLENISHABLES,
                merchant: new Map([
                    ["offering", 1],
                    ["cscroll0", 100],
                    ["cscroll1", 10],
                    ["cscroll2", 2],
                    ["scroll0", 100],
                    ["scroll1", 10],
                    ["scroll2", 2],
                ]),
                ratio: DEFAULT_REPLENISH_RATIO,
            },
            enableFishing: true,
            enableMining: true,
            enableOffload: {
                esize: 3,
                goldToHold: 1_000_000,
                itemsToHold: DEFAULT_ITEMS_TO_HOLD,
            },
            enableUpgrade: true,
            goldToHold: 50_000_000,
            itemsToHold: DEFAULT_MERCHANT_ITEMS_TO_HOLD,
            ...(options.merchantOverrides ?? {})
        })
        context.applyStrategy(new ToggleStandStrategy({
            offWhenMoving: true,
            onWhenNear: [
                { distance: 10, position: defaultPosition }
            ]
        }))
    }

    let lastMoveStrategy: Strategy<PingCompensatedCharacter>
    let lastAttackStrategy: Strategy<PingCompensatedCharacter>
    const logicLoop = async () => {
        try {
            if (!context.isReady() || !context.bot.ready || context.bot.rip) {
                setTimeout(async () => { logicLoop() }, 1000)
                return // Not ready
            }
            if (context.bot.S.holidayseason && !context.bot.s.holidayspirit) {
                if (moveStrategy) {
                    context.removeStrategy(moveStrategy)
                    lastMoveStrategy = undefined
                }
                context.applyStrategy(getHolidaySpiritStrategy)
                setTimeout(async () => { logicLoop() }, 1000)
                return
            }
            if (context.hasStrategy(getHolidaySpiritStrategy)) context.removeStrategy(getHolidaySpiritStrategy)

            if (context.bot.ctype !== "merchant" && context.bot.esize == 0) {
                // We're full, go deposit items in the bank
                if (attackStrategy) {
                    context.removeStrategy(attackStrategy)
                    lastAttackStrategy = undefined
                }
                if (moveStrategy) {
                    context.removeStrategy(moveStrategy)
                    lastMoveStrategy = undefined
                }

                context.applyStrategy(bankStrategy)
                setTimeout(async () => { logicLoop() }, getMsToNextMinute() + 60_000)
                return
            }
            if (context.hasStrategy(bankStrategy)) context.removeStrategy(bankStrategy)

            // Defaults
            if (moveStrategy && moveStrategy !== lastMoveStrategy) {
                context.applyStrategy(moveStrategy)
                lastMoveStrategy = moveStrategy
            }
            if (attackStrategy && attackStrategy !== lastAttackStrategy) {
                context.applyStrategy(attackStrategy)
                lastAttackStrategy = attackStrategy
            }
        } catch (e) {
            console.error(e)
        }
        setTimeout(async () => { logicLoop() }, 1000)
    }
    logicLoop()

    if (options.ephemeral) {
        const connectLoop = async () => {
            try {
                await context.reconnect()
            } catch (e) {
                console.error(e)
            } finally {
                context?.bot?.socket?.removeAllListeners("disconnect")
                setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + options.ephemeral.buffer)
            }
        }
        setTimeout(async () => { await connectLoop() }, getMsToNextMinute() + options.ephemeral.buffer)

        const disconnectLoop = async () => {
            try {
                console.log("Disconnecting...")

                context.bot.socket.removeAllListeners("disconnect")
                await context.bot.disconnect()
            } catch (e) {
                console.error(e)
            } finally {
                setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() + (60_000 - options.ephemeral.buffer))
            }
        }
        setTimeout(async () => { await disconnectLoop() }, getMsToNextMinute() - options.ephemeral.buffer)
    }

    CONTEXTS.push(context)
    return context
}

export async function startCharacterFromCredentials(userID: string, userAuth: string, characterID: string, type: CharacterType, sRegion: ServerRegion, sID: ServerIdentifier) {
    let character: PingCompensatedCharacter
    switch (type) {
        case "mage":
            character = new Mage(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        case "merchant":
            character = new Merchant(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        case "paladin":
            character = new Paladin(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        case "priest":
            character = new Priest(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        case "ranger":
            character = new Ranger(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        case "rogue":
            character = new Rogue(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        case "warrior":
            character = new Warrior(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
        default:
            character = new PingCompensatedCharacter(userID, userAuth, characterID, AL.Game.G, AL.Game.servers[sRegion][sID])
            break
    }

    await character.connect()
    return character
}

export async function startCharacterFromName(characterName: string, sRegion: ServerRegion, sID: ServerIdentifier) {
    // Update data
    await AL.Game.updateServersAndCharacters()

    const characterData = AL.Game.characters[characterName]
    if (!characterData) {
        throw Error(`Could not find a character with the name ${characterName}`)
    }
    if (characterData.online) {
        throw Error(`${characterName} is already online!`)
    }

    return await AL.Game.startCharacter(characterName, sRegion, sID)
}