import { IPosition, Mage, MonsterName, PingCompensatedCharacter, Priest, Tools, Warrior } from "alclient"
import { KiteMonsterMoveStrategy } from "../strategies/move.js"
import { Strategist, filterContexts } from "../context.js"
import { bankingPosition, getClosestBotToPosition } from "../../base/locations.js"
import { goAndWithdrawItem, locateItemsInBank } from "../../base/banking.js"
import { MageAttackStrategy, MageAttackStrategyOptions } from "../strategies/attack_mage.js"
import { PriestAttackStrategy, PriestAttackStrategyOptions } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy, WarriorAttackStrategyOptions } from "../strategies/attack_warrior.js"
import { Setup } from "./base.js"

export const XMAGE_MONSTERS: MonsterName[] = ["xmagefz", "xmagefi", "xmagen", "xmagex"]
export const DOWNTIME_MONSTERS: MonsterName[] = ["snowman", "arcticbee"]

class XMageMoveStrategy extends KiteMonsterMoveStrategy {
    public constructor(contexts: Strategist<PingCompensatedCharacter>[]) {
        super({
            contexts: contexts,
            typeList: XMAGE_MONSTERS,
        })

        // Only include winter instance map positions
        this.spawns = this.spawns.filter((p) => p.map === "winter_instance")
    }

    protected async move(bot: PingCompensatedCharacter): Promise<IPosition> {
        const friends = filterContexts(this.options.contexts, { serverData: bot.serverData })
            .map((e) => e.bot)
            .filter((c) => c.ctype !== "merchant")

        // Ensure we have a fieldgen ready
        const groupHasFieldgen = this.groupHasFieldgen(friends)
        const placedFieldgen = this.getPlacedFieldgen(friends)
        if (!groupHasFieldgen && !placedFieldgen) {
            // Have bots idle somewhere safe
            this.options.typeList = DOWNTIME_MONSTERS

            if (!groupHasFieldgen) {
                // Have a bot go get a fieldgen
                const closestBot = getClosestBotToPosition(bankingPosition, friends)
                if (closestBot === bot) {
                    await bot.smartMove(bankingPosition)
                    const bankFieldgens = locateItemsInBank(bot, { name: "fieldgen0" })
                    if (bankFieldgens.length) {
                        const [packName, indexes] = bankFieldgens[0]
                        await goAndWithdrawItem(bot, packName, indexes[0])
                    }
                }
            }
            return
        }

        // Have priest heal the fieldgen if we've placed one
        if (bot.ctype === "priest" && placedFieldgen && placedFieldgen.hp < placedFieldgen.max_hp * 0.75) {
            if (Tools.distance(bot, placedFieldgen) > bot.range) {
                return bot.smartMove(placedFieldgen, { getWithin: bot.range / 2, resolveOnFinalMoveStart: true })
            }
        }

        // Place the fieldgen if we're on xmagex
        const xmage = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (xmage.type === "xmagex" && groupHasFieldgen && !placedFieldgen) {
            await this.placeFieldGen(friends)
        }

        // Go to xmage
        return super.move(bot)
    }

    protected groupHasFieldgen(friends: PingCompensatedCharacter[]) {
        for (const friend of friends) {
            if (friend.hasItem("fieldgen0")) {
                return true
            }
        }
        return false
    }

    protected getPlacedFieldgen(friends: PingCompensatedCharacter[]) {
        for (const friend of friends) {
            if (friend.map !== "winter_instance") continue
            const entity = friend.getEntity({ type: "fieldgen0" })
            if (entity) return entity
        }
    }

    protected async placeFieldGen(friends: PingCompensatedCharacter[]) {
        for (const friend of friends) {
            if (friend.map !== "winter_instance") continue
            const fieldgen = friend.locateItem("fieldgen0")
            if (!fieldgen) continue
            return friend.equip(fieldgen)
        }
    }
}

class MageXMageAttackStrategy extends MageAttackStrategy {
    public constructor(options?: MageAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance", "int"],
            prefer: {
                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } },
            },
        }
        this.options.targetingPartyMember = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Mage): Promise<void> {
        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        switch (entity.type) {
            case "xmagefi":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagefz":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagen":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
            case "xmagex":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
        }

        return super.attack(bot)
    }
}

class PriestXMageAttackStrategy extends PriestAttackStrategy {
    public constructor(options?: PriestAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance", "int"],
            prefer: {
                mainhand: { name: "lmace", filters: { returnHighestLevel: true } },
                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } },
            },
        }
        this.options.enableAbsorbToTank = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Priest): Promise<void> {
        // If there's a fieldgen and it needs healing, heal it
        const fieldGen = bot.getEntity({ type: "fieldgen0", withinRange: "attack" })
        if (fieldGen && fieldGen.hp < fieldGen.max_hp * 0.75) {
            await bot.healSkill(fieldGen.id)
        }

        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        switch (entity.type) {
            case "xmagefi":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagefz":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagen":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
            case "xmagex":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
        }

        return super.attack(bot)
    }
}

class WarriorXMageAttackStrategy extends WarriorAttackStrategy {
    public constructor(options?: WarriorAttackStrategyOptions) {
        super(options)

        this.options.generateEnsureEquipped = {
            attributes: ["resistance", "str"],
            prefer: {
                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                orb: { name: "jacko", filters: { returnHighestLevel: true } },
            },
        }
        this.options.targetingPartyMember = true
        this.options.typeList = XMAGE_MONSTERS
    }

    protected async attack(bot: Warrior): Promise<void> {
        const entity = bot.getEntity({ typeList: XMAGE_MONSTERS })
        if (!entity) return super.attack(bot)

        switch (entity.type) {
            case "xmagefi":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagefz":
                this.options.ensureEquipped.orb = { name: "test_orb" }
                break
            case "xmagen":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
            case "xmagex":
                this.options.ensureEquipped.orb = { name: "jacko" }
                break
        }

        return super.attack(bot)
    }
}

export function constructXMageSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    const moveStrategy = new XMageMoveStrategy(contexts)

    return {
        configs: [
            {
                id: "xmage_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageXMageAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"],
                        },
                    },
                    {
                        ctype: "priest",
                        attack: new PriestXMageAttackStrategy({
                            contexts: contexts,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"],
                        },
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorXMageAttackStrategy({
                            contexts: contexts,
                            enableEquipForCleave: true,
                        }),
                        move: moveStrategy,
                        require: {
                            items: ["jacko", "test_orb"],
                        },
                    },
                ],
            },
        ],
    }
}
