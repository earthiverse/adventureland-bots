import AL, { Character, Entity, IPosition, MonsterName } from "alclient"

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

export function sortPriority(bot: Character, types?: MonsterName[]) {
    return (a: Entity, b: Entity): boolean => {
        // Order in array
        if (types?.length) {
            const a_index = types.indexOf(a.type)
            const b_index = types.indexOf(b.type)
            if (a_index < b_index) return true
            else if (a_index > b_index) return false
        }

        // Has a target -> higher priority
        if (a.target && !b.target) return true
        else if (!a.target && b.target) return false

        // Could die -> lower priority
        const a_couldDie = a.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        const b_couldDie = b.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        if (!a_couldDie && b_couldDie) return true
        else if (a_couldDie && !b_couldDie) return false

        // Will burn to death -> lower priority
        const a_willBurn = a.willBurnToDeath()
        const b_willBurn = b.willBurnToDeath()
        if (!a_willBurn && b_willBurn) return true
        else if (a_willBurn && !b_willBurn) return false

        // Lower HP -> higher priority
        if (a.hp < b.hp) return true
        else if (a.hp > b.hp) return false

        // Closer -> higher priority
        return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
    }
}