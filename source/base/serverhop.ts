import AL from "alclient-mongo"

export const SERVER_HOP_SERVERS: [AL.ServerRegion, AL.ServerIdentifier][] = [
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

/**
 * Chooses a server based on the date & time. Use this for characters that hop between servers to check easily killable monsters
 * @param offset If we're checking with many characters, offset so they won't interfere with each other logging in
 * @param avoidPVP Should we check, or avoid PvP servers?
 * @returns
 */
export function getTargetServerFromDate(offset = 0, avoidPVP = false): [AL.ServerRegion, AL.ServerIdentifier] {
    let next = (Math.floor(Date.now() / 1000 / 60) + offset) % (SERVER_HOP_SERVERS.length)
    if (avoidPVP && next >= SERVER_HOP_SERVERS.length - NUM_PVP) next -= NUM_PVP
    if (avoidPVP) return SERVER_HOP_SERVERS[next]
    else return SERVER_HOP_SERVERS[next]
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
export async function getTargetServerFromMonsters(G: AL.GData, defaultRegion: AL.ServerRegion, defaultIdentifier: AL.ServerIdentifier): Promise<[AL.ServerRegion, AL.ServerIdentifier]> {
    // Priority #1: Special co-op monsters that take a team effort
    const coop: AL.MonsterName[] = [
        "dragold", "grinch", "icegolem", "mrgreen", "mrpumpkin", "franky"
    ]
    const coopEntities: AL.IEntity[] = await AL.EntityModel.aggregate([
        {
            $match: {
                lastSeen: { $gt: Date.now() - 30_000 },
                serverIdentifier: { $nin: ["PVP"] },
                target: { $ne: undefined }, // We only want to do these if others are doing them, too.
                type: { $in: coop }
            }
        },
        { $addFields: { __order: { $indexOfArray: [coop, "$type"] } } },
        { $sort: { "__order": 1, "hp": 1 } }]).exec()
    for (const entity of coopEntities) return [entity.serverRegion, entity.serverIdentifier]

    // Priority #2: Special monsters that we can defeat by ourselves
    const solo: AL.MonsterName[] = [
        // Very Rare Monsters
        "goldenbat", "tinyp", "cutebee",
        // Event Monsters
        "pinkgoo", "wabbit",
        // // Rare Monsters
        "greenjr", "jr", "skeletor", "mvampire", "fvampire", "snowman", "stompy"
    ]
    const soloEntities: AL.IEntity[] = await AL.EntityModel.aggregate([
        {
            $match: {
                lastSeen: { $gt: Date.now() - 30_000 },
                serverIdentifier: { $nin: ["PVP"] },
                type: { $in: solo },
            }
        },
        { $addFields: { __order: { $indexOfArray: [solo, "$type"] } } },
        { $sort: { "__order": 1, "hp": 1 } }]).exec()
    for (const entity of soloEntities) {
        if (!G.monsters[entity.type].cooperative && entity.target) continue // The target isn't cooperative, and someone is already attacking it
        return [entity.serverRegion, entity.serverIdentifier]
    }

    // Priority #3: Default Server
    return [defaultRegion, defaultIdentifier]
}