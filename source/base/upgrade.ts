import { Character, GData, ItemData, ItemName } from "alclient"
import FastPriorityQueue from "fastpriorityqueue"
import { UpgradeConfig } from "./itemsNew.js"

export type UpgradeScrollName = "scroll0" | "scroll1" | "scroll2" | "scroll3"
export type CompoundScrollName = "cscroll0" | "cscroll1" | "cscroll2" | "cscroll3"
export type OfferingName = "offering" | "offeringp" | "offeringx"

/**
 * BASE_COMPOUND_CHANCE[grade][level] -> chance
 */
export const BASE_COMPOUND_CHANCE: {
    [grade: number]: {
        [level: number]: number
    }
} = {
    0: {
        1: 0.99,
        2: 0.75,
        3: 0.4,
        4: 0.25,
        5: 0.2,
        6: 0.1,
        7: 0.08,
        8: 0.05,
        9: 0.05,
        10: 0.05,
    },
    1: {
        1: 0.9,
        2: 0.7,
        3: 0.4,
        4: 0.2,
        5: 0.15,
        6: 0.08,
        7: 0.05,
        8: 0.05,
        9: 0.05,
        10: 0.03,
    },
    2: {
        1: 0.8,
        2: 0.6,
        3: 0.32,
        4: 0.16,
        5: 0.1,
        6: 0.05,
        7: 0.03,
        8: 0.03,
        9: 0.03,
        10: 0.02,
    },
}

/**
 * BASE_UPGRADE_CHANCE[grade][level] -> chance
 */
export const BASE_UPGRADE_CHANCE: {
    [grade: number]: {
        [level: number]: number
    }
} = {
    0: {
        1: 0.9999999,
        2: 0.98,
        3: 0.95,
        4: 0.7,
        5: 0.6,
        6: 0.4,
        7: 0.25,
        8: 0.15,
        9: 0.07,
        10: 0.024,
        11: 0.14,
        12: 0.11,
    },
    1: {
        1: 0.99998,
        2: 0.97,
        3: 0.94,
        4: 0.68,
        5: 0.58,
        6: 0.38,
        7: 0.24,
        8: 0.14,
        9: 0.066,
        10: 0.018,
        11: 0.13,
        12: 0.1,
    },
    2: {
        1: 0.97,
        2: 0.94,
        3: 0.92,
        4: 0.64,
        5: 0.52,
        6: 0.32,
        7: 0.232,
        8: 0.13,
        9: 0.062,
        10: 0.015,
        11: 0.12,
        12: 0.09,
    },
}

/** scroll -> price */
export const UPGRADE_SCROLLS: { [T in UpgradeScrollName]?: number } = {
    scroll0: 1_000,
    scroll1: 40_000,
    scroll2: 1_600_000,
    scroll3: 64_000_000,
}

/** cscroll -> price */
export const COMPOUND_SCROLLS: { [T in CompoundScrollName]?: number } = {
    cscroll0: 6_400,
    cscroll1: 240_000,
    cscroll2: 9_600_000,
    cscroll3: 384_000_000,
}

/** offering -> price */
export const OFFERINGS: { [T in OfferingName]?: number } = {
    offering: 3_200_000,
    offeringp: 2_500_000,
    offeringx: 1_000_000_000,
}

export function getScrollAndOfferingPricesFromG(g: GData) {
    if (!g?.items) return
    if (g.items.scroll0) UPGRADE_SCROLLS.scroll0 = g.items.scroll0.g
    if (g.items.scroll1) UPGRADE_SCROLLS.scroll1 = g.items.scroll1.g
    if (g.items.scroll2) UPGRADE_SCROLLS.scroll2 = g.items.scroll2.g
    if (g.items.scroll3) UPGRADE_SCROLLS.scroll3 = g.items.scroll3.g

    if (g.items.cscroll0) COMPOUND_SCROLLS.cscroll0 = g.items.cscroll0.g
    if (g.items.cscroll1) COMPOUND_SCROLLS.cscroll1 = g.items.cscroll1.g
    if (g.items.cscroll2) COMPOUND_SCROLLS.cscroll2 = g.items.cscroll2.g
    if (g.items.cscroll3) COMPOUND_SCROLLS.cscroll3 = g.items.cscroll3.g

    if (g.items.offering) OFFERINGS.offering = g.items.offering.g
}

