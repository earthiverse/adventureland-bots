import AL, { GData, IEntity, MonsterName, ServerIdentifier, ServerRegion } from "alclient"

export const SERVER_HOP_SERVERS: [ServerRegion, ServerIdentifier][] = [
    ["ASIA", "I"],
    ["US", "I"],
    ["US", "II"],
    ["US", "III"],
    ["EU", "I"],
    ["EU", "II"],
    ["US", "PVP"],
    ["EU", "PVP"]
]
const NUM_PVP = 2

export function getTargetServerFromCurrentServer(currentRegion: ServerRegion, currentIdentifier: ServerIdentifier, avoidPVP = false): [ServerRegion, ServerIdentifier] {
    for (let i = 0; i < SERVER_HOP_SERVERS.length; i++) {
        const server = SERVER_HOP_SERVERS[i]
        if (server[0] == currentRegion && server[1] == currentIdentifier) {
            // The next one is our target
            let next: number
            if (avoidPVP) {
                next = (i + 1) % (SERVER_HOP_SERVERS.length - NUM_PVP)
            } else {
                next = (i + 1) % SERVER_HOP_SERVERS.length
            }
            return SERVER_HOP_SERVERS[next]
        }
    }
}

/**
 * Chooses a server based on the date & time. Use this for characters that hop between servers to check easily killable monsters
 * @param offset If we're checking with many characters, offset so they won't interfere with each other logging in
 * @param avoidPVP Should we check, or avoid PvP servers?
 * @returns
 */
export function getTargetServerFromDate(offset = 0, avoidPVP = false): [ServerRegion, ServerIdentifier] {
    let next: number
    if (avoidPVP) {
        next = (Math.floor(Date.now() / 1000 / 60) + offset) % (SERVER_HOP_SERVERS.length - NUM_PVP)
    } else {
        next = (Math.floor(Date.now() / 1000 / 60) + offset) % SERVER_HOP_SERVERS.length
    }
    return SERVER_HOP_SERVERS[next]
}

/**
 * Looks for special monsters on the various servers, and returns the "best choice" for a server based on the
 * monsters that are alive on that server. Use this for characters that spend a long time on a server and only hop
 * if there's something juicy.
 *
 * @param defaultRegion The default server to hang out on if no special monsters are found
 * @param defaultIdentifier The default identifier to hang out on if no special monsters are found
 * @returns
 */
export async function getTargetServerFromMonsters(G: GData, defaultRegion: ServerRegion, defaultIdentifier: ServerIdentifier,
    coop: MonsterName[] = [
        "dragold", "grinch", "icegolem", "mrpumpkin", "mrgreen", "franky"
    ],
    solo: MonsterName[] = [
    // Very Rare Monsters
        "goldenbat", "tinyp", "cutebee",
        // Event Monsters
        "pinkgoo", "wabbit",
        // // Rare Monsters
        "greenjr", "jr", "skeletor", "mvampire", "fvampire", "snowman", "stompy"
    ]): Promise<[ServerRegion, ServerIdentifier]> {
    // Look for entities in the database
    if (coop.length || solo.length) {
        const coopEntities: IEntity[] = await AL.EntityModel.aggregate([
            {
                $match: {
                    $or: [
                        {
                            // NOTE: Temporarily off for Halloween
                            // serverIdentifier: { $nin: ["PVP"] },
                            target: { $ne: undefined }, // We only want to do these if others are doing them, too.
                            type: { $in: coop }
                        },
                        {
                            $or: [
                                { target: undefined },
                                { type: { $in: ["pinkgoo", "snowman", "wabbit"] } } // Coop monsters will give credit
                            ],
                            serverIdentifier: { $nin: ["PVP"] },
                            type: { $in: solo },

                        }
                    ],
                }
            },
            { $addFields: { __order: { $indexOfArray: [[...coop, ...solo], "$type"] } } },
            { $sort: { "__order": 1, "hp": 1 } },
            { $project: { "_id": 0, "serverIdentifier": 1, "serverRegion": 1 } }]).exec()
        for (const entity of coopEntities) return [entity.serverRegion, entity.serverIdentifier]
    }

    // If there are none, use the default server
    return [defaultRegion, defaultIdentifier]
}

/**
 *
 * @param defaultRegion The default region to fall back to if the player can't be found
 * @param defaultIdentifier The default identifier to fall back to if the player can't be found
 * @param playerID The player ID to look for
 * @param lastSeen How recently the player has to have been seen (in ms) to be considered active
 * @returns The server/region the player is currently active on
 */
export async function getTargetServerFromPlayer(defaultRegion: ServerRegion, defaultIdentifier: ServerIdentifier, playerID: string, lastSeen = 120_000): Promise<[ServerRegion, ServerIdentifier]> {
    const player = await AL.PlayerModel.findOne({ lastSeen: { $gt: Date.now() - lastSeen }, name: playerID }).lean().exec()
    if (player.serverRegion && player.serverIdentifier) return [player.serverRegion, player.serverIdentifier]
    return [defaultRegion, defaultIdentifier]
}