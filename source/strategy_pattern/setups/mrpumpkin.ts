import {
    Character,
    Database,
    IPosition,
    Mage,
    MonsterName,
    NPCModel,
    PingCompensatedCharacter,
    Priest,
    Rogue,
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
import { UNEQUIP } from "./equipment.js"

const NON_PVP_MONSTERS: MonsterName[] = ["mrpumpkin", "phoenix", "xscorpion", "minimush", "tinyp"]

class MrPumpkinMoveStrategy extends ImprovedMoveStrategy {
    protected async move(bot: Character): Promise<void> {
        if (
            Database.connection &&
            bot.S.mrpumpkin &&
            (bot.S.mrpumpkin as ServerInfoDataLive).live &&
            (bot.S.mrpumpkin as ServerInfoDataLive).hp < 1_250_000
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

class MageMrPumpkinAttackStrategy extends MageAttackStrategy {
    public onApply(bot: Mage): void {
        this.options.generateEnsureEquipped.prefer = this.options.generateEnsureEquipped.prefer ?? {}
        if (bot.isPVP() || !(bot.hasItem("gstaff") || bot.isEquipped("gstaff"))) {
            // No splash damage
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "firestaff",
                filters: { returnHighestLevel: true },
            }
            this.options.generateEnsureEquipped.prefer.offhand = {
                name: "wbookhs",
                filters: { returnHighestLevel: true },
            }
        } else {
            // Splash damage & additional monsters
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "gstaff",
                filters: { returnHighestLevel: true },
            }
            this.options.generateEnsureEquipped.prefer.offhand = UNEQUIP
        }

        super.onApply(bot)
        if (bot.isPVP()) {
            this.options.typeList = ["mrpumpkin"]
            delete this.options.enableGreedyAggro
        } else {
            this.options.typeList = NON_PVP_MONSTERS
            this.options.enableGreedyAggro = ["minimush"]
            this.options.maximumTargets = bot.mcourage
        }
    }

    protected shouldAttack(bot: Character): boolean {
        const mrpumpkin = bot.getEntity({ type: "mrpumpkin" })
        if (!bot.s.coop || (bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000)) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrpumpkin && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrpumpkin)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

class PriestMrPumpkinAttackStrategy extends PriestAttackStrategy {
    public onApply(bot: Priest): void {
        this.options.generateEnsureEquipped.prefer = this.options.generateEnsureEquipped.prefer ?? {}
        this.options.generateEnsureEquipped.prefer.orb = { name: "jacko", filters: { returnHighestLevel: true } }

        if (bot.serverData.name === "PVP" || !(bot.hasItem("zapper") || bot.isEquipped("zapper"))) {
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
        } else {
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
        }

        super.onApply(bot)
        if (bot.isPVP()) {
            this.options.typeList = ["mrpumpkin"]
            delete this.options.enableGreedyAggro
        } else {
            this.options.typeList = NON_PVP_MONSTERS
            this.options.enableGreedyAggro = ["minimush"]
            this.options.maximumTargets = bot.mcourage
        }
    }

    protected shouldAttack(bot: Character): boolean {
        const mrpumpkin = bot.getEntity({ type: "mrpumpkin" })
        if (!bot.s.coop || (bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000)) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrpumpkin && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrpumpkin)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

class RogueMrPumpkinAttackStrategy extends RogueAttackStrategy {
    public onApply(bot: Rogue): void {
        this.options.generateEnsureEquipped.prefer = this.options.generateEnsureEquipped.prefer ?? {}
        this.options.generateEnsureEquipped.prefer.orb = { name: "jacko", filters: { returnHighestLevel: true } }

        if (bot.serverData.name === "PVP" || !(bot.hasItem("zapper") || bot.isEquipped("zapper"))) {
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "cring", filters: { returnHighestLevel: true } }
        } else {
            this.options.generateEnsureEquipped.prefer.ring1 = { name: "zapper", filters: { returnHighestLevel: true } }
        }

        super.onApply(bot)
        if (bot.isPVP()) {
            this.options.typeList = ["mrpumpkin"]
        } else {
            this.options.typeList = NON_PVP_MONSTERS
        }
    }

    protected shouldAttack(bot: Character): boolean {
        const mrpumpkin = bot.getEntity({ type: "mrpumpkin" })
        if (!bot.s.coop || (bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000)) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrpumpkin && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrpumpkin)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

class WarriorMrPumpkinAttackStrategy extends WarriorAttackStrategy {
    public onApply(bot: Warrior): void {
        this.options.generateEnsureEquipped.prefer = this.options.generateEnsureEquipped.prefer ?? {}
        if (
            bot.isPVP() ||
            !(
                (bot.hasItem("vhammer") || bot.isEquipped("vhammer")) &&
                (bot.hasItem("ololipop") || bot.isEquipped("ololipop"))
            )
        ) {
            // No Splash Damage
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "fireblade",
                filters: { returnHighestLevel: true },
            }
            this.options.generateEnsureEquipped.prefer.offhand = {
                name: "fireblade",
                filters: { returnHighestLevel: true },
            }
        } else {
            // Splash Damage & additional monsters
            this.options.generateEnsureEquipped.prefer.mainhand = {
                name: "vhammer",
                filters: { returnHighestLevel: true },
            }
            this.options.generateEnsureEquipped.prefer.offhand = {
                name: "ololipop",
                filters: { returnHighestLevel: true },
            }
        }

        super.onApply(bot)
        if (bot.isPVP()) {
            this.options.disableCleave = true
            delete this.options.enableEquipForCleave
            this.options.typeList = ["mrpumpkin"]
            delete this.options.enableGreedyAggro
        } else {
            delete this.options.disableCleave
            this.options.enableEquipForCleave = true
            this.options.typeList = ["mrpumpkin", "phoenix", "xscorpion", "tinyp"]
            this.options.enableGreedyAggro = ["mrpumpkin", "xscorpion"]
        }
    }

    protected shouldAttack(bot: Character): boolean {
        const mrpumpkin = bot.getEntity({ type: "mrpumpkin" })
        if (!bot.s.coop || (bot.s.coop.ms < 10_000 || bot.s.coop.p < 300_000)) {
            return super.shouldAttack(bot) // Low time remaining, or might lose contribution bonus
        }
        if (mrpumpkin && bot.s.hopsickness && bot.s.hopsickness.ms + 10_000 > getMsToDeath(mrpumpkin)) {
            return false // Stop attacking, we won't be off hopsickness before it dies
        }
        return super.shouldAttack(bot)
    }
}

export function constructMrPumpkinSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new MrPumpkinMoveStrategy("mrpumpkin", { idlePosition: { map: "halloween", x: -250, y: 725 } })

    const mageConfig: CharacterConfig = {
        ctype: "mage",
        attack: new MageMrPumpkinAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            disableZapper: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "int", "attack"],
            },
        }),
        move: moveStrategy,
        require: {
            items: ["firestaff", "wbookhs"],
        },
    }

    const priestConfig: CharacterConfig = {
        ctype: "priest",
        attack: new PriestMrPumpkinAttackStrategy({
            contexts: contexts,
            disableEnergize: true,
            enableGreedyAggro: true,
            generateEnsureEquipped: {
                attributes: ["resistance", "int", "attack"],
            },
        }),
        move: moveStrategy,
        require: {
            items: ["jacko", "cring"],
        },
    }

    const warriorConfig: CharacterConfig = {
        ctype: "warrior",
        attack: new WarriorMrPumpkinAttackStrategy({
            contexts: contexts,
            generateEnsureEquipped: {
                attributes: ["resistance", "str", "attack"],
            },
        }),
        move: moveStrategy,
        require: {
            // TODO: We don't have a way to require 2 of a given item, but we require 2
            items: ["fireblade"],
        },
    }

    return {
        configs: [
            {
                id: "mrpumpkin_mage,priest,warrior",
                characters: [mageConfig, priestConfig, warriorConfig],
            },
            {
                id: "mrpumpkin_priest,warrior",
                characters: [priestConfig, warriorConfig],
            },
        ],
    }
}

export function constructMrPumpkinHelperSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new ImprovedMoveStrategy("mrpumpkin")

    return {
        configs: [
            {
                id: "mrpumpkin_mage",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            type: "mrpumpkin",
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "mrpumpkin_paladin",
                characters: [
                    {
                        ctype: "paladin",
                        attack: new PaladinAttackStrategy({
                            contexts: contexts,
                            type: "mrpumpkin",
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "mrpumpkin_priest",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableAbsorb: true,
                            type: "mrpumpkin",
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "mrpumpkin_ranger",
                characters: [
                    {
                        ctype: "ranger",
                        attack: new RangerAttackStrategy({
                            contexts: contexts,
                            type: "mrpumpkin",
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "mrpumpkin_rogue",
                characters: [
                    {
                        ctype: "rogue",
                        attack: new RogueAttackStrategy({
                            contexts: contexts,
                            type: "mrpumpkin",
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
            {
                id: "mrpumpkin_warrior",
                characters: [
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            disableAgitate: true,
                            disableCleave: true,
                            type: "mrpumpkin",
                            hasTarget: true,
                        }),
                        move: moveStrategy,
                    },
                ],
            },
        ],
    }
}