export function getItemGrade(item: ItemData, g: GData): number | undefined {
    const gInfo = g.items[item.name]
    if (!gInfo?.grades) return undefined
    let grade = 0
    const level = item.level ?? 0
    for (const threshold of gInfo.grades) {
        if (level < threshold) break
        grade++
    }
    return grade
}

export function calculateUpgradeChance(
    item: ItemData,
    grace: number,
    scroll: ItemName,
    g: GData,
    offering?: ItemName,
): { chance: number; newGrace: number } {
    if (!scroll.startsWith("scroll")) return { chance: 0, newGrace: 0 }

    const currentGrade = getItemGrade(item, g)
    if (currentGrade === undefined) throw new Error(`Unable to determine grade for ${item.name}`)

    const scrollGrade = g.items[scroll]?.grade
    if (scrollGrade === undefined || currentGrade > scrollGrade) return { chance: 0, newGrace: 0 }

    const levelZeroGrade =
        item.level === 0 || item.level === undefined ? currentGrade : getItemGrade({ name: item.name, level: 0 }, g)
    const nextLevel = (item.level ?? 0) + 1
    const baseUpgradeChance = BASE_UPGRADE_CHANCE[levelZeroGrade]?.[nextLevel]
    if (baseUpgradeChance === undefined) return { chance: 0, newGrace: 0 }

    let newGrace = grace
    let chance = baseUpgradeChance
    let high = false
    let igrace: number
    if (levelZeroGrade === 0) {
        igrace = 1
    } else if (levelZeroGrade === 1) {
        igrace = -1
    } else if (levelZeroGrade === 2) {
        igrace = -2
    } else {
        throw new Error("Unknown igrace")
    }

    grace = Math.max(0, Math.min(nextLevel + 1, (grace || 0) + igrace))
    grace = (chance * grace) / nextLevel + grace / 1000.0

    if (scrollGrade > currentGrade && nextLevel <= 10) {
        chance = chance * 1.2 + 0.01
        high = true
        newGrace = newGrace + 0.4
    }

    if (offering !== undefined) {
        const offeringGrade = g.items[offering]?.grade
        if (offeringGrade === undefined) throw new Error(`${offering} is not a valid offering`)
        let increase = 0.4

        if (offeringGrade > currentGrade + 1) {
            chance = chance * 1.7 + grace * 4
            high = true
            increase = 3
        } else if (offeringGrade > currentGrade) {
            chance = chance * 1.5 + grace * 1.2
            high = true
            increase = 1
        } else if (offeringGrade === currentGrade) {
            chance = chance * 1.4 + grace
        } else if (offeringGrade === currentGrade - 1) {
            chance = chance * 1.15 + grace / 3.2
            increase = 0.2
        } else {
            chance = chance * 1.08 + grace / 4
            increase = 0.1
        }
        newGrace = newGrace + increase
    } else {
        grace = Math.max(0, grace / 4.8 - 0.4 / ((nextLevel - 0.999) * (nextLevel - 0.999)))
        chance += grace
    }

    if (high) {
        chance = Math.min(chance, Math.min(baseUpgradeChance + 0.36, baseUpgradeChance * 3))
    } else {
        chance = Math.min(chance, Math.min(baseUpgradeChance + 0.24, baseUpgradeChance * 2))
    }

    return { chance: Math.min(chance, 1), newGrace: Math.round(newGrace * 10) / 10 }
}

