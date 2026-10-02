import type { CharacterType, GData, MonsterName } from "alclient"
import { MonsterClassifier } from "./monster_classifier.js"

export interface Point2D {
    x: number
    y: number
}

export interface KiteTarget {
    id: string
    type: string
    x: number
    y: number
    speed?: number
    attackRange?: number
    target?: string
    hp?: number
    maxHp?: number
}

export interface NearbyEntity {
    id: string
    type: string
    x: number
    y: number
    target?: string
    hp?: number
    maxHp?: number
}

export interface KiteOptions {
    /** Target optimal attack range fraction (default: 0.90 -> 90% of bot range) */
    rangeRatio?: number
    /** Minimum safety distance from target (default: 80 px) */
    safetyBuffer?: number
    /** Deadzone band around optimal range to prevent micro-jitter (default: 20 px) */
    deadzone?: number
    /** Direction of circle strafe: 1 = clockwise, -1 = counter-clockwise (default: 1) */
    strafeDirection?: 1 | -1
    /** Radius around unprovoked monsters to treat as hazard / avoidance zone (default: 100 px) */
    avoidanceRadius?: number
    /** Distance to step when moving/retreating (default: 45 px) */
    stepSize?: number
}

export interface KiteEvaluation {
    shouldMove: boolean
    mode: "retreat" | "strafe" | "advance" | "none"
    destination: Point2D
    distanceToTarget: number
    optimalDistance: number
    dangerScore: number
}

/**
 * Pure function: calculates the optimal position relative to a target at a percentage of weapon range.
 */
export function calculateOptimalPosition(
    botPos: Point2D,
    targetPos: Point2D,
    attackRange: number,
    options: KiteOptions = {},
): Point2D {
    const ratio = options.rangeRatio ?? 0.9
    const safetyBuffer = options.safetyBuffer ?? 80
    const optimalDistance = Math.max(safetyBuffer, attackRange * ratio)

    let dx = botPos.x - targetPos.x
    let dy = botPos.y - targetPos.y
    const currentDist = Math.hypot(dx, dy)

    if (currentDist === 0) {
        // If overlapping, retreat horizontally
        dx = 1
        dy = 0
    } else {
        dx /= currentDist
        dy /= currentDist
    }

    return {
        x: Math.round(targetPos.x + dx * optimalDistance),
        y: Math.round(targetPos.y + dy * optimalDistance),
    }
}

/**
 * Pure function: calculates a retreat vector and destination directly away from an incoming threat.
 */
export function calculateRetreatVector(
    botPos: Point2D,
    threatPos: Point2D,
    stepSize = 45,
): { vector: Point2D; destination: Point2D } {
    let dx = botPos.x - threatPos.x
    let dy = botPos.y - threatPos.y
    const dist = Math.hypot(dx, dy)

    if (dist === 0) {
        dx = 1
        dy = 0
    } else {
        dx /= dist
        dy /= dist
    }

    return {
        vector: { x: dx, y: dy },
        destination: {
            x: Math.round(botPos.x + dx * stepSize),
            y: Math.round(botPos.y + dy * stepSize),
        },
    }
}

/**
 * Pure function: calculates a tangential orbit vector around the target (circle-strafing).
 */
export function calculateCircleStrafeVector(
    botPos: Point2D,
    targetPos: Point2D,
    direction: 1 | -1 = 1,
    stepSize = 45,
): { vector: Point2D; destination: Point2D } {
    const rx = botPos.x - targetPos.x
    const ry = botPos.y - targetPos.y
    const dist = Math.hypot(rx, ry)

    if (dist === 0) {
        return {
            vector: { x: 0, y: 1 },
            destination: { x: botPos.x, y: botPos.y + stepSize },
        }
    }

    // Radial unit vector
    const ux = rx / dist
    const uy = ry / dist

    // Perpendicular tangent vector: (-uy, ux) for clockwise, (uy, -ux) for CCW
    const tx = direction === 1 ? -uy : uy
    const ty = direction === 1 ? ux : -ux

    return {
        vector: { x: tx, y: ty },
        destination: {
            x: Math.round(botPos.x + tx * stepSize),
            y: Math.round(botPos.y + ty * stepSize),
        },
    }
}

