import AL from "alclient-mongo"

export const SERVER_HOP_SERVERS: [AL.ServerRegion, AL.ServerIdentifier][] = [
    ["ASIA", "I"],
    ["US", "I"],
    // ["US", "II"],
    ["US", "III"],
    ["EU", "I"],
    ["EU", "II"],
    ["US", "PVP"],
    ["EU", "PVP"]
]
const NUM_PVP = 2

export function getTargetServer(offset = 0, avoidPVP = false): [AL.ServerRegion, AL.ServerIdentifier] {
    let next = (Math.floor(Date.now() / 1000 / 60) + offset) % (SERVER_HOP_SERVERS.length)
    if (avoidPVP && next >= SERVER_HOP_SERVERS.length - NUM_PVP) next -= NUM_PVP
    if (avoidPVP) return SERVER_HOP_SERVERS[next]
    else return SERVER_HOP_SERVERS[next]
}