export function calculateCompoundChance(
    item: ItemData,
    grace: number,
    scroll: ItemName,
    g: GData,
    offering?: ItemName,
): { chance: number; newGrace: number } {
    if (!scroll.startsWith("cscroll")) return { chance: 0, newGrace: 0 }

    const currentGrade = getItemGrade(item, g)
    if (currentGrade === undefined) throw new Error(`Unable to determine grade for ${item.name}`)

    const scrollGrade = g.items[scroll]?.grade
    if (scrollGrade === undefined || currentGrade > scrollGrade) return { chance: 0, newGrace: 0 }

    const level = item.level ?? 0
    const levelZeroGrade = level === 0 ? currentGrade : getItemGrade({ name: item.name, level: 0 }, g)
    const nextLevel = level + 1
    const compoundGrade = level < 3 ? levelZeroGrade : getItemGrade({ name: item.name, level: level - 2 }, g)
    const baseCompoundChance = BASE_COMPOUND_CHANCE[compoundGrade]?.[nextLevel]
    if (baseCompoundChance === undefined) return { chance: 0, newGrace: 0 }

    let newGrace = grace
    let chance = baseCompoundChance
    let high = 0
    let graceBonus = 0
    if (scrollGrade > currentGrade) {
        chance = chance * 1.1 + 0.001
        graceBonus += 0.4
        high = scrollGrade - currentGrade
    }
    if (offering !== undefined) {
        const offeringGrade = g.items[offering]?.grade
        if (offeringGrade === undefined) throw new Error(`${offering} is not a valid offering`)
        const chanceFromGrace = 0.027 * (grace * 3 + 0.5)

        if (offeringGrade > currentGrade + 1) {
            chance = chance * 1.64 + chanceFromGrace * 2
            high = 1
            graceBonus += 3
        } else if (offeringGrade > currentGrade) {
            chance = chance * 1.48 + chanceFromGrace
            high = 1
            graceBonus += 1
        } else if (offeringGrade === currentGrade) {
            chance = chance * 1.36 + Math.min(30 * 0.027, chanceFromGrace)
            graceBonus += 0.5
        } else if (offeringGrade === currentGrade - 1) {
            chance = chance * 1.15 + Math.min(25 * 0.019, chanceFromGrace) / Math.max(nextLevel - 3, 1)
            graceBonus += 0.2
        } else {
            chance = chance * 1.08 + Math.min(15 * 0.015, chanceFromGrace) / Math.max(nextLevel - 2, 1)
            graceBonus += 0.1
        }

        newGrace = grace * 3
    } else {
        const chanceFromGrace = 0.007 * grace
        chance += Math.min(25 * 0.007, chanceFromGrace) / Math.max(nextLevel - 2, 1)
    }
    newGrace = newGrace / 6.4 + graceBonus
    chance = Math.min(
        1,
        chance,
        baseCompoundChance * (3 + ((high && high * 0.6) || 0)),
        baseCompoundChance + 0.2 + ((high && high * 0.05) || 0),
    )
    return { chance, newGrace: Math.round(newGrace * 10) / 10 }
}

export type UpgradeMemoData = {
    cost: number
    method: { scroll: UpgradeScrollName; offering?: OfferingName } | "stack" | "initial"
    previous: { level: number; grace: number } | undefined
    chance: number
}

export type UpgradePathNode = {
    level: number
    grace: number
    scroll?: UpgradeScrollName
    offering?: OfferingName
    cost: number
    chance: number
}

