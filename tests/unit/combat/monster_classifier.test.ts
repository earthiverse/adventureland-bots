import { describe, expect, it } from "bun:test"
import { MonsterClassifier } from "../../../src/domain/combat/monster_classifier.js"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"

describe("MonsterClassifier", () => {
    const mockGData = createMockGData()

    it("should classify easy melee mobs with low danger rating and no kiting needed for melee tanks", () => {
        const profile = MonsterClassifier.classify("goo", mockGData, {
            isRanged: false,
            speed: 50,
        })

        expect(profile.monsterName).toBe("goo")
        expect(profile.damageType).toBe("physical")
        expect(profile.attackRange).toBe(40)
        expect(profile.dangerRating).toBeLessThan(20)
        expect(profile.requiresKiting).toBe(false)
        expect(profile.isStunnable).toBe(true)
    })

    it("should classify hard-hitting melee mobs as requiring kiting for ranged characters", () => {
        // boar: hp 1200, attack 60, range 50, speed 50
        const profile = MonsterClassifier.classify("boar", mockGData, {
            isRanged: true,
            speed: 60,
        })

        expect(profile.monsterName).toBe("boar")
        expect(profile.damageType).toBe("physical")
        expect(profile.requiresKiting).toBe(true)
        expect(profile.recommendedKiteDistance).toBeGreaterThan(100)
    })

    it("should classify ranged magical mobs accurately", () => {
        // plantoid: hp 2400, attack 90, damage_type: "magical", range 160
        const profile = MonsterClassifier.classify("plantoid", mockGData)

        expect(profile.monsterName).toBe("plantoid")
        expect(profile.damageType).toBe("magical")
        expect(profile.attackRange).toBe(160)
        expect(profile.requiresKiting).toBe(false) // range is 160, not melee
    })

    it("should assign raid bosses a high danger rating and mark them un-stunnable", () => {
        // franky: hp 2,000,000, attack 800
        const profile = MonsterClassifier.classify("franky", mockGData)

        expect(profile.monsterName).toBe("franky")
        expect(profile.dangerRating).toBeGreaterThanOrEqual(80)
        expect(profile.isStunnable).toBe(false)
    })

    it("should provide safe, sensible defaults for new or unrecognized monsters", () => {
        const profile = MonsterClassifier.classify("unknown_future_beast" as any, mockGData)

        expect(profile.monsterName).toBe("unknown_future_beast")
        expect(profile.dangerRating).toBe(20)
        expect(profile.damageType).toBe("physical")
        expect(profile.isStunnable).toBe(true)
    })
})
