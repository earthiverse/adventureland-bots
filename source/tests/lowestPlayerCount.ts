import AL, { ServerData, ServerIdentifier, ServerRegion } from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])

    let lowestPlayerCount: ServerData
    const avoidRegions: ServerRegion[] = ["ASIA", "EU"] // Don't join ASIA
    const avoidIdentifiers: ServerIdentifier[] = ["PVP", "HARDCORE"] // Don't join PVP
    for (const rID in AL.Game.servers) {
        const region = rID as ServerRegion
        if (avoidRegions.includes(region)) continue
        const servers = AL.Game.servers[region]
        for (const sID in servers) {
            const identifier = sID as ServerIdentifier
            if (avoidIdentifiers.includes(identifier)) continue
            const server = servers[identifier]
            if (lowestPlayerCount === undefined) {
                lowestPlayerCount = server
            } else if (server.players < lowestPlayerCount.players) {
                lowestPlayerCount = server
            }
        }
    }
    console.log(`${lowestPlayerCount.region} ${lowestPlayerCount.name} has the fewest players (${lowestPlayerCount.players})`)

    AL.Database.disconnect()
}
run()