export function calculateOptimalUpgradePath(
    item: ItemData,
    initialValue: number,
    g: GData,
    targetLevel?: number,
): UpgradePathNode[] | undefined {
    const grades = g.items[item.name]?.grades
    const maxLevel = grades?.length ? grades[grades.length - 1] : 12
    if (maxLevel === undefined) return undefined
    if (targetLevel === undefined || targetLevel > maxLevel) targetLevel = maxLevel
    if ((item.level ?? 0) >= targetLevel) return undefined

    getScrollAndOfferingPricesFromG(g)

    const levelZeroGrade = getItemGrade({ name: item.name, level: 0 }, g) ?? 0
    const igrace = levelZeroGrade === 0 ? 1 : levelZeroGrade === 1 ? -1 : -2

    const maxGrace = new Map<number, number>()
    const memo = new Map<number, Map<number, UpgradeMemoData>>()

    const getMemo = (level: number, grace: number) => memo.get(level)?.get(grace)
    const setMemo = (
        level: number,
        grace: number,
        cost: number,
        previous: { level: number; grace: number } | undefined,
        method: { scroll: UpgradeScrollName; offering?: OfferingName } | "stack" | "initial",
        chance: number,
    ) => {
        if (!memo.has(level)) memo.set(level, new Map())
        memo.get(level).set(grace, { cost, method, previous, chance })
    }

    const queue = new FastPriorityQueue<{
        cost: number
        level: number
        grace: number
    }>((a, b) => a.cost < b.cost)

    queue.add({ cost: initialValue, level: 0, grace: 0 })
    setMemo(0, 0, initialValue, undefined, "initial", 1)

    while (queue.size > 0) {
        const current = queue.poll()
        if (current.level >= targetLevel) continue

        const previous = getMemo(current.level, current.grace)
        if (previous.cost < current.cost) continue

        const previousMaxGrace = maxGrace.get(current.level) ?? -1
        if (current.grace < previousMaxGrace) continue
        maxGrace.set(current.level, current.grace)

        const currentItem: ItemData = { name: item.name, level: current.level }

        // Prim Stacking transition
        if (current.grace < Math.min(13, current.level + 2 - igrace)) {
            const newGrace = Math.min(current.grace + 0.5, 13)
            const primCost = OFFERINGS.offeringp ?? 2_500_000
            const newCost = current.cost + primCost
            const oldMemo = getMemo(current.level, newGrace)
            if (!oldMemo || newCost < oldMemo.cost) {
                setMemo(current.level, newGrace, newCost, { level: current.level, grace: current.grace }, "stack", 1)
                queue.add({ cost: newCost, level: current.level, grace: newGrace })
            }
        }

        // Upgrade transition
        const currentGrade = getItemGrade(currentItem, g)
        for (let grade = currentGrade; grade <= Math.min(currentGrade + 1, 3); grade++) {
            const scroll = `scroll${grade}` as UpgradeScrollName
            const scrollCost = UPGRADE_SCROLLS[scroll]
            if (scrollCost === undefined) continue

            for (const offering of [...Object.keys(OFFERINGS), undefined] as (OfferingName | undefined)[]) {
                const { chance, newGrace } = calculateUpgradeChance(currentItem, current.grace, scroll, g, offering)
                if (!chance) continue

                const offeringCost = offering === undefined ? 0 : OFFERINGS[offering]
                const newCost = (current.cost + scrollCost + offeringCost) / chance
                const newLevel = current.level + 1

                const oldMemo = getMemo(newLevel, newGrace)
                if (!oldMemo || newCost < oldMemo.cost) {
                    setMemo(
                        newLevel,
                        newGrace,
                        newCost,
                        { level: current.level, grace: current.grace },
                        { scroll, offering },
                        chance,
                    )
                    queue.add({ cost: newCost, level: newLevel, grace: newGrace })
                }
            }
        }
    }

    let finishGrace = Number.NEGATIVE_INFINITY
    let finishDatum: UpgradeMemoData | undefined = undefined
    const targetMap = memo.get(targetLevel)
    if (!targetMap) return undefined

    for (const [grace, datum] of targetMap.entries()) {
        if (finishDatum && datum.cost >= finishDatum.cost) continue
        finishGrace = grace
        finishDatum = datum
    }

    if (!finishDatum) return undefined

    const path: UpgradePathNode[] = []
    let datum: UpgradeMemoData | undefined = finishDatum
    let grace = finishGrace
    let level = targetLevel

    while (datum) {
        let scroll: UpgradeScrollName | undefined
        let offering: OfferingName | undefined
        if (typeof datum.method === "object") {
            scroll = datum.method.scroll
            offering = datum.method.offering
        } else if (datum.method === "stack") {
            offering = "offeringp"
        }

        path.push({
            level,
            grace,
            scroll,
            offering,
            cost: datum.cost,
            chance: datum.chance,
        })

        if (!datum.previous) break

        level = datum.previous.level
        grace = datum.previous.grace
        datum = memo.get(level)?.get(grace)
    }

    return path.reverse()
}

