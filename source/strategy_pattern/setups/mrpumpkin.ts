import { IPosition, PingCompensatedCharacter } from "alclient"
import { Strategist } from "../context.js"
import { MageAttackStrategy } from "../strategies/attack_mage.js"
import { PriestAttackStrategy } from "../strategies/attack_priest.js"
import { WarriorAttackStrategy } from "../strategies/attack_warrior.js"
import { ImprovedMoveStrategy } from "../strategies/move.js"
import { Setup } from "./base"
import { PRIEST_ARMOR } from "./equipment.js"

export function constructMrPumpkinSetup(contexts: Strategist<PingCompensatedCharacter>[]): Setup {
    // TODO: Make a PvP safe configuration that will allow for splash damage on public servers
    //       and no splash on PvP servers

    // This is between the xscorpions and the minimushes
    const idleLocation: IPosition = { map: "halloween", x: -250, y: 725 }

    return {
        configs: [
            {
                id: "mrpumpkin_mage,priest,warrior",
                characters: [
                    {
                        ctype: "mage",
                        attack: new MageAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            disableZapper: true,
                            ensureEquipped: {
                                mainhand: { name: "firestaff", filters: { returnHighestLevel: true } },
                                offhand: { name: "wbookhs", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            type: "mrpumpkin",
                        }),
                        move: new ImprovedMoveStrategy("mrpumpkin", { idlePosition: idleLocation })
                    },
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "mrpumpkin",
                        }),
                        move: new ImprovedMoveStrategy("mrpumpkin", { idlePosition: idleLocation })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: {
                                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            type: "mrpumpkin",
                        }),
                        move: new ImprovedMoveStrategy("mrpumpkin", { idlePosition: idleLocation })
                    }
                ]
            },
            {
                id: "mrpumpkin_priest,warrior",
                characters: [
                    {
                        ctype: "priest",
                        attack: new PriestAttackStrategy({
                            contexts: contexts,
                            disableEnergize: true,
                            enableGreedyAggro: true,
                            ensureEquipped: PRIEST_ARMOR,
                            type: "mrpumpkin",
                        }),
                        move: new ImprovedMoveStrategy("mrpumpkin", { idlePosition: idleLocation })
                    },
                    {
                        ctype: "warrior",
                        attack: new WarriorAttackStrategy({
                            contexts: contexts,
                            ensureEquipped: {
                                mainhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                offhand: { name: "fireblade", filters: { returnHighestLevel: true } },
                                orb: { name: "jacko", filters: { returnHighestLevel: true } }
                            },
                            type: "mrpumpkin",
                        }),
                        move: new ImprovedMoveStrategy("mrpumpkin", { idlePosition: idleLocation })
                    }
                ]
            }
        ]
    }
}