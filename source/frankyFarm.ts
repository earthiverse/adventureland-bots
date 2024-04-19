import AL, { Game, Mage, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, ServerIdentifier, ServerRegion, Tools, Warrior } from "alclient"
import { startCharacterFromName } from "./strategy_pattern/runner.js"
import { Strategist } from "./strategy_pattern/context.js"
import { AvoidStackingStrategy } from "./strategy_pattern/strategies/avoid_stacking.js"
import { BaseStrategy } from "./strategy_pattern/strategies/base.js"
import { MagiportOthersSmartMovingToUsStrategy } from "./strategy_pattern/strategies/magiport.js"
import { PartyHealStrategy } from "./strategy_pattern/strategies/partyheal.js"
import { RespawnStrategy } from "./strategy_pattern/strategies/respawn.js"
import { TrackerStrategy } from "./strategy_pattern/strategies/tracker.js"
import { AcceptPartyRequestStrategy, RequestPartyStrategy } from "./strategy_pattern/strategies/party.js"
import { frankyIdlePosition } from "./base/locations.js"
import { ImprovedMoveStrategy } from "./strategy_pattern/strategies/move.js"
import { PriestAttackStrategy } from "./strategy_pattern/strategies/attack_priest.js"
import { RangerAttackStrategy } from "./strategy_pattern/strategies/attack_ranger.js"
import { MageAttackStrategy } from "./strategy_pattern/strategies/attack_mage.js"
import { WarriorAttackStrategy } from "./strategy_pattern/strategies/attack_warrior.js"
import { ChargeStrategy } from "./strategy_pattern/strategies/charge.js"
import { RogueAttackStrategy } from "./strategy_pattern/strategies/attack_rogue.js"
import { GiveRogueSpeedStrategy } from "./strategy_pattern/strategies/rspeed.js"
import { PaladinAttackStrategy } from "./strategy_pattern/strategies/attack_paladin.js"
import { suppress_errors } from "./strategy_pattern/logging.js"
import { BuyStrategy } from "./strategy_pattern/strategies/buy.js"
import { REPLENISH_ITEM_CONFIG } from "./base/itemsNew.js"

const CREDENTIALS = "../credentials.json"
const CHARACTERS = ["earthPri", "earthiverse", "earthMag"]
const SERVER_REGION: ServerRegion = "US"
const SERVER_IDENTIFIER: ServerIdentifier = "PVP"
const PARTY_LEADER = "earthPri"

const CONTEXTS: Strategist<PingCompensatedCharacter>[] = []

await Promise.all([AL.Game.loginJSONFile(CREDENTIALS, false), AL.Game.getGData(true)])
await AL.Pathfinder.prepare(AL.Game.G)

// Strategies
const avoidStackingStrategy = new AvoidStackingStrategy()
const baseStrategy = new BaseStrategy(CONTEXTS)
const chargeStrategy = new ChargeStrategy()
const magiportStrategy = new MagiportOthersSmartMovingToUsStrategy(CONTEXTS)
const partyHealStrategy = new PartyHealStrategy(CONTEXTS)
const respawnStrategy = new RespawnStrategy()
const trackerStrategy = new TrackerStrategy()
const acceptPartyRequestStrategy = new AcceptPartyRequestStrategy()
const requestPartyStrategy = new RequestPartyStrategy(PARTY_LEADER)
const rSpeedStrategy = new GiveRogueSpeedStrategy()
const buyStrategy = new BuyStrategy({
    itemConfig: REPLENISH_ITEM_CONFIG,
    contexts: CONTEXTS,
    enableBuyForProfit: true
})

const frankyMoveStrategy = new ImprovedMoveStrategy("franky", { idlePosition: frankyIdlePosition })

let LAST_ATTACK: number = 0

class PaladinMummyFarmStrategy extends PaladinAttackStrategy {
    protected async attack(bot: Paladin): Promise<void> {
        if (bot.canUse("attack")) {
            const franky = bot.getEntity({ type: "franky", withinRange: "attack" })

            if (
                franky
                && (
                    !bot.s.coop // We don't have coop points yet
                    || !franky.target // Franky has no target
                    || Date.now() - LAST_ATTACK > 10_000 // Franky despawns if the last attack isn't within 20s
                )
            ) {
                await bot.basicAttack(franky.id)
                LAST_ATTACK = Date.now()
                return
            }
        }

        await super.attack(bot)
    }
}
const paladinMummyFarmStrategy = new PaladinMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    maximumTargets: 10,
    generateEnsureEquipped: {
        attributes: ["courage", "attack"]
    },
    typeList: ["nerfedmummy"]
})

class PriestMummyFarmStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        await this.healFriendsOrSelf(bot).catch()
        if (!this.options.disableDarkBlessing) this.applyDarkBlessing(bot).catch(suppress_errors)

        if (!this.shouldAttack(bot)) {
            this.defensiveAttack(bot).catch(suppress_errors)
            return
        }

        const priority = this.botSort.get(bot.id)

        await this.ensureEquipped(bot)

        await this.frankyLogic(bot)

        if (!this.options.disableBasicAttack) await this.basicAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableAbsorb) await this.absorbTargets(bot).catch(suppress_errors)
        if (!this.options.disableZapper) await this.zapperAttack(bot, priority).catch(suppress_errors)
        if (!this.options.disableIdleAttack) await this.idleAttack(bot, priority).catch(suppress_errors)

        await this.ensureEquipped(bot)
    }

    protected async frankyLogic(bot: Priest) {
        if (!bot.canUse("heal")) return // Can't heal right now
        const franky = bot.getEntity({ type: "franky", withinRange: "attack" })
        if (!franky) return

        // Heal franky if he's low
        if (franky.max_hp - franky.hp > bot.heal) {
            await bot.healSkill(franky.id)
            return
        }

        if (
            franky
            && (
                !bot.s.coop // We don't have coop points yet
                || !franky.target // Franky has no target
                || Date.now() - LAST_ATTACK > 10_000 // Franky despawns if the last attack isn't within 20s
            )
        ) {
            await bot.basicAttack(franky.id)
            LAST_ATTACK = Date.now()
            return
        }
    }
}
const priestMummyFarmStrategy = new PriestMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    maximumTargets: 10,
    generateEnsureEquipped: {
        avoidAttributes: ["blast", "explosion"],
        attributes: ["courage", "attack"]
    },
    typeList: ["nerfedmummy"]
})

class RangerMummyFarmStrategy extends RangerAttackStrategy {
    protected async attack(bot: Ranger): Promise<void> {
        if (bot.canUse("attack")) {
            const franky = bot.getEntity({ type: "franky", withinRange: "attack" })

            if (
                franky
                && (
                    !bot.s.coop // We don't have coop points yet
                    || !franky.target // Franky has no target
                    || Date.now() - LAST_ATTACK > 10_000 // Franky despawns if the last attack isn't within 20s
                )
            ) {
                await bot.basicAttack(franky.id)
                LAST_ATTACK = Date.now()
                return
            }
        }

        await super.attack(bot)
    }
}
const rangerMummyFarmStrategy = new RangerMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    maximumTargets: 10,
    generateEnsureEquipped: {
        avoidAttributes: ["blast", "explosion"],
        attributes: ["courage", "attack"]
    },
    typeList: ["nerfedmummy"]
})

class RogueMummyFarmStrategy extends RogueAttackStrategy {
    protected async attack(bot: Rogue): Promise<void> {
        if (bot.canUse("attack")) {
            const franky = bot.getEntity({ type: "franky", withinRange: "attack" })

            if (
                franky
                && (
                    !bot.s.coop // We don't have coop points yet
                    || !franky.target // Franky has no target
                    || Date.now() - LAST_ATTACK > 10_000 // Franky despawns if the last attack isn't within 20s
                )
            ) {
                await bot.basicAttack(franky.id)
                LAST_ATTACK = Date.now()
                return
            }
        }

        await super.attack(bot)
    }
}
const rogueMummyFarmStrategy = new RogueMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    maximumTargets: 10,
    generateEnsureEquipped: {
        avoidAttributes: ["blast", "explosion"],
        attributes: ["courage", "attack"]
    },
    typeList: ["nerfedmummy"]
})

