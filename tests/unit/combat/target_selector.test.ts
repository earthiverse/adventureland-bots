import { describe, expect, it } from "bun:test"
import {
    TargetSelector,
    type BotActorLike,
    type EntityLike,
    type PartyMemberLike,
} from "../../../src/domain/combat/target_selector.js"
import { createMockGData } from "../../../src/test_support/g_data.mock.js"

describe("TargetSelector", () => {
    const mockGData = createMockGData()

    const warriorBot: BotActorLike = {
        name: "EarthWar",
        type: "warrior",
        x: 0,
        y: 0,
        range: 50,
    }

    const party: PartyMemberLike[] = [
        { name: "EarthWar", type: "warrior", hp: 1000, maxHp: 1000, x: 0, y: 0 },
        { name: "EarthPri", type: "priest", hp: 500, maxHp: 500, x: 20, y: 20 },
        { name: "EarthMag", type: "mage", hp: 400, maxHp: 400, x: -20, y: -20 },
    ]

    it("should prioritize an enemy attacking a squishy party member (e.g. Priest) over passive un-aggro'd enemies", () => {
        const attackingPriest: EntityLike = {
            id: "mob1",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 25,
            y: 25,
            target: "EarthPri", // Attacking Priest
        }

        const unprovokedBoar: EntityLike = {
            id: "mob2",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 10,
            y: 10,
            target: null,
        }

        const selected = TargetSelector.selectBestTarget(
            [unprovokedBoar, attackingPriest],
            warriorBot,
            party,
            mockGData,
            { allowedMonsters: ["boar"] },
        )

        expect(selected?.id).toBe("mob1")
    })

    it("should add critical urgency when an ally is at low health (< 50%)", () => {
        const hurtParty: PartyMemberLike[] = [
            { name: "EarthWar", type: "warrior", hp: 1000, maxHp: 1000, x: 0, y: 0 },
            { name: "EarthPri", type: "priest", hp: 100, maxHp: 500, x: 20, y: 20 }, // 20% health!
            { name: "EarthMag", type: "mage", hp: 400, maxHp: 400, x: -20, y: -20 }, // 100% health
        ]

        const attackingPriest: EntityLike = {
            id: "mob1",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 20,
            y: 20,
            target: "EarthPri",
        }

        const attackingMage: EntityLike = {
            id: "mob2",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 20,
            y: 20,
            target: "EarthMag",
        }

        const scorePriest = TargetSelector.scoreTarget(attackingPriest, warriorBot, hurtParty, mockGData)
        const scoreMage = TargetSelector.scoreTarget(attackingMage, warriorBot, hurtParty, mockGData)

        expect(scorePriest.score).toBeGreaterThan(scoreMage.score)
    })

    it("should give an execute bonus to wounded targets to eliminate incoming damage faster", () => {
        const fullHpGoo: EntityLike = {
            id: "goo1",
            type: "goo",
            hp: 100,
            max_hp: 100,
            x: 10,
            y: 10,
        }

        const dyingGoo: EntityLike = {
            id: "goo2",
            type: "goo",
            hp: 10,
            max_hp: 100, // 90% missing
            x: 10,
            y: 10,
        }

        const scoreFull = TargetSelector.scoreTarget(fullHpGoo, warriorBot, party, mockGData, {
            allowedMonsters: ["goo"],
        })
        const scoreDying = TargetSelector.scoreTarget(dyingGoo, warriorBot, party, mockGData, {
            allowedMonsters: ["goo"],
        })

        expect(scoreDying.score).toBeGreaterThan(scoreFull.score)
    })

    it("should completely ignore monsters protected by fullguard (invulnerable)", () => {
        const shieldedBoss: EntityLike = {
            id: "snowman1",
            type: "franky",
            hp: 2000000,
            max_hp: 2000000,
            x: 30,
            y: 30,
            s: { fullguard: { ms: 5000 } },
        }

        const scored = TargetSelector.scoreTarget(shieldedBoss, warriorBot, party, mockGData)
        expect(scored.score).toBe(-1)
        expect(scored.reasons).toContain("invulnerable (fullguard)")
    })

    it("should avoid unprovoked dangerous bosses listed in avoidMonsters", () => {
        const unprovokedFranky: EntityLike = {
            id: "boss1",
            type: "franky",
            hp: 2000000,
            max_hp: 2000000,
            x: 30,
            y: 30,
            target: null,
        }

        const scored = TargetSelector.scoreTarget(unprovokedFranky, warriorBot, party, mockGData, {
            avoidMonsters: ["franky"],
        })

        expect(scored.score).toBe(-1)
        expect(scored.reasons).toContain("avoided monster (unprovoked)")
    })

    it("should retaliate against an avoided monster if it attacks a party member", () => {
        const aggroedFranky: EntityLike = {
            id: "boss1",
            type: "franky",
            hp: 2000000,
            max_hp: 2000000,
            x: 30,
            y: 30,
            target: "EarthWar", // It attacked us!
        }

        const scored = TargetSelector.scoreTarget(aggroedFranky, warriorBot, party, mockGData, {
            avoidMonsters: ["franky"],
        })

        expect(scored.score).toBeGreaterThan(0)
    })

    it("should ignore unprovoked passive monsters that are not in allowedMonsters", () => {
        // goo is passive (aggro = 0)
        const neutralGoo: EntityLike = {
            id: "neutral1",
            type: "goo",
            hp: 100,
            max_hp: 100,
            x: 20,
            y: 20,
            target: null,
        }

        const scored = TargetSelector.scoreTarget(neutralGoo, warriorBot, party, mockGData, {
            allowedMonsters: ["boar"], // we only want to farm boars
        })

        expect(scored.score).toBe(-1)
        expect(scored.reasons).toContain("unprovoked passive monster")
    })

    it("should favor targets closer to the bot's attack range when all other factors are equal", () => {
        const closeBoar: EntityLike = {
            id: "close1",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 30, // within 50 range
            y: 0,
        }

        const farBoar: EntityLike = {
            id: "far1",
            type: "boar",
            hp: 1200,
            max_hp: 1200,
            x: 200, // outside range
            y: 0,
        }

        const scoreClose = TargetSelector.scoreTarget(closeBoar, warriorBot, party, mockGData, {
            allowedMonsters: ["boar"],
        })
        const scoreFar = TargetSelector.scoreTarget(farBoar, warriorBot, party, mockGData, {
            allowedMonsters: ["boar"],
        })

        expect(scoreClose.score).toBeGreaterThan(scoreFar.score)
    })
})
