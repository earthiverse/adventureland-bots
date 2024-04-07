import AL, { CharacterType, IPosition, ItemName, Mage, Merchant, MonsterName, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, ServerIdentifier, ServerRegion, Warrior } from "alclient"
import { getMsToNextMinute, randomIntFromInterval } from "../base/general.js"
import { NewMerchantStrategy, NewMerchantStrategyOptions, defaultNewMerchantStrategyOptions } from "../merchant/strategy.js"
import { Strategist, Strategy } from "./context.js"
import { BaseAttackStrategy, BaseAttackStrategyOptions } from "./strategies/attack.js"
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
import { ItemStrategy } from "./strategies/item.js"
import { MagiportOthersSmartMovingToUsStrategy } from "./strategies/magiport.js"
import { GetHolidaySpiritStrategy, GetReplenishablesStrategy, ImprovedMoveStrategy, ImprovedMoveStrategyOptions } from "./strategies/move.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategies/party.js"
import { PartyHealStrategy } from "./strategies/partyheal.js"
import { RespawnStrategy } from "./strategies/respawn.js"
import { GiveRogueSpeedStrategy } from "./strategies/rspeed.js"
import { SellStrategy } from "./strategies/sell.js"
import { ToggleStandStrategy } from "./strategies/stand.js"
import { TrackerStrategy } from "./strategies/tracker.js"
import { ItemConfig } from "../base/itemsNew.js"
import { DestroyStrategy } from "./strategies/destroy.js"

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
const magiportStrategy = new MagiportOthersSmartMovingToUsStrategy(CONTEXTS)
const partyHealStrategy = new PartyHealStrategy(CONTEXTS)
const respawnStrategy = new RespawnStrategy()
const rSpeedStrategy = new GiveRogueSpeedStrategy()
const trackerStrategy = new TrackerStrategy()

export type RunnerOptions = {
    monsters: MonsterName[]
    itemConfig: ItemConfig
    partyLeader?: string
    ephemeral?: {
        buffer: number
        check?: () => Promise<boolean>
    }
    attackStrategy?: BaseAttackStrategy<PingCompensatedCharacter>
    attackOverrides?: Partial<BaseAttackStrategyOptions>

    moveStrategy?: Strategy<PingCompensatedCharacter>
    moveOverrides?: Partial<ImprovedMoveStrategyOptions>

    merchantOverrides?: Partial<NewMerchantStrategyOptions>
}

const currentSetups = new Map<Strategist<PingCompensatedCharacter>, Strategy<PingCompensatedCharacter>[]>()
const swapStrategies = (context: Strategist<PingCompensatedCharacter>, strategies: Strategy<PingCompensatedCharacter>[]) => {
    // Remove old strategies that aren't in the list
    for (const strategy of currentSetups.get(context) ?? []) {
        if (strategies.includes(strategy)) continue // Keep it
        context.removeStrategy(strategy)
    }

    // Add strategies that aren't applied yet
    for (const strategy of strategies) {
        if (context.hasStrategy(strategy)) continue // Already have it
        context.applyStrategy(strategy)
    }

    // Save strategy list
    currentSetups.set(context, strategies)
}

