import { describe, expect, it } from "bun:test"
import { EventBus } from "../../../../src/core/events/event_bus.js"
import { TeamBlackboard } from "../../../../src/core/blackboard/team_blackboard.js"
import type { ActionContext } from "../../../../src/core/actions/action.js"
import { createMockGData } from "../../../../src/test_support/g_data.mock.js"
import { MockCharacter } from "../../../../src/test_support/mock_character.js"

// Class Actions
import { HealAction } from "../../../../src/domain/combat/actions/priest/heal_action.js"
import { PartyHealAction } from "../../../../src/domain/combat/actions/priest/party_heal_action.js"
import { TauntAction } from "../../../../src/domain/combat/actions/warrior/taunt_action.js"
import { CleaveAction } from "../../../../src/domain/combat/actions/warrior/cleave_action.js"
import { BurstAction } from "../../../../src/domain/combat/actions/mage/burst_action.js"
import { CBurstAction } from "../../../../src/domain/combat/actions/mage/cburst_action.js"
import { HuntersMarkAction } from "../../../../src/domain/combat/actions/ranger/hunters_mark_action.js"
import { SuperShotAction } from "../../../../src/domain/combat/actions/ranger/super_shot_action.js"

describe("Class Specific Combat Actions", () => {
    const gData = createMockGData()

    function createTestContext() {
        const eventBus = new EventBus()
        const blackboard = new TeamBlackboard("US", "I", eventBus)
        const context: ActionContext = { blackboard, eventBus }
        return { eventBus, blackboard, context }
    }

    // ==========================================
    // PRIEST ACTIONS
    // ==========================================
    describe("Priest Actions", () => {
        describe("HealAction", () => {
            it("should heal the lowest HP percentage party member in range", async () => {
                const { blackboard, context } = createTestContext()
                const action = new HealAction({ healRange: 300 })
                const priest = new MockCharacter({ name: "PriestBot", ctype: "priest", x: 0, y: 0 })

                // Register party members on blackboard
                blackboard.updateMemberStatus({
                    name: "WarriorTank",
                    type: "warrior",
                    map: "main",
                    x: 50,
                    y: 50,
                    hp: 300,
                    maxHp: 1000, // 30% HP (Critical!)
                    mp: 200,
                    maxMp: 300,
                    freeInventorySlots: 10,
                    gold: 0,
                    isReady: true,
                    isDead: false,
                    lastUpdated: Date.now(),
                })

                blackboard.updateMemberStatus({
                    name: "MageAlly",
                    type: "mage",
                    map: "main",
                    x: 60,
                    y: 60,
                    hp: 500,
                    maxHp: 600, // 83% HP
                    mp: 400,
                    maxMp: 500,
                    freeInventorySlots: 10,
                    gold: 0,
                    isReady: true,
                    isDead: false,
                    lastUpdated: Date.now(),
                })

                expect(action.canExecute(priest, context)).toBe(true)
                const score = action.score(priest, context)
                expect(score).toBeGreaterThanOrEqual(95) // Critical HP boost

                const executed = await action.execute(priest, context)
                expect(executed).toBe(true)
                expect(priest.calls.some((c) => c.method === "healSkill" && c.args[0] === "WarriorTank")).toBe(true)
            })

            it("should heal self when self is damaged and no other ally is lower", async () => {
                const { context } = createTestContext()
                const action = new HealAction()
                const priest = new MockCharacter({ name: "PriestBot", ctype: "priest", hp: 400, max_hp: 1000 })

                expect(action.canExecute(priest, context)).toBe(true)
                const executed = await action.execute(priest, context)
                expect(executed).toBe(true)
                expect(priest.calls.some((c) => c.method === "healSkill" && c.args[0] === "PriestBot")).toBe(true)
            })

            it("should not execute if non-priest bot invokes it", () => {
                const { context } = createTestContext()
                const action = new HealAction()
                const warrior = new MockCharacter({ ctype: "warrior" })

                expect(action.canExecute(warrior, context)).toBe(false)
            })
        })

        describe("PartyHealAction", () => {
            it("should only execute when multiple party members are damaged", async () => {
                const { blackboard, context } = createTestContext()
                const action = new PartyHealAction({ minDamagedMembers: 2, damagedThreshold: 0.80 })
                const priest = new MockCharacter({ name: "PriestBot", ctype: "priest", hp: 1000, max_hp: 1000, mp: 500 })

                // Only 1 damaged ally
                blackboard.updateMemberStatus({
                    name: "WarriorTank",
                    type: "warrior",
                    map: "main",
                    x: 0,
                    y: 0,
                    hp: 500,
                    maxHp: 1000, // 50%
                    mp: 200,
                    maxMp: 300,
                    freeInventorySlots: 10,
                    gold: 0,
                    isReady: true,
                    isDead: false,
                    lastUpdated: Date.now(),
                })

                expect(action.canExecute(priest, context)).toBe(false)

                // Add a second damaged ally
                blackboard.updateMemberStatus({
                    name: "MageAlly",
                    type: "mage",
                    map: "main",
                    x: 0,
                    y: 0,
                    hp: 300,
                    maxHp: 600, // 50%
                    mp: 200,
                    maxMp: 500,
                    freeInventorySlots: 10,
                    gold: 0,
                    isReady: true,
                    isDead: false,
                    lastUpdated: Date.now(),
                })

                expect(action.canExecute(priest, context)).toBe(true)
                const score = action.score(priest, context)
                expect(score).toBeGreaterThanOrEqual(82)

                const executed = await action.execute(priest, context)
                expect(executed).toBe(true)
                expect(priest.calls.some((c) => c.method === "partyHeal")).toBe(true)
            })

            it("should not execute if priest has insufficient MP", () => {
                const { blackboard, context } = createTestContext()
                const action = new PartyHealAction({ minMp: 400 })
                const priest = new MockCharacter({ ctype: "priest", mp: 100 }) // low MP

                blackboard.updateMemberStatus({
                    name: "WarriorTank",
                    type: "warrior",
                    map: "main",
                    x: 0,
                    y: 0,
                    hp: 200,
                    maxHp: 1000,
                    mp: 0,
                    maxMp: 0,
                    freeInventorySlots: 10,
                    gold: 0,
                    isReady: true,
                    isDead: false,
                    lastUpdated: Date.now(),
                })

                expect(action.canExecute(priest, context)).toBe(false)
            })
        })
    })

    // ==========================================
    // WARRIOR ACTIONS
    // ==========================================
    describe("Warrior Actions", () => {
        describe("TauntAction", () => {
            it("should prioritize peeling mobs targeting squishy allies (Priest, Mage, Ranger)", async () => {
                const { blackboard, context } = createTestContext()
                const action = new TauntAction({ range: 250 })
                const warrior = new MockCharacter({ name: "WarriorTank", ctype: "warrior", x: 0, y: 0 })

                blackboard.updateMemberStatus({
                    name: "PriestBot",
                    type: "priest",
                    map: "main",
                    x: 50,
                    y: 0,
                    hp: 400,
                    maxHp: 1000, // 40% HP (critical squishy!)
                    mp: 500,
                    maxMp: 500,
                    freeInventorySlots: 10,
                    gold: 0,
                    isReady: true,
                    isDead: false,
                    lastUpdated: Date.now(),
                })

                // Monster targeting the priest
                warrior.entities.set("spider_1", {
                    id: "spider_1",
                    type: "spider",
                    hp: 1000,
                    max_hp: 1000,
                    x: 40,
                    y: 0,
                    target: "PriestBot",
                })

                expect(action.canExecute(warrior, context)).toBe(true)
                const score = action.score(warrior, context)
                expect(score).toBe(96) // Critical squishy peel score

                const executed = await action.execute(warrior, context)
                expect(executed).toBe(true)
                expect(warrior.calls.some((c) => c.method === "taunt" && c.args[0] === "spider_1")).toBe(true)
            })

            it("should ignore monsters that are already targeting the warrior", () => {
                const { context } = createTestContext()
                const action = new TauntAction()
                const warrior = new MockCharacter({ name: "WarriorTank", ctype: "warrior" })

                warrior.entities.set("goo_1", {
                    id: "goo_1",
                    type: "goo",
                    hp: 200,
                    max_hp: 200,
                    x: 20,
                    y: 0,
                    target: "WarriorTank", // Already on warrior
                })

                expect(action.canExecute(warrior, context)).toBe(false)
            })
        })

        describe("CleaveAction", () => {
            it("should cleave when multiple valid enemies are in radius", async () => {
                const { context } = createTestContext()
                const action = new CleaveAction({ cleaveRadius: 160, minTargets: 2 })
                const warrior = new MockCharacter({ ctype: "warrior", mp: 100, x: 0, y: 0 })

                warrior.entities.set("g1", { id: "g1", type: "goo", hp: 100, max_hp: 100, x: 50, y: 0 })
                warrior.entities.set("g2", { id: "g2", type: "goo", hp: 100, max_hp: 100, x: -50, y: 0 })
                warrior.entities.set("g3", { id: "g3", type: "goo", hp: 100, max_hp: 100, x: 0, y: 50 })

                expect(action.canExecute(warrior, context)).toBe(true)
                const score = action.score(warrior, context)
                expect(score).toBe(78) // 3 targets

                const executed = await action.execute(warrior, context)
                expect(executed).toBe(true)
                expect(warrior.calls.some((c) => c.method === "cleave")).toBe(true)
            })

            it("should avoid cleaving dangerous world bosses", () => {
                const { context } = createTestContext()
                const action = new CleaveAction({ minTargets: 2, avoidMonsters: ["franky"] })
                const warrior = new MockCharacter({ ctype: "warrior", mp: 100, x: 0, y: 0 })

                warrior.entities.set("g1", { id: "g1", type: "goo", hp: 100, max_hp: 100, x: 50, y: 0 })
                warrior.entities.set("boss", { id: "boss", type: "franky", hp: 2000000, max_hp: 2000000, x: 50, y: 50 })

                // Only 1 eligible enemy (goo), franky is avoided -> does not meet minTargets (2)
                expect(action.canExecute(warrior, context)).toBe(false)
            })
        })
    })

    // ==========================================
    // MAGE ACTIONS
    // ==========================================
    describe("Mage Actions", () => {
        describe("BurstAction", () => {
            it("should execute burst on dangerous enemies without reflect", async () => {
                const { context } = createTestContext()
                const action = new BurstAction({ gData, range: 350, minMp: 300 })
                const mage = new MockCharacter({ ctype: "mage", mp: 600, max_mp: 600, x: 0, y: 0 })

                mage.entities.set("spider_1", {
                    id: "spider_1",
                    type: "spider",
                    hp: 5000,
                    max_hp: 5000,
                    x: 100,
                    y: 0,
                })

                expect(action.canExecute(mage, context)).toBe(true)
                expect(action.score(mage, context)).toBeGreaterThanOrEqual(72)

                const executed = await action.execute(mage, context)
                expect(executed).toBe(true)
                expect(mage.calls.some((c) => c.method === "burst" && c.args[0] === "spider_1")).toBe(true)
            })

            it("should strictly REFUSE to burst enemies with reflect trait", () => {
                const { context } = createTestContext()
                const action = new BurstAction({ gData })
                const mage = new MockCharacter({ ctype: "mage", mp: 600, max_mp: 600, x: 0, y: 0 })

                // xmage has 100% reflect!
                mage.entities.set("xmage_boss", {
                    id: "xmage_boss",
                    type: "xmage",
                    hp: 50000,
                    max_hp: 50000,
                    x: 100,
                    y: 0,
                })

                expect(action.canExecute(mage, context)).toBe(false)
                expect(action.score(mage, context)).toBe(0)
            })
        })

        describe("CBurstAction", () => {
            it("should allocate MP and cburst valid nearby targets", async () => {
                const { context } = createTestContext()
                const action = new CBurstAction({ gData, range: 400, minMp: 300, mpPerTarget: 50 })
                const mage = new MockCharacter({ ctype: "mage", mp: 600, max_mp: 600, x: 0, y: 0 })

                mage.entities.set("g1", { id: "g1", type: "goo", hp: 200, max_hp: 200, x: 50, y: 0 })
                mage.entities.set("g2", { id: "g2", type: "goo", hp: 200, max_hp: 200, x: 100, y: 0 })

                expect(action.canExecute(mage, context)).toBe(true)
                expect(action.score(mage, context)).toBeGreaterThanOrEqual(75)

                const executed = await action.execute(mage, context)
                expect(executed).toBe(true)
                expect(mage.calls.some((c) => c.method === "cburst")).toBe(true)
                const cburstCall = mage.calls.find((c) => c.method === "cburst")
                expect(cburstCall?.args[0]).toEqual([
                    ["g1", 50],
                    ["g2", 50],
                ])
            })

            it("should NOT pull unprovoked cooperative monsters to avoid swarm aggro", () => {
                const { context } = createTestContext()
                const action = new CBurstAction({ gData, range: 400 })
                const mage = new MockCharacter({ ctype: "mage", mp: 600, max_mp: 600, x: 0, y: 0 })

                // bee has "cooperative: true"
                mage.entities.set("bee_unprovoked", {
                    id: "bee_unprovoked",
                    type: "bee",
                    hp: 100,
                    max_hp: 100,
                    x: 50,
                    y: 0,
                    target: null, // Not attacking anyone
                })

                // Because bee is cooperative and unprovoked, cburst must refuse to pull it
                expect(action.canExecute(mage, context)).toBe(false)
            })
        })
    })

    // ==========================================
    // RANGER ACTIONS
    // ==========================================
    describe("Ranger Actions", () => {
        describe("HuntersMarkAction", () => {
            it("should apply hunter's mark to high HP / tough monsters", async () => {
                const { context } = createTestContext()
                const action = new HuntersMarkAction({ gData, minHpToMark: 3000 })
                const ranger = new MockCharacter({ ctype: "ranger", mp: 500, max_mp: 500, x: 0, y: 0 })

                ranger.entities.set("big_golem", {
                    id: "big_golem",
                    type: "icegolem",
                    hp: 80000,
                    max_hp: 80000,
                    x: 100,
                    y: 0,
                })

                expect(action.canExecute(ranger, context)).toBe(true)
                expect(action.score(ranger, context)).toBeGreaterThanOrEqual(80)

                const executed = await action.execute(ranger, context)
                expect(executed).toBe(true)
                expect(ranger.calls.some((c) => c.method === "huntersMark" && c.args[0] === "big_golem")).toBe(true)
            })

            it("should not apply hunter's mark if monster is already marked", () => {
                const { context } = createTestContext()
                const action = new HuntersMarkAction({ gData })
                const ranger = new MockCharacter({ ctype: "ranger", mp: 500, max_mp: 500 })

                ranger.entities.set("marked_golem", {
                    id: "marked_golem",
                    type: "icegolem",
                    hp: 80000,
                    max_hp: 80000,
                    x: 50,
                    y: 0,
                    s: { marked: true }, // Already marked!
                })

                expect(action.canExecute(ranger, context)).toBe(false)
            })
        })

        describe("SuperShotAction", () => {
            it("should fire super shot at high danger enemy", async () => {
                const { context } = createTestContext()
                const action = new SuperShotAction({ gData, range: 450, minMp: 400 })
                const ranger = new MockCharacter({ ctype: "ranger", mp: 500, max_mp: 500, x: 0, y: 0 })

                ranger.entities.set("spider_1", {
                    id: "spider_1",
                    type: "spider",
                    hp: 4000,
                    max_hp: 4000,
                    x: 200,
                    y: 0,
                    target: "PriestBot", // Threatening ally!
                })

                expect(action.canExecute(ranger, context)).toBe(true)
                expect(action.score(ranger, context)).toBeGreaterThanOrEqual(80)

                const executed = await action.execute(ranger, context)
                expect(executed).toBe(true)
                expect(ranger.calls.some((c) => c.method === "superShot" && c.args[0] === "spider_1")).toBe(true)
            })

            it("should avoid firing super shot at enemies with reflect", () => {
                const { context } = createTestContext()
                const action = new SuperShotAction({ gData })
                const ranger = new MockCharacter({ ctype: "ranger", mp: 500, max_mp: 500 })

                ranger.entities.set("xmage_boss", {
                    id: "xmage_boss",
                    type: "xmage", // Has reflect
                    hp: 50000,
                    max_hp: 50000,
                    x: 100,
                    y: 0,
                })

                expect(action.canExecute(ranger, context)).toBe(false)
            })
        })
    })
})

