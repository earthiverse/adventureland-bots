import AL, { Character, Entity, IPosition, MapName, MonsterName } from "alclient"

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
 * This function is meant to be used with `[].sort()`. This function will use the pathfinder's
 * logic to determine closest distance across maps, too.
 *
 * Example: `targets.sort(sortClosestDistance(bot))`
 *
 * @param from Compare the distance from this point
 * @returns A sorting function that will sort the objects closest to the position first
 */
export function sortClosestDistancePathfinder(from: Character) {
    return (a: IPosition & { map: MapName }, b: IPosition & { map: MapName }) => {
        const path_a = AL.Pathfinder.getPath(from, a)
        const path_b = AL.Pathfinder.getPath(from, b)
        const d_a = AL.Pathfinder.computePathCost(path_a)
        const d_b = AL.Pathfinder.computePathCost(path_b)
        return d_a - d_b
    }
}

/**
 * This function will prioritize monsters based on type, then which ones are closest to the character
 * 
 * This function is meant to be used with `[].sort()`
 *
 * Example: `targets.sort(sortTypeThenClosest(bot, ["osnake", "snake"]))`
 *
 * @param to Compare the distance to this point
 * @returns A sorting function that will sort the objects closest to the position first
 */
export function sortTypeThenClosest(to: Character, types: MonsterName[]) {
    return (a: Entity, b: Entity) => {
        const a_index = types.indexOf(a.type)
        const b_index = types.indexOf(b.type)
        if (a_index < b_index) return -1
        else if (a_index > b_index) return 1

        const d_a = AL.Tools.squaredDistance(to, a)
        const d_b = AL.Tools.squaredDistance(to, b)
        return d_a - d_b
    }
}

/**
 * This function will prioritize monsters based on type, then spread out and try to prioritize
 * ones that are further away from other party members
 * 
 * This function is meant to be used with `[].sort()`
 * 
 * Example: `targets.sort(sortTypeThenClosest(bot, ["osnake", "snake"]))`
 * 
 * @param to 
 * @param types 
 * @returns 
 */
export function sortSpreadOut(to: Character, types: MonsterName[]) {
    return (a: Entity, b: Entity) => {
        const a_index = types.indexOf(a.type)
        const b_index = types.indexOf(b.type)
        if (a_index < b_index) return -1
        else if (a_index > b_index) return 1

        const players = to.getPlayers({ isPartyMember: true })

        const distanceToA = AL.Tools.squaredDistance(to, a)
        const distanceToB = AL.Tools.squaredDistance(to, b)

        let minDistanceToA = distanceToA
        let minDistanceToB = distanceToB
        if (players.length) {
            // Check if we're the closest to the monster
            let weAreClosestToA = true;
            let weAreClosestToB = true;
            for (const player of players) {
                const playerDistanceToA = AL.Tools.squaredDistance(player, a)
                if (playerDistanceToA < distanceToA) weAreClosestToA = false
                if (playerDistanceToA < minDistanceToA) minDistanceToA = playerDistanceToA
                const playerDistanceToB = AL.Tools.squaredDistance(player, b)
                minDistanceToB += playerDistanceToB
                if (playerDistanceToB < distanceToB) weAreClosestToB = false
                if (playerDistanceToB < minDistanceToB) minDistanceToB = playerDistanceToB
            }

            // Return if we're the closest to one of them
            if (weAreClosestToA && !weAreClosestToB) return -1
            if (weAreClosestToB && !weAreClosestToA) return 1
        }

        // Return the one that's further away from other members of the party
        if (minDistanceToA > minDistanceToB) return -1
        if (minDistanceToB > minDistanceToA) return 1
        return 0
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

export function sortHighestHpFirst(a: Entity, b: Entity) {
    return a.hp > b.hp
}

export function sortHighestLevelFirst(a: Entity, b: Entity) {
    return a.level > b.level
}

export function sortPriority(bot: Character, types?: MonsterName[]) {
    return (a: Entity, b: Entity): boolean => {
        const mainhand = AL.Game.G.items[bot.slots.mainhand?.name]
        const offhand = AL.Game.G.items[bot.slots.offhand?.name]
        const aoe = mainhand?.blast || mainhand?.explosion || offhand?.blast || offhand?.explosion

        if (aoe) {
            // 1hp -> lower priority
            const a_1hp = a["1hp"]
            const b_1hp = b["1hp"]
            if (!a_1hp && b_1hp) return true
            else if (a_1hp && !b_1hp) return false

            // Prioritize lower evasion
            const a_evasion = a.evasion
            const b_evasion = b.evasion
            if (a_evasion < b_evasion) return true
            else if (a_evasion > b_evasion) return false
        }

        // Lower index in array -> higher priority
        if (types?.length) {
            const a_index = types.indexOf(a.type)
            const b_index = types.indexOf(b.type)
            if (a_index < b_index) return true
            else if (a_index > b_index) return false
        }

        // Has a target -> higher priority
        if (a.target && !b.target) return true
        else if (!a.target && b.target) return false

        // Will die -> lower priority
        const a_willDie = a.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        const b_willDie = b.willDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        if (!a_willDie && b_willDie) return true
        else if (a_willDie && !b_willDie) return false

        // Will burn to death -> lower priority
        const a_willBurn = a.willBurnToDeath()
        const b_willBurn = b.willBurnToDeath()
        if (!a_willBurn && b_willBurn) return true
        else if (a_willBurn && !b_willBurn) return false

        // Could die -> lower priority
        const a_couldDie = a.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        const b_couldDie = b.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities)
        if (!a_couldDie && b_couldDie) return true
        else if (a_couldDie && !b_couldDie) return false

        // If we have a splash weapon, prioritize monsters with other monsters around them
        if (aoe) {
            // TODO: According to https://discord.com/channels/238332476743745536/238366540091621377/1060555230246354965, the range is 50 for explosion
            //       If that's true, we should move the 50 to a constant in AL.Constants
            const a_nearby = bot.getEntities({ withinRangeOf: a, withinRange: 50 }).length
            const b_nearby = bot.getEntities({ withinRangeOf: b, withinRange: 50 }).length
            if (a_nearby > b_nearby) return true
            else if (b_nearby > a_nearby) return false
        }

        // Higher HP -> higher priority
        if (a.hp > b.hp) return true
        else if (a.hp < b.hp) return false

        // Further from other party members -> higher priority
        const players = bot.getPlayers({ isPartyMember: true })
        if (players.length) {
            const a_party_distance = players
                .map(player => {
                    const distance = AL.Tools.squaredDistance(a, player)
                    const moving = player.moving ? AL.Tools.squaredDistance(a, { x: player.going_x, y: player.going_y }) : 0
                    return distance + moving
                })
                .reduce((sum, distance) => sum + distance, 0)
            const b_party_distance = players
                .map(player => {
                    const distance = AL.Tools.squaredDistance(b, player)
                    const moving = player.moving ? AL.Tools.squaredDistance(b, { x: player.going_x, y: player.going_y }) : 0
                    return distance + moving
                })
                .reduce((sum, distance) => sum + distance, 0)
            return a_party_distance > b_party_distance
        }

        // Closer -> higher priority
        return AL.Tools.distance(a, bot) < AL.Tools.distance(b, bot)
    }
}