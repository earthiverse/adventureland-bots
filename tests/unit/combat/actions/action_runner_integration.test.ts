import { describe, expect, it } from "bun:test"
import { EventBus } from "../../../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../../../src/core/blackboard/team_blackboard.js"
import { ActionRunner } from "../../../../src/core/actions/action_runner.js"
import type { ActionContext } from "../../../../src/core/actions/action.js"
import { createMockGData } from "../../../../src/test_support/g_data.mock.js"
import { MockCharacter } from "../../../../src/test_support/mock_character.js"

import { UsePotionAction } from "../../../../src/domain/combat/actions/shared/use_potion_action.js"
import { BasicAttackAction } from "../../../../src/domain/combat/actions/shared/basic_attack_action.js"
import { HealAction } from "../../../../src/domain/combat/actions/priest/heal_action.js"
import { TauntAction } from "../../../../src/domain/combat/actions/warrior/taunt_action.js"
import { CleaveAction } from "../../../../src/domain/combat/actions/warrior/cleave_action.js"

describe("Combat ActionRunner Integration", () => {
    const gData = createMockGData()

    function createTestContext() {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        const context: ActionContext = { blackboard, eventBus }
        return { eventBus, blackboard, context }
    }

    it("Priest dynamic priority: prioritizes Emergency Potion -> Ally Heal -> Basic Attack", async () => {
        const { blackboard, context } = createTestContext()
        const priest = new MockCharacter({ name: "PriestBot", ctype: "priest", hp: 1000, max_hp: 1000, mp: 500, max_mp: 500, range: 160 })
        priest.items = [{ name: "hpot1", q: 10 }]

        const runner = new ActionRunner()
        runner.registerAll([
            new UsePotionAction(),
            new HealAction({ healRange: 300 }),
            new BasicAttackAction({ gData }),
        ])

        // Register injured warrior on blackboard
        blackboard.updateMemberStatus({
            name: "WarriorTank",
            type: "warrior",
            map: "main",
            x: 20,
            y: 0,
            hp: 200,
            maxHp: 1000, // 20% HP (critical!)
            mp: 100,
            maxMp: 200,
            freeInventorySlots: 10,
            gold: 0,
            isReady: true,
            isDead: false,
            lastUpdated: Date.now(),
        })

        // Also have an attackable enemy nearby
        priest.entities.set("goo_1", { id: "goo_1", type: "goo", hp: 100, max_hp: 100, x: 30, y: 0 })

        // 1. Ally is in critical state, priest is full HP -> HealAction should win
        const healActionName = await runner.tick(priest, context)
        expect(healActionName).toBe("PriestHeal")
        expect(priest.calls.some((c) => c.method === "healSkill")).toBe(true)

        // Reset calls
        priest.calls = []

        // 2. Priest takes massive damage (< 25% HP) -> UsePotionAction should overtake HealAction
        priest.hp = 150
        const potionActionName = await runner.tick(priest, context)
        expect(potionActionName).toBe("UsePotion")
        expect(priest.calls.some((c) => c.method === "usePotion")).toBe(true)

        // Reset calls & heal everyone
        priest.calls = []
        priest.hp = 1000
        blackboard.updateMemberStatus({
            name: "WarriorTank",
            type: "warrior",
            map: "main",
            x: 20,
            y: 0,
            hp: 1000,
            maxHp: 1000, // Fully healed!
            mp: 200,
            maxMp: 200,
            freeInventorySlots: 10,
            gold: 0,
            isReady: true,
            isDead: false,
            lastUpdated: Date.now(),
        })

        // 3. Everyone healthy -> BasicAttackAction should run
        const attackActionName = await runner.tick(priest, context)
        expect(attackActionName).toBe("BasicAttack")
        expect(priest.calls.some((c) => c.method === "basicAttack")).toBe(true)
    })

    it("Warrior dynamic priority: prioritizes Taunt on squishy peel -> Cleave on multi-target -> Basic Attack", async () => {
        const { blackboard, context } = createTestContext()
        const warrior = new MockCharacter({ name: "WarriorTank", ctype: "warrior", hp: 1000, max_hp: 1000, mp: 200, max_mp: 200, range: 60 })

        const runner = new ActionRunner()
        runner.registerAll([
            new TauntAction({ range: 200 }),
            new CleaveAction({ cleaveRadius: 160, minTargets: 2 }),
            new BasicAttackAction({ gData }),
        ])

        blackboard.updateMemberStatus({
            name: "PriestBot",
            type: "priest",
            map: "main",
            x: 50,
            y: 0,
            hp: 300,
            maxHp: 1000, // 30% squishy
            mp: 500,
            maxMp: 500,
            freeInventorySlots: 10,
            gold: 0,
            isReady: true,
            isDead: false,
            lastUpdated: Date.now(),
        })

        // Monster threatening the priest
        warrior.entities.set("spider_threat", {
            id: "spider_threat",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 40,
            y: 0,
            target: "PriestBot",
        })

        // Add 2 other goos so cleave is also technically possible
        warrior.entities.set("goo_1", { id: "goo_1", type: "goo", hp: 100, max_hp: 100, x: 20, y: 0 })
        warrior.entities.set("goo_2", { id: "goo_2", type: "goo", hp: 100, max_hp: 100, x: -20, y: 0 })

        // 1. Squishy ally threatened -> TauntAction must take precedence over Cleave!
        const tauntActionName = await runner.tick(warrior, context)
        expect(tauntActionName).toBe("WarriorTaunt")
        expect(warrior.calls.some((c) => c.method === "taunt" && c.args[0] === "spider_threat")).toBe(true)

        // Reset calls & remove threat
        warrior.calls = []
        warrior.entities.delete("spider_threat")

        // 2. Multiple normal enemies remain -> CleaveAction should take precedence over single target BasicAttack!
        const cleaveActionName = await runner.tick(warrior, context)
        expect(cleaveActionName).toBe("WarriorCleave")
        expect(warrior.calls.some((c) => c.method === "cleave")).toBe(true)

        // Reset calls & leave only 1 goo
        warrior.calls = []
        warrior.entities.delete("goo_2")

        // 3. Only 1 enemy remains (< minTargets for cleave) -> BasicAttackAction executes!
        const attackActionName = await runner.tick(warrior, context)
        expect(attackActionName).toBe("BasicAttack")
        expect(warrior.calls.some((c) => c.method === "basicAttack")).toBe(true)
    })
})