class MageMummyFarmStrategy extends MageAttackStrategy {
    protected async attack(bot: Mage): Promise<void> {
        if (bot.canUse("attack")) {
            const franky = bot.getEntity({ type: "franky", withinRange: "attack" })

            if (
                franky
                && (
                    !bot.s.coop // We don't have coop points yet
                    || !franky.target // Franky has no target
                    || Date.now() - LAST_ATTACK > 10_000 // Franky despawns if the last attack isn't within 20s
                )
            ) {
                await bot.basicAttack(franky.id)
                LAST_ATTACK = Date.now()
                return
            }
        }

        await super.attack(bot)
    }
}
const mageMummyFarmStrategy = new MageMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    maximumTargets: 10,
    generateEnsureEquipped: {
        avoidAttributes: ["blast", "explosion"],
        attributes: ["courage", "attack"]
    },
    typeList: ["nerfedmummy"]
})

class WarriorMummyFarmStrategy extends WarriorAttackStrategy {
    protected async attack(bot: Warrior): Promise<void> {
        if (bot.canUse("attack")) {
            const franky = bot.getEntity({ type: "franky", withinRange: "attack" })

            if (
                franky
                && (
                    !bot.s.coop // We don't have coop points yet
                    || !franky.target // Franky has no target
                    || Date.now() - LAST_ATTACK > 10_000 // Franky despawns if the last attack isn't within 20s
                )
            ) {
                await bot.basicAttack(franky.id)
                LAST_ATTACK = Date.now()
                return
            }
        }

        await super.attack(bot)
    }
}
const warriorMummyFarmStrategy = new WarriorMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    maximumTargets: 10,
    generateEnsureEquipped: {
        avoidAttributes: ["blast", "explosion"],
        attributes: ["courage", "attack"]
    },
    typeList: ["nerfedmummy"],
})

class LeaderMummyFarmStrategy extends PriestMummyFarmStrategy {
    protected async frankyLogic(bot: Priest): Promise<void> {
        await super.frankyLogic(bot)

        if (!bot.canUse("absorb")) return // Can't absorb

        // Take franky's target
        const franky = bot.getEntity({ type: "franky", hasTarget: true, targetingMe: false })
        if (!franky) return

        const target = bot.players.get(franky.target)
        if (!target) return
        if (Tools.distance(bot, target) > Game.G.skills.absorb.range) return

        await bot.absorbSins(target.id)
    }
}
const leaderMummyFarmStrategy = new LeaderMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    disableScare: true,
    generateEnsureEquipped: {
        avoidAttributes: ["blast", "explosion"],
        attributes: ["attack", "resistance"]
    },
    typeList: ["nerfedmummy"]
})

for (const character of CHARACTERS) {
    const bot = await startCharacterFromName(character, SERVER_REGION, SERVER_IDENTIFIER)
    let context: Strategist<PingCompensatedCharacter>
    switch (bot.ctype) {
        case "mage":
            context = new Strategist<Mage>(bot as Mage, baseStrategy)
            context.applyStrategy(magiportStrategy)
            context.applyStrategy(mageMummyFarmStrategy)
            break
        case "paladin":
            context = new Strategist<Paladin>(bot as Paladin, baseStrategy)
            context.applyStrategy(paladinMummyFarmStrategy)
            break
        case "priest":
            context = new Strategist<Priest>(bot as Priest, baseStrategy)
            context.applyStrategy(partyHealStrategy)
            if (context.bot.id === PARTY_LEADER) {
                context.applyStrategy(leaderMummyFarmStrategy)
            } else {
                context.applyStrategy(priestMummyFarmStrategy)
            }
            break
        case "ranger":
            context = new Strategist<Ranger>(bot as Ranger, baseStrategy)
            context.applyStrategy(rangerMummyFarmStrategy)
            break
        case "rogue":
            context = new Strategist<Rogue>(bot as Rogue, baseStrategy)
            context.applyStrategy(chargeStrategy)
            context.applyStrategy(rogueMummyFarmStrategy)
            context.applyStrategy(rSpeedStrategy)
            break
        case "warrior":
            context = new Strategist<Warrior>(bot as Warrior, baseStrategy)
            context.applyStrategy(chargeStrategy)
            context.applyStrategy(warriorMummyFarmStrategy)
            break
        default:
            throw new Error(`${bot.ctype} not supported`)
    }

    CONTEXTS.push(context)

    context.applyStrategies([
        acceptPartyRequestStrategy,
        avoidStackingStrategy,
        frankyMoveStrategy,
        respawnStrategy,
        trackerStrategy,
        buyStrategy
    ])

    if (context.bot.id !== PARTY_LEADER) context.applyStrategy(requestPartyStrategy)
}