import { describe, expect, it } from "bun:test"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"
import { MockCharacter } from "../../../src/test_support/mock_character.js"
import { MonsterClassifier } from "../../../src/domain/combat/monster_classifier.js"
import {
    calculateOptimalPosition,
    calculateRetreatVector,
    calculateCircleStrafeVector,
    evaluatePointSafety,
    findSafestKitePosition,
    KiteController,
    type KiteTarget,
    type NearbyEntity,
} from "../../../src/domain/combat/kiter.js"
import { KiteAction } from "../../../src/domain/combat/actions/shared/kite_action.js"

describe("Geometric Kiting & Positioning Engine", () => {
    const gData = createMockGData()
    const classifier = new MonsterClassifier(gData)

    describe("Pure Geometric Calculations", () => {
        it("should calculate optimal position at 90% of weapon range", () => {
            const targetPos = { x: 0, y: 0 }
            const botPos = { x: 100, y: 0 }
            const attackRange = 300

            const optimal = calculateOptimalPosition(botPos, targetPos, attackRange, { rangeRatio: 0.9 })
            expect(optimal.x).toBe(270)
            expect(optimal.y).toBe(0)
            expect(Math.hypot(optimal.x - targetPos.x, optimal.y - targetPos.y)).toBe(270)
        })

        it("should preserve radial angle when bot is positioned diagonally", () => {
            const targetPos = { x: 0, y: 0 }
            const botPos = { x: 50, y: 50 }
            const attackRange = 200

            const optimal = calculateOptimalPosition(botPos, targetPos, attackRange, { rangeRatio: 0.9 })
            // 200 * 0.9 = 180. At 45 deg, x and y should be ~ 180 * sqrt(2)/2 = 127
            expect(optimal.x).toBe(127)
            expect(optimal.y).toBe(127)
            expect(Math.hypot(optimal.x, optimal.y)).toBeCloseTo(180, 0)
        })

        it("should calculate retreat vector pointing directly away from threat", () => {
            const threatPos = { x: 0, y: 0 }
            const botPos = { x: 40, y: 0 }

            const { vector, destination } = calculateRetreatVector(botPos, threatPos, 50)
            expect(vector.x).toBe(1)
            expect(vector.y).toBe(0)
            expect(destination.x).toBe(90)
            expect(destination.y).toBe(0)
        })

        it("should calculate perpendicular circle-strafe vectors for clockwise and counter-clockwise orbits", () => {
            const targetPos = { x: 0, y: 0 }
            const botPos = { x: 100, y: 0 }

            // Radial vector is (1, 0)
            const cw = calculateCircleStrafeVector(botPos, targetPos, 1, 40)
            const ccw = calculateCircleStrafeVector(botPos, targetPos, -1, 40)

            // Clockwise: tangent should be (0, 1)
            expect(cw.vector.x).toBeCloseTo(0, 5)
            expect(cw.vector.y).toBe(1)
            expect(cw.destination.x).toBe(100)
            expect(cw.destination.y).toBe(40)

            // Counter-Clockwise: tangent should be (0, -1)
            expect(ccw.vector.x).toBeCloseTo(0, 5)
            expect(ccw.vector.y).toBe(-1)
            expect(ccw.destination.x).toBe(100)
            expect(ccw.destination.y).toBe(-40)

            // Dot product with radial vector must be 0 (strictly orthogonal)
            const dot = cw.vector.x * 1 + cw.vector.y * 0
            expect(dot).toBe(0)
        })
    })

    describe("Obstacle and Pack Avoidance", () => {
        it("should penalize candidate points close to unprovoked cooperative monsters (e.g. bees)", () => {
            const safePoint = { x: 200, y: 200 }
            const riskyPoint = { x: 50, y: 50 }

            const nearbyEntities: NearbyEntity[] = [
                { id: "bee_pack", type: "bee", x: 60, y: 60 }, // Cooperative bee near (50, 50)
            ]

            const safeResult = evaluatePointSafety(safePoint, nearbyEntities, gData, "target_1", 100)
            const riskyResult = evaluatePointSafety(riskyPoint, nearbyEntities, gData, "target_1", 100)

            expect(safeResult.isSafe).toBe(true)
            expect(safeResult.penalty).toBe(0)

            expect(riskyResult.penalty).toBeGreaterThan(0)
        })

        it("should deflect retreat vector away from unprovoked monster clusters", () => {
            const botPos = { x: 100, y: 100 }
            const directRetreatVector = { x: 1, y: 0 } // Desired retreat is right (+x)

            // There is a dangerous mob directly along the direct retreat path at (145, 100)
            const nearbyEntities: NearbyEntity[] = [
                { id: "boss_franky", type: "franky", x: 145, y: 100 },
            ]

            const safestDestination = findSafestKitePosition(
                botPos,
                directRetreatVector,
                nearbyEntities,
                gData,
                "current_target",
                45,
                100,
            )

            // Destination should NOT be directly at (145, 100)
            expect(safestDestination).not.toEqual({ x: 145, y: 100 })
            // It should maintain safe distance from Franky (> 40 px)
            const distToFranky = Math.hypot(safestDestination.x - 145, safestDestination.y - 100)
            expect(distToFranky).toBeGreaterThanOrEqual(40)
        })
    })

    describe("KiteController Tactical Evaluation", () => {
        const controller = new KiteController(gData, {
            rangeRatio: 0.9,
            safetyBuffer: 80,
            deadzone: 20,
            stepSize: 45,
        })

        it("should trigger critical emergency retreat when target breaches safety buffer and targets the bot", () => {
            const bot = { x: 50, y: 0, range: 300, name: "myMage", ctype: "mage" as const }
            const target: KiteTarget = {
                id: "goo1",
                type: "goo",
                x: 0,
                y: 0,
                target: "myMage", // Attacking mage!
            }

            const evaluation = controller.evaluateKite(bot, target)
            expect(evaluation.shouldMove).toBe(true)
            expect(evaluation.mode).toBe("retreat")
            expect(evaluation.dangerScore).toBeGreaterThanOrEqual(95)
            expect(evaluation.destination.x).toBeGreaterThan(bot.x)
        })

        it("should trigger proactive retreat when closer than optimal range", () => {
            // Optimal range is 300 * 0.9 = 270. Deadzone 20 -> retreat if < 250
            const bot = { x: 200, y: 0, range: 300, name: "myMage", ctype: "mage" as const }
            const target: KiteTarget = {
                id: "goo1",
                type: "goo",
                x: 0,
                y: 0,
                target: "myMage",
            }

            const evaluation = controller.evaluateKite(bot, target)
            expect(evaluation.shouldMove).toBe(true)
            expect(evaluation.mode).toBe("retreat")
            expect(evaluation.dangerScore).toBe(75)
        })

        it("should trigger advance when target is beyond weapon range", () => {
            const bot = { x: 400, y: 0, range: 300, name: "myMage", ctype: "mage" as const }
            const target: KiteTarget = {
                id: "goo1",
                type: "goo",
                x: 0,
                y: 0,
            }

            const evaluation = controller.evaluateKite(bot, target)
            expect(evaluation.shouldMove).toBe(true)
            expect(evaluation.mode).toBe("advance")
            expect(evaluation.destination.x).toBeLessThan(bot.x) // Moving closer to 0
            expect(evaluation.dangerScore).toBe(50)
        })

        it("should maintain position when comfortably within the optimal range band", () => {
            // Distance = 270, exactly at optimal
            const bot = { x: 270, y: 0, range: 300, name: "myMage", ctype: "mage" as const }
            const target: KiteTarget = {
                id: "goo1",
                type: "goo",
                x: 0,
                y: 0,
            }

            const evaluation = controller.evaluateKite(bot, target)
            expect(evaluation.shouldMove).toBe(false)
            expect(evaluation.mode).toBe("none")
            expect(evaluation.dangerScore).toBe(0)
        })
    })

    describe("KiteAction Integration", () => {
        it("should strictly refuse to execute for melee tank classes (Warrior)", () => {
            const action = new KiteAction({ gData })
            const warrior = new MockCharacter({ ctype: "warrior", x: 50, y: 0 })
            warrior.entities.set("goo1", { id: "goo1", type: "goo", x: 0, y: 0, target: "TestHero" })

            expect(action.canExecute(warrior.asPingCompensated(), {} as any)).toBe(false)
            expect(action.score(warrior.asPingCompensated(), {} as any)).toBe(0)
        })

        it("should prioritize emergency retreat with score >= 95 for ranged squishies (Mage)", async () => {
            const action = new KiteAction({ gData })
            const mage = new MockCharacter({ name: "myMage", ctype: "mage", range: 300, x: 50, y: 0 })

            // Hostile monster targeting the mage within 50px (< 80 safety buffer)
            mage.entities.set("boar1", {
                id: "boar1",
                type: "boar",
                x: 0,
                y: 0,
                target: "myMage",
                range: 40,
                speed: 50,
            })

            expect(action.canExecute(mage.asPingCompensated(), {} as any)).toBe(true)
            const score = action.score(mage.asPingCompensated(), {} as any)
            expect(score).toBeGreaterThanOrEqual(95)

            await action.execute(mage.asPingCompensated(), {} as any)
            const moveCalls = mage.calls.filter((c) => c.method === "move")
            expect(moveCalls).toHaveLength(1)
            // Moving away from (0,0) -> x > 50
            expect(moveCalls[0].args[0]).toBeGreaterThan(50)
        })

        it("should not execute when the ranged bot is safely at optimal range", () => {
            const action = new KiteAction({ gData })
            const ranger = new MockCharacter({ name: "myRanger", ctype: "ranger", range: 300, x: 270, y: 0 })

            // Monster is not targeting ranger and is at 270px (optimal range)
            ranger.entities.set("goo1", {
                id: "goo1",
                type: "goo",
                x: 0,
                y: 0,
                target: "someTank",
                range: 40,
            })

            expect(action.canExecute(ranger.asPingCompensated(), {} as any)).toBe(false)
            expect(action.score(ranger.asPingCompensated(), {} as any)).toBe(0)
        })
    })
})
