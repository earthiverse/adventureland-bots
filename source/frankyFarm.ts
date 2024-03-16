import AL, { Mage, Paladin, PingCompensatedCharacter, Priest, Ranger, Rogue, ServerIdentifier, ServerRegion, Warrior } from "alclient"
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

const frankyMoveStrategy = new ImprovedMoveStrategy("franky", { idlePosition: frankyIdlePosition })

class PaladinMummyFarmStrategy extends PaladinAttackStrategy {
    protected async attack(bot: Paladin): Promise<void> {
        const franky = bot.getEntity({ type: "franky", withinRange: "attack", hasTarget: true })

        // Attack franky if we don't have coop points
        if (franky && !bot.s.coop) {
            await bot.basicAttack(franky.id)
            return
        }

        await super.attack(bot)
    }
}
const paladinMummyFarmStrategy = new PaladinMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    typeList: ["nerfedmummy"]
})

class PriestMummyFarmStrategy extends PriestAttackStrategy {
    protected async attack(bot: Priest): Promise<void> {
        const franky = bot.getEntity({ type: "franky", withinRange: "heal", hasTarget: true })

        // Heal franky if he's low
        if (franky && franky.max_hp - franky.hp > bot.heal) {
            await bot.healSkill(franky.id)
            return
        }

        // Attack franky if we don't have coop points
        if (franky && !bot.s.coop) {
            await bot.basicAttack(franky.id)
            return
        }

        return super.attack(bot)
    }
}
const priestMummyFarmStrategy = new PriestMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    typeList: ["nerfedmummy"]
})

class RangerMummyFarmStrategy extends RangerAttackStrategy {
    protected async attack(bot: Ranger): Promise<void> {
        const franky = bot.getEntity({ type: "franky", withinRange: "attack", hasTarget: true })

        // Attack franky if we don't have coop points
        if (franky && !bot.s.coop) {
            await bot.basicAttack(franky.id)
            return
        }

        await super.attack(bot)
    }
}
const rangerMummyFarmStrategy = new RangerMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    typeList: ["nerfedmummy"]
})

class RogueMummyFarmStrategy extends RogueAttackStrategy {
    protected async attack(bot: Rogue): Promise<void> {
        const franky = bot.getEntity({ type: "franky", withinRange: "attack", hasTarget: true })

        // Attack franky if we don't have coop points
        if (franky && !bot.s.coop) {
            await bot.basicAttack(franky.id)
            return
        }

        await super.attack(bot)
    }
}
const rogueMummyFarmStrategy = new RogueMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    typeList: ["nerfedmummy"]
})

class MageMummyFarmStrategy extends MageAttackStrategy {
    protected async attack(bot: Mage): Promise<void> {
        const franky = bot.getEntity({ type: "franky", withinRange: "attack", hasTarget: true })

        // Attack franky if we don't have coop points
        if (franky && !bot.s.coop) {
            await bot.basicAttack(franky.id)
            return
        }

        await super.attack(bot)
    }
}
const mageMummyFarmStrategy = new MageMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    typeList: ["nerfedmummy"]
})

class WarriorMummyFarmStrategy extends WarriorAttackStrategy {
    protected async attack(bot: Warrior): Promise<void> {
        const franky = bot.getEntity({ type: "franky", withinRange: "attack", hasTarget: true })

        // Attack franky if we don't have coop points
        if (franky && !bot.s.coop) {
            await bot.basicAttack(franky.id)
            return
        }

        await super.attack(bot)
    }
}
const warriorMummyFarmStrategy = new WarriorMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    typeList: ["nerfedmummy"]
})

class LeaderMummyFarmStrategy extends PriestMummyFarmStrategy {
    protected async attack(bot: Priest): Promise<void> {
        // Attack franky if he doesn't have a target
        const franky = bot.getEntity({ type: "franky", withinRange: "attack", hasTarget: false })
        if (franky) {
            await bot.basicAttack(franky.id)
            return
        }

        return super.attack(bot)
    }
}
const leaderMummyFarmStrategy = new LeaderMummyFarmStrategy({
    contexts: CONTEXTS,
    disableIdleAttack: true,
    disableScare: true,
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
    ])

    if (context.bot.id !== PARTY_LEADER) context.applyStrategy(requestPartyStrategy)
}