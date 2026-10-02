import type { CharacterType, GData, MonsterName } from "alclient"
import { MonsterClassifier, type TacticalProfile } from "./monster_classifier.js"

export interface EntityLike {
    id: string
    type: MonsterName | string
    hp: number
    max_hp: number
    x: number
    y: number
    target?: string | null
    s?: Record<string, any>
    level?: number
}

export interface PartyMemberLike {
    name: string
    type: CharacterType
    hp: number
    maxHp: number
    x: number
    y: number
}

export interface BotActorLike {
    name: string
    type: CharacterType
    x: number
    y: number
    range: number
}

export interface TargetSelectionOptions {
    /** Whitelist of monsters we intend to hunt */
    allowedMonsters?: MonsterName[]
    /** Monsters to completely avoid unless they are actively attacking party members */
    avoidMonsters?: MonsterName[]
    /** Maximum distance from bot to consider */
    maxDistance?: number
    /** Whether to add bonus points to finish off low-HP targets */
    prioritizeKillSpeed?: boolean
    /** Whether to heavily prioritize threats targeting allies */
    protectParty?: boolean
}

export interface ScoredTarget {
    entity: EntityLike
    score: number
    profile: TacticalProfile
    reasons: string[]
}

export class TargetSelector {
    /**
     * Scores a single candidate entity based on party safety, proximity, and tactics.
     */
    public static scoreTarget(
        entity: EntityLike,
        bot: BotActorLike,
        party: PartyMemberLike[] = [],
        gData: GData,
        options: TargetSelectionOptions = {},
    ): ScoredTarget {
        const monsterType = entity.type as MonsterName
        const profile = MonsterClassifier.classify(monsterType, gData)
        const reasons: string[] = []

        // 1. Invulnerability / Dead Checks
        if (entity.hp <= 0) {
            return { entity, score: -1, profile, reasons: ["dead"] }
        }
        if (entity.s?.fullguard || entity.s?.fullguardx) {
            return { entity, score: -1, profile, reasons: ["invulnerable (fullguard)"] }
        }

        const dist = Math.hypot(bot.x - entity.x, bot.y - entity.y)
        const maxDist = options.maxDistance ?? 400
        if (dist > maxDist) {
            return { entity, score: -1, profile, reasons: ["out of range"] }
        }

        // Check if entity is targeting us or party members
        const isTargetingBot = entity.target === bot.name
        const targetedPartyMember = party.find((m) => m.name === entity.target)

        // 2. Avoidance Rules
        const isAvoided = options.avoidMonsters?.includes(monsterType) ?? false
        if (isAvoided && !isTargetingBot && !targetedPartyMember) {
            return { entity, score: -1, profile, reasons: ["avoided monster (unprovoked)"] }
        }

        // 3. Ignore Unprovoked Passive Mobs (unless explicitly allowed)
        const isAllowed = options.allowedMonsters ? options.allowedMonsters.includes(monsterType) : true
        if (!profile.isAggressive && !isAllowed && !isTargetingBot && !targetedPartyMember) {
            return { entity, score: -1, profile, reasons: ["unprovoked passive monster"] }
        }

        let score = 50 // Base score for any viable target

        // 4. Party Defense (Top Priority)
        const protectParty = options.protectParty ?? true
        if (protectParty && targetedPartyMember) {
            score += 50
            reasons.push(`attacking ally (${targetedPartyMember.name})`)

            // Extra urgency if ally is squishy (Priest, Mage, Ranger)
            const squishyClasses: CharacterType[] = ["priest", "mage", "ranger"]
            if (squishyClasses.includes(targetedPartyMember.type)) {
                score += 30
                reasons.push("protecting squishy ally")
            }

            // Extra urgency if ally has critical health (< 50%)
            if (targetedPartyMember.hp / targetedPartyMember.maxHp < 0.5) {
                score += 30
                reasons.push("protecting low health ally")
            }
        } else if (isTargetingBot) {
            score += 40
            reasons.push("attacking self")
        }

        // 5. Whitelisted Farm Targets
        if (isAllowed) {
            score += 25
            reasons.push("whitelisted target")
        }

        // 6. Kill-Speed / Execute Low-HP Target
        const prioritizeKill = options.prioritizeKillSpeed ?? true
        if (prioritizeKill && entity.max_hp > 0) {
            const missingHpRatio = 1 - entity.hp / entity.max_hp
            const executeBonus = Math.round(missingHpRatio * 30)
            if (executeBonus > 5) {
                score += executeBonus
                reasons.push(`execute bonus (+${executeBonus})`)
            }
        }

        // 7. Distance & Attack Range Bonus
        if (dist <= bot.range) {
            score += 15
            reasons.push("within attack range")
        } else {
            const distancePenalty = Math.min(25, Math.round((dist / bot.range) * 10))
            score -= distancePenalty
            reasons.push(`distance penalty (-${distancePenalty})`)
        }

        return {
            entity,
            score: Math.max(0, score),
            profile,
            reasons,
        }
    }

    /**
     * Ranks all candidate entities in descending order of priority score.
     */
    public static rankTargets(
        entities: EntityLike[],
        bot: BotActorLike,
        party: PartyMemberLike[] = [],
        gData: GData,
        options: TargetSelectionOptions = {},
    ): ScoredTarget[] {
        const scored = entities
            .map((e) => this.scoreTarget(e, bot, party, gData, options))
            .filter((st) => st.score > 0)

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score)
        return scored
    }

    /**
     * Returns the single best target to attack right now, or null if no valid target exists.
     */
    public static selectBestTarget(
        entities: EntityLike[],
        bot: BotActorLike,
        party: PartyMemberLike[] = [],
        gData: GData,
        options: TargetSelectionOptions = {},
    ): EntityLike | null {
        const ranked = this.rankTargets(entities, bot, party, gData, options)
        return ranked.length > 0 ? ranked[0].entity : null
    }
}