export type CompoundMemoData = {
    cost: number
    method: { scroll: CompoundScrollName; offering?: OfferingName } | "initial"
    previous: { level: number; grace: number } | undefined
    chance: number
}

export type CompoundPathNode = {
    level: number
    grace: number
    scroll?: CompoundScrollName
    offering?: OfferingName
    cost: number
    chance: number
}

export function calculateOptimalCompoundPath(
    item: ItemData,
    initialValue: number,
    g: GData,
    targetLevel?: number,
): CompoundPathNode[] | undefined {
    const grades = g.items[item.name]?.grades
    const maxLevel = grades?.length ? grades[grades.length - 1] : 7
    if (maxLevel === undefined) return undefined
    if (targetLevel === undefined || targetLevel > maxLevel) targetLevel = maxLevel
    if ((item.level ?? 0) >= targetLevel) return undefined

    getScrollAndOfferingPricesFromG(g)

    const maxGrace = new Map<number, number>()
    const memo = new Map<number, Map<number, CompoundMemoData>>()

    const getMemo = (level: number, grace: number) => memo.get(level)?.get(grace)
    const setMemo = (
        level: number,
        grace: number,
        cost: number,
        previous: { level: number; grace: number } | undefined,
        method: { scroll: CompoundScrollName; offering?: OfferingName } | "initial",
        chance: number,
    ) => {
        if (!memo.has(level)) memo.set(level, new Map())
        memo.get(level).set(grace, { cost, method, previous, chance })
    }

    const queue = new FastPriorityQueue<{
        cost: number
        level: number
        grace: number
    }>((a, b) => a.cost < b.cost)

    queue.add({ cost: initialValue, level: 0, grace: 0 })
    setMemo(0, 0, initialValue, undefined, "initial", 1)

    while (queue.size > 0) {
        const current = queue.poll()
        if (current.level >= targetLevel) continue

        const previous = getMemo(current.level, current.grace)
        if (previous.cost < current.cost) continue

        const previousMaxGrace = maxGrace.get(current.level) ?? -1
        if (current.grace < previousMaxGrace) continue
        maxGrace.set(current.level, current.grace)

        const currentItem: ItemData = { name: item.name, level: current.level }
        const currentGrade = getItemGrade(currentItem, g)

        for (let grade = currentGrade; grade <= Math.min(currentGrade + 1, 3); grade++) {
            const scroll = `cscroll${grade}` as CompoundScrollName
            const scrollCost = COMPOUND_SCROLLS[scroll]
            if (scrollCost === undefined) continue

            for (const offering of [...Object.keys(OFFERINGS), undefined] as (OfferingName | undefined)[]) {
                const { chance, newGrace } = calculateCompoundChance(currentItem, current.grace, scroll, g, offering)
                if (!chance) continue

                const offeringCost = offering === undefined ? 0 : OFFERINGS[offering]
                const newCost = (current.cost * 3 + scrollCost + offeringCost) / chance
                const newLevel = current.level + 1

                const oldMemo = getMemo(newLevel, newGrace)
                if (!oldMemo || newCost < oldMemo.cost) {
                    setMemo(
                        newLevel,
                        newGrace,
                        newCost,
                        { level: current.level, grace: current.grace },
                        { scroll, offering },
                        chance,
                    )
                    queue.add({ cost: newCost, level: newLevel, grace: newGrace })
                }
            }
        }
    }

    let finishGrace = Number.NEGATIVE_INFINITY
    let finishDatum: CompoundMemoData | undefined = undefined
    const targetMap = memo.get(targetLevel)
    if (!targetMap) return undefined

    for (const [grace, datum] of targetMap.entries()) {
        if (finishDatum && datum.cost >= finishDatum.cost) continue
        finishGrace = grace
        finishDatum = datum
    }

    if (!finishDatum) return undefined

    const path: CompoundPathNode[] = []
    let datum: CompoundMemoData | undefined = finishDatum
    let grace = finishGrace
    let level = targetLevel

    while (datum) {
        let scroll: CompoundScrollName | undefined
        let offering: OfferingName | undefined
        if (typeof datum.method === "object") {
            scroll = datum.method.scroll
            offering = datum.method.offering
        }

        path.push({
            level,
            grace,
            scroll,
            offering,
            cost: datum.cost,
            chance: datum.chance,
        })

        if (!datum.previous) break

        level = datum.previous.level
        grace = datum.previous.grace
        datum = memo.get(level)?.get(grace)
    }

    return path.reverse()
}

