import type { DamageType, GData, MonsterName } from "alclient"

export interface TacticalProfile {
    monsterName: MonsterName
    dangerRating: number // 0 (harmless) to 100 (lethal raid boss)
    damageType: DamageType | "physical" | "magical" | "pure"
    attackRange: number
    speed: number
    hp: number
    attackPower: number
    isCooperative: boolean
    isAggressive: boolean
    hasReflect: boolean
    isStunnable: boolean
    requiresKiting: boolean
    recommendedKiteDistance: number
}

export interface CharacterCombatStats {
    range?: number
    speed?: number
    armor?: number
    resistance?: number
    isRanged?: boolean
}

export class MonsterClassifier {
    /**
     * Dynamically generates a tactical combat profile for any monster based on GData.
     */
    public static classify(
        monsterName: MonsterName,
        gData: GData,
        characterStats?: CharacterCombatStats,
    ): TacticalProfile {
        const def = gData.monsters[monsterName]

        // Fallback for unknown monsters
        if (!def) {
            return {
                monsterName,
                dangerRating: 20,
                damageType: "physical",
                attackRange: 50,
                speed: 40,
                hp: 1000,
                attackPower: 50,
                isCooperative: false,
                isAggressive: false,
                hasReflect: false,
                isStunnable: true,
                requiresKiting: false,
                recommendedKiteDistance: 120,
            }
        }

        const hp = def.hp ?? 100
        const attackPower = def.attack ?? 10
        const attackRange = def.range ?? 40
        const speed = def.speed ?? 40
        const aggro = def.aggro ?? 0
        const damageType = (def.damage_type as DamageType) ?? "physical"

        // Cooperative: calls nearby friends when attacked
        const isCooperative = Boolean(def.cooperative)

        // Aggressive: attacks on sight without being hit first
        const isAggressive = aggro > 0

        // Reflect / Retaliation traits
        const hasReflect = Boolean(
            (def.reflection ?? 0) > 0 ||
            (def.dreturn ?? 0) > 0 ||
            def.abilities?.burn !== undefined,
        )

        // Stunnable: True unless immune, special raid boss, 1hp gimmick, or massive HP pool (> 1M)
        const isStunnable = !def["1hp"] && !def.immune && !(def.special && hp > 500_000) && hp < 1_000_000

        // Danger Rating: Heuristic combining HP pool, attack power, and special attributes
        // 0-20: Easy trash mobs (goo, bee, frog)
        // 20-50: Medium farming mobs (boar, snake, wolf, plantoid)
        // 50-80: Dangerous elite mobs (mvampire, skeletor)
        // 80-100: Raid bosses (franky, dragold, icegolem)
        let danger = 0
        if (hp > 1_000_000) danger += 50
        else if (hp > 100_000) danger += 35
        else if (hp > 10_000) danger += 20
        else danger += Math.min(15, Math.floor(hp / 100))

        if (attackPower > 500) danger += 35
        else if (attackPower > 200) danger += 25
        else if (attackPower > 50) danger += 15
        else danger += Math.min(10, Math.floor(attackPower / 10))

        if (def.special) danger += 15
        if (hasReflect) danger += 10
        const dangerRating = Math.min(100, Math.max(1, danger))

        // Requires Kiting:
        // True if monster is melee (range <= 60), hits hard enough to matter,
        // and either the character is ranged or the monster is slower than the character.
        const isMelee = attackRange <= 60
        const charSpeed = characterStats?.speed ?? 60
        const charIsRanged = characterStats?.isRanged ?? false
        const hitsHard = attackPower >= 50 || dangerRating >= 25

        let requiresKiting = false
        if (isMelee) {
            if (charIsRanged && (attackPower >= 20 || dangerRating >= 15)) {
                // Ranged characters avoid melee damage whenever mob is non-trivial
                requiresKiting = true
            } else if (hitsHard && charSpeed > speed) {
                requiresKiting = true
            }
        }

        // Recommended kite distance: safe distance beyond monster's attack reach
        const recommendedKiteDistance = requiresKiting
            ? Math.max(attackRange + 70, 130)
            : Math.max(attackRange, 40)

        return {
            monsterName,
            dangerRating,
            damageType,
            attackRange,
            speed,
            hp,
            attackPower,
            isCooperative,
            isAggressive,
            hasReflect,
            isStunnable,
            requiresKiting,
            recommendedKiteDistance,
        }
    }
}
