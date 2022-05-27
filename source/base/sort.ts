import AL, { Character, IPosition } from "alclient"

/**
 * This function is meant to be used with `[].sort()`
 *
 * Example: `targets.sort(sortClosestDistance(bot))`
 *
 * @param to Compare the distance to this point
 * @returns A sorting function that will sort the objects closest to the position first
 */
export function sortClosestDistance(to: Character) {
    return (a: IPosition, b: IPosition) => {
        const d_a = AL.Tools.squaredDistance(to, a)
        const d_b = AL.Tools.squaredDistance(to, b)
        return d_a - d_b
    }
}

/**
 * This function is meant to be used with `[].sort()`
 *
 * Example: `targets.sort(sortFurthestDistance(bot))`
 *
 * @param from Compare the distance to this point
 * @returns A sorting function that will sort the objects furthest from the position first
 */
export function sortFurthestDistance(from: Character) {
    return (a: IPosition, b: IPosition) => {
        const d_a = AL.Tools.squaredDistance(from, a)
        const d_b = AL.Tools.squaredDistance(from, b)
        return d_b - d_a
    }
}