export type NextUpgradeAction =
    | {
          action: "stack"
          offering: "offeringp"
      }
    | {
          action: "upgrade"
          scroll: UpgradeScrollName
          offering?: OfferingName
      }

export async function getNextUpgradeAction(
    bot: Character,
    itemPos: number,
    itemConfig?: UpgradeConfig & { buyPrice?: number | "ponty" },
    g: GData = bot.G,
): Promise<NextUpgradeAction | undefined> {
    const item = bot.items[itemPos]
    if (!item) return undefined

    const initialValue =
        (typeof itemConfig?.buyPrice === "number" ? itemConfig.buyPrice : undefined) ?? g.items[item.name]?.g ?? 1_000

    const upgradePath = calculateOptimalUpgradePath(item, initialValue, g, itemConfig?.upgradeUntilLevel)
    if (!upgradePath || upgradePath.length === 0) return undefined

    const grade = getItemGrade(item, g)
    if (grade === undefined) return undefined

    // Calculate current live grace from game if possible
    let grace = 0
    let scrollPos: number | undefined
    for (let i = grade; i <= 3; i++) {
        scrollPos = bot.locateItem(`scroll${i}` as ItemName)
        if (scrollPos !== undefined) break
    }

    if (scrollPos !== undefined) {
        try {
            const chanceData = await bot.calculateUpgrade(itemPos, scrollPos, undefined)
            if (chanceData && typeof chanceData.grace === "number") {
                grace = chanceData.grace
            }
        } catch {
            // Ignore calculate error
        }
    }

    const currentLevel = item.level ?? 0
    for (const node of upgradePath) {
        if (node.level <= currentLevel) continue
        if (grace < node.grace) {
            return { action: "stack", offering: "offeringp" }
        }
        return {
            action: "upgrade",
            scroll: node.scroll ?? (`scroll${grade}` as UpgradeScrollName),
            offering: node.offering,
        }
    }

    return undefined
}

export type NextCompoundAction = {
    action: "compound"
    scroll: CompoundScrollName
    offering?: OfferingName
}

export function getNextCompoundAction(
    bot: Character,
    itemPositions: [number, number, number],
    itemConfig?: UpgradeConfig & { buyPrice?: number | "ponty" },
    g: GData = bot.G,
): NextCompoundAction | undefined {
    const item = bot.items[itemPositions[0]]
    if (!item) return undefined

    const initialValue =
        (typeof itemConfig?.buyPrice === "number" ? itemConfig.buyPrice : undefined) ??
        (g.items[item.name]?.g as number) ??
        1_000

    const compoundPath = calculateOptimalCompoundPath(item, initialValue, g, itemConfig?.upgradeUntilLevel)
    const grade = getItemGrade(item, g)

    if (!compoundPath || compoundPath.length === 0) {
        return {
            action: "compound",
            scroll: `cscroll${grade ?? 0}` as CompoundScrollName,
            offering: undefined,
        }
    }

    const currentLevel = item.level ?? 0
    for (const node of compoundPath) {
        if (node.level <= currentLevel) continue
        return {
            action: "compound",
            scroll: node.scroll ?? (`cscroll${grade ?? 0}` as CompoundScrollName),
            offering: node.offering,
        }
    }

    return undefined
}