/**
 * Pure function: evaluates the safety of a candidate destination against nearby monsters.
 * Penalizes positions close to unprovoked cooperative, aggressive, or dangerous mobs.
 */
export function evaluatePointSafety(
    point: Point2D,
    nearbyEntities: NearbyEntity[],
    gData: GData | any,
    primaryTargetId: string,
    avoidanceRadius = 100,
): { isSafe: boolean; penalty: number } {
    let totalPenalty = 0
    let isSafe = true

    for (const entity of nearbyEntities) {
        if (entity.id === primaryTargetId) continue

        const dist = Math.hypot(point.x - entity.x, point.y - entity.y)
        if (dist >= avoidanceRadius) continue

        const traits = MonsterClassifier.classify(entity.type as MonsterName, gData)

        // Aggressive or cooperative mobs (e.g. bees, pack mobs) are high risk if pulled
        let weight = 1
        if (traits.isCooperative) weight = 2.5
        if (traits.isAggressive) weight = 2.0
        if (traits.dangerRating >= 4) weight = 3.0

        // Closer proximity yields exponential penalty
        const proximityRatio = (avoidanceRadius - dist) / avoidanceRadius
        const penalty = Math.round(proximityRatio * 50 * weight)
        totalPenalty += penalty

        if (dist < 40) {
            isSafe = false
        }
    }

    return {
        isSafe: isSafe && totalPenalty < 80,
        penalty: totalPenalty,
    }
}

/**
 * Pure function: evaluates candidate directions and picks the safest point avoiding monster aggro cones.
 */
export function findSafestKitePosition(
    botPos: Point2D,
    desiredVector: Point2D,
    nearbyEntities: NearbyEntity[],
    gData: GData | any,
    primaryTargetId: string,
    stepSize = 45,
    avoidanceRadius = 100,
): Point2D {
    // If no adjacent mobs, proceed directly along desired vector
    if (!nearbyEntities || nearbyEntities.length === 0) {
        return {
            x: Math.round(botPos.x + desiredVector.x * stepSize),
            y: Math.round(botPos.y + desiredVector.y * stepSize),
        }
    }

    const baseAngle = Math.atan2(desiredVector.y, desiredVector.x)
    // Angles to test: 0, +30, -30, +60, -60, +90, -90, 180 degrees
    const angleOffsets = [0, 0.52, -0.52, 1.05, -1.05, 1.57, -1.57, Math.PI]

    let bestPoint: Point2D = {
        x: Math.round(botPos.x + desiredVector.x * stepSize),
        y: Math.round(botPos.y + desiredVector.y * stepSize),
    }
    let lowestPenalty = Infinity

    for (const offset of angleOffsets) {
        const testAngle = baseAngle + offset
        const candidate: Point2D = {
            x: Math.round(botPos.x + Math.cos(testAngle) * stepSize),
            y: Math.round(botPos.y + Math.sin(testAngle) * stepSize),
        }

        const safety = evaluatePointSafety(
            candidate,
            nearbyEntities,
            gData,
            primaryTargetId,
            avoidanceRadius,
        )

        // Add directional bias and heavy penalty if point is unsafe
        const angleDiffPenalty = Math.abs(offset) * 5
        const unsafePenalty = safety.isSafe ? 0 : 500
        const candidateScore = safety.penalty + unsafePenalty + angleDiffPenalty

        if (candidateScore < lowestPenalty) {
            lowestPenalty = candidateScore
            bestPoint = candidate
            if (safety.isSafe && safety.penalty === 0 && offset === 0) {
                // Direct vector is completely safe
                break
            }
        }
    }

    return bestPoint
}

/**
 * KiteController manages geometric kiting, retreat vectors, and obstacle avoidance.
 */
export class KiteController {
    private gData?: GData | any
    private options: Required<KiteOptions>

    public constructor(gData?: GData | any, options: KiteOptions = {}) {
        this.gData = gData
        this.options = {
            rangeRatio: options.rangeRatio ?? 0.9,
            safetyBuffer: options.safetyBuffer ?? 80,
            deadzone: options.deadzone ?? 20,
            strafeDirection: options.strafeDirection ?? 1,
            avoidanceRadius: options.avoidanceRadius ?? 100,
            stepSize: options.stepSize ?? 45,
        }
    }