export async function startRunner(character: PingCompensatedCharacter, options: RunnerOptions): Promise<Strategist<PingCompensatedCharacter>> {
    if (options.ephemeral && options.ephemeral.buffer >= 30_000) {
        throw new Error("Please choose a buffer time for `options.ephemeral.buffer` less than 30_000")
    }

    if (options.ephemeral?.check && (!(await options.ephemeral.check()))) {
        // Prevent from starting for a minute
        setTimeout(() => { startRunner(character, options).catch(console.error) }, getMsToNextMinute() + options.ephemeral.buffer)
        return
    }

    let context: Strategist<PingCompensatedCharacter>
    let attackStrategy: BaseAttackStrategy<PingCompensatedCharacter>
    switch (character.ctype) {
        case "mage":
            context = new Strategist<Mage>(character as Mage, baseStrategy)
            attackStrategy = options.attackStrategy ?? new MageAttackStrategy({ typeList: options.monsters, contexts: CONTEXTS })
            context.applyStrategy(magiportStrategy)
            break
        case "merchant": {
            context = new Strategist<Merchant>(character as Merchant, baseStrategy)
            break
        }
        case "paladin":
            context = new Strategist<Paladin>(character as Paladin, baseStrategy)
            attackStrategy = options.attackStrategy ?? new PaladinAttackStrategy({ typeList: options.monsters, contexts: CONTEXTS, ...(options.attackOverrides ?? {}) })
            break
        case "priest":
            context = new Strategist<Priest>(character as Priest, baseStrategy)
            attackStrategy = options.attackStrategy ?? new PriestAttackStrategy({ typeList: options.monsters, contexts: CONTEXTS, ...(options.attackOverrides ?? {}) })
            context.applyStrategy(partyHealStrategy)
            break
        case "ranger":
            context = new Strategist<Ranger>(character as Ranger, baseStrategy)
            attackStrategy = options.attackStrategy ?? new RangerAttackStrategy({ typeList: options.monsters, contexts: CONTEXTS, ...(options.attackOverrides ?? {}) })
            break
        case "rogue":
            context = new Strategist<Rogue>(character as Rogue, baseStrategy)
            attackStrategy = options.attackStrategy ?? new RogueAttackStrategy({ typeList: options.monsters, contexts: CONTEXTS, ...(options.attackOverrides ?? {}) })
            context.applyStrategy(rSpeedStrategy)
            break
        case "warrior":
            context = new Strategist<Warrior>(character as Warrior, baseStrategy)
            attackStrategy = options.attackStrategy ?? new WarriorAttackStrategy({ typeList: options.monsters, contexts: CONTEXTS, ...(options.attackOverrides ?? {}) })
            context.applyStrategy(chargeStrategy)
            break
        default:
            context = new Strategist<PingCompensatedCharacter>(character, baseStrategy)
            break
    }

    context.applyStrategy(avoidStackingStrategy)
    context.applyStrategy(new BuyStrategy({ contexts: CONTEXTS, itemConfig: options.itemConfig }))
    context.applyStrategy(trackerStrategy)
    context.applyStrategy(respawnStrategy)
    context.applyStrategy(new ItemStrategy({ contexts: CONTEXTS, itemConfig: options.itemConfig }))
    context.applyStrategy(new DestroyStrategy({ itemConfig: options.itemConfig }))
    context.applyStrategy(new SellStrategy({ itemConfig: options.itemConfig }))

    // TODO: Replace `replenishables` in GetReplenishablesStrategy with itemConfig
    const REPLENISHABLES = new Map<ItemName, number>()
    for (const key in options.itemConfig) {
        const itemName = key as ItemName
        const config = options.itemConfig[itemName]
        if (!config.replenish) continue
        REPLENISHABLES.set(itemName, config.replenish)
    }
    const getReplenishablesStrategy = new GetReplenishablesStrategy({
        contexts: CONTEXTS,
        replenishables: REPLENISHABLES
    })

    let moveStrategy: Strategy<PingCompensatedCharacter>
    if (character.ctype !== "merchant") {
        moveStrategy = options.moveStrategy ?? new ImprovedMoveStrategy(options.monsters, { ...(options.moveOverrides ?? {}) })

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

        moveStrategy = new NewMerchantStrategy({
            ...defaultNewMerchantStrategyOptions,
            ...(options.merchantOverrides ?? {}),
            itemConfig: options.itemConfig,
            defaultPosition: defaultPosition,
            goldToHold: 50_000_000
        })
        context.applyStrategy(new ToggleStandStrategy({
            offWhenMoving: true,
            onWhenNear: [
                { distance: 10, position: defaultPosition }
            ]
        }))
    }

    const logicLoop = async () => {
        try {
            if (!context.isReady() || !context.bot.ready || context.bot.rip) {
                return
            }

            // Holiday Spirit
            if (context.bot.S.holidayseason && !context.bot.s.holidayspirit) {
                swapStrategies(context, [getHolidaySpiritStrategy])
                return
            }

            // Full of items
            if (context.bot.esize <= 0) {
                swapStrategies(context, [bankStrategy])
                return
            }

            // Need replenishables
            for (const [item, numHold] of REPLENISHABLES) {
                const numHas = context.bot.countItem(item, context.bot.items)
                if (numHas > (numHold / 4)) continue // We have more 25% of the amount we want
                const numWant = numHold - numHas
                if (!context.bot.canBuy(item, { ignoreLocation: true, quantity: numWant })) continue // We can't buy enough, don't go to buy them

                swapStrategies(context, [getReplenishablesStrategy])
                continue
            }

            if (context.bot.ctype === "merchant") {
                // Idle
                swapStrategies(context, [moveStrategy])
            } else {
                // Farm
                swapStrategies(context, [moveStrategy, attackStrategy])
            }
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(async () => { logicLoop() }, 1000)
        }
    }
    logicLoop()

    if (options.ephemeral) {
        const connectLoop = async () => {
            try {
                if (options.ephemeral?.check && (!(await options.ephemeral.check()))) {
                    // Prevent from starting
                    return
                }
                await context.reconnect(false)
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