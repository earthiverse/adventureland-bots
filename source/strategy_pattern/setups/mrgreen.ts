import {
    Character,
    Database,
    IPosition,
    NPCModel,
    PingCompensatedCharacter,
    ServerInfoDataLive,
    Warrior,
} from "alclient"
import { offsetPositionParty } from "../../base/locations.js"
import { getMsToDeath } from "../../base/timetokill.js"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PaladinAttackStrategy } from "../strategies/attack_paladin.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { RangerAttackStrategy } from "../strategies/attack_ranger.js"
import { RogueAttackStrategy } from "../strategies/attack_rogue.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { CharacterConfig, Setup } from "./base.js"
import { RETURN_HIGHEST } from "./equipment.js"

class MrGreenMoveStrategy extends ImprovedMoveStrategy {
    protected async move(bot: Character): Promise<void> {
        if (
            Database.connection &&
            bot.S.mrgreen &&
            (bot.S.mrgreen as ServerInfoDataLive).live &&
            (bot.S.mrgreen as ServerInfoDataLive).hp < 2_000_000
        ) {
            let kane: IPosition = bot.players.get("$Kane")
            if (!kane) {
                kane = await NPCModel.findOne(
                    {
                        name: "Kane",
                        serverRegion: bot.serverData.region,
                        serverIdentifier: bot.serverData.name,
                    },
                    {
                        _id: 0,
                        map: 1,
                        x: 1,
                        y: 1,
                    },
                )
                    .lean()
                    .exec()
            }
            if (kane) {
                await bot.smartMove(offsetPositionParty(kane, bot), { avoidTownWarps: true, useBlink: true })
                return
            }
        }
        return super.move(bot)
    }
}

class WarriorMrGreenAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        if (bot.serverData.name === "PVP") {
            // No Splash Damage
            this.options.disableCleave = true
            delete this.options.enableEquipForCleave
            delete this.options.enableGreedyAggro
        } else {
            // Additional Cleave Damage
            delete this.options.disableCleave
            this.options.enableEquipForCleave = true
            this.options.enableGreedyAggro = true
        }
        super.onApply(bot)
    }

    protected shouldAttack(bot: Character): boolean {
        const mrgreen = bot.getEntity({ type: "mrgreen" })
        if (!bot.s.coop || bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrgreen && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrgreen)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

class MageMrGreenAttackStrategy extends MageAttackStrategy {
    protected shouldAttack(bot: Character): boolean {
        const mrgreen = bot.getEntity({ type: "mrgreen" })
        if (!bot.s.coop || bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrgreen && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrgreen)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

class PriestMrGreenAttackStrategy extends PriestAttackStrategy {
    protected shouldAttack(bot: Character): boolean {
        const mrgreen = bot.getEntity({ type: "mrgreen" })
        if (!bot.s.coop || bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrgreen && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrgreen)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

export function constructMrGreenSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new MrGreenMoveStrategy("mrgreen")

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageMrGreenAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            disableZapper: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: { mainhand: { name: "firestaff", filters: RETURN_HIGHEST } },
            },
            type: "mrgreen",
        }),
        move: moveStrategy,
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestMrGreenAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableGreedyAggro: true,
            enableHealStrangers: true,
            generateEnsureEquipped: {
                attributes: ["armor", "int", "attack"],
                prefer: {
                    mainhand: { name: "firestaff", filters: RETURN_HIGHEST },
                },
            },
            type: "mrgreen",
        }),
        move: moveStrategy,
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorMrGreenAttackStrategy({
            contexts: contexts,
            disableCleave: true,
            generateEnsureEquipped: {
                attributes: ["armor", "str", "attack"],
                prefer: {
                    mainhand: { name: "fireblade", filters: RETURN_HIGHEST },
                    offhand: { name: "fireblade", filters: RETURN_HIGHEST },
                },
            },
            type: "mrgreen",
        }),
        move: moveStrategy,
    }

    return {
        configs: [
            {
                id: "mrgreen_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "mrgreen_mage,priest",
                characters: [priestConfig, mageConfig],
            },
            {
                id: "mrgreen_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
        ],
    }
}

export function constructMrGreenHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    return {
        configs: [
            {
                id: "mrgreen_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "int", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "int", "attack"] },
                            disableAbsorb: true,
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "dex", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            generateEnsureEquipped: { attributes: ["armor", "dex", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
            {
                id: "mrgreen_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCleave: true,
                            generateEnsureEquipped: { attributes: ["armor", "str", "attack"] },
                            type: "mrgreen",
                            hasTarget: true,
                        }),
                        move: new ImprovedMoveStrategy("mrgreen"),
                    },
                ],
            },
        ],
    }
}