    /**
     * Evaluates tactical positioning relative to target.
     */
    public evaluateKite(
        bot: { x: number; y: number; range: number; name: string; ctype?: CharacterType },
        target: KiteTarget,
        nearbyEntities: NearbyEntity[] = [],
    ): KiteEvaluation {
        const dist = Math.hypot(bot.x - target.x, bot.y - target.y)
        const optimalDist = Math.max(
            this.options.safetyBuffer,
            bot.range * this.options.rangeRatio,
        )
        const isTargetingBot = target.target === bot.name
        const targetTraits = MonsterClassifier.classify(target.type as MonsterName, this.gData)

        // 1. Critical Emergency Retreat:
        // If target is actively targeting squishy bot and is breaching safety buffer
        if (isTargetingBot && dist < this.options.safetyBuffer) {
            const retreat = calculateRetreatVector(
                { x: bot.x, y: bot.y },
                { x: target.x, y: target.y },
                this.options.stepSize,
            )

            const destination = findSafestKitePosition(
                { x: bot.x, y: bot.y },
                retreat.vector,
                nearbyEntities,
                this.gData,
                target.id,
                this.options.stepSize,
                this.options.avoidanceRadius,
            )

            // Threat score scaled by proximity to melee range
            const danger = Math.min(100, Math.round(95 + (this.options.safetyBuffer - dist) / 5))

            return {
                shouldMove: true,
                mode: "retreat",
                destination,
                distanceToTarget: dist,
                optimalDistance: optimalDist,
                dangerScore: danger,
            }
        }

        // 2. Proactive Retreat:
        // Bot is closer than optimal distance - deadzone
        if (dist < optimalDist - this.options.deadzone) {
            const retreat = calculateRetreatVector(
                { x: bot.x, y: bot.y },
                { x: target.x, y: target.y },
                this.options.stepSize,
            )

            const destination = findSafestKitePosition(
                { x: bot.x, y: bot.y },
                retreat.vector,
                nearbyEntities,
                this.gData,
                target.id,
                this.options.stepSize,
                this.options.avoidanceRadius,
            )

            return {
                shouldMove: true,
                mode: "retreat",
                destination,
                distanceToTarget: dist,
                optimalDistance: optimalDist,
                dangerScore: isTargetingBot ? 75 : 55,
            }
        }

        // 3. Advance to Target:
        // Bot is further away than its attack range and needs to step forward
        if (dist > bot.range) {
            let dx = target.x - bot.x
            let dy = target.y - bot.y
            const dirDist = Math.hypot(dx, dy)
            const forwardVector = { x: dx / dirDist, y: dy / dirDist }

            const destination = findSafestKitePosition(
                { x: bot.x, y: bot.y },
                forwardVector,
                nearbyEntities,
                this.gData,
                target.id,
                this.options.stepSize,
                this.options.avoidanceRadius,
            )

            return {
                shouldMove: true,
                mode: "advance",
                destination,
                distanceToTarget: dist,
                optimalDistance: optimalDist,
                dangerScore: 50,
            }
        }

        // 4. Circle Strafe / Hold in Optimal Range:
        // Target requires kiting or is targeting bot, but within optimal range band
        if (targetTraits.requiresKiting && isTargetingBot) {
            const strafe = calculateCircleStrafeVector(
                { x: bot.x, y: bot.y },
                { x: target.x, y: target.y },
                this.options.strafeDirection,
                this.options.stepSize,
            )

            const destination = findSafestKitePosition(
                { x: bot.x, y: bot.y },
                strafe.vector,
                nearbyEntities,
                this.gData,
                target.id,
                this.options.stepSize,
                this.options.avoidanceRadius,
            )

            return {
                shouldMove: true,
                mode: "strafe",
                destination,
                distanceToTarget: dist,
                optimalDistance: optimalDist,
                dangerScore: 40,
            }
        }

        // Comfortably in optimal range band without immediate aggro
        return {
            shouldMove: false,
            mode: "none",
            destination: { x: bot.x, y: bot.y },
            distanceToTarget: dist,
            optimalDistance: optimalDist,
            dangerScore: 0,
        }
    }
}
