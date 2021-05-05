import axios from "axios"
import AL from "alclient"

const servers: [AL.ServerRegion, AL.ServerIdentifier][] = [
    ["ASIA", "I"],
    ["US", "I"],
    ["US", "II"],
    ["US", "III"],
    ["US", "PVP"],
    ["EU", "I"],
    ["EU", "II"],
    ["EU", "PVP"]
]

// const notableNPCs: string[] = ["Angel", "Kane"]

async function run() {
    await Promise.all([AL.Game.loginJSONFile("../credentials.json"), AL.Game.getGData()])

    for (const [region, identifier] of servers) {
        console.log(`Starting ${region} ${identifier} ALData logger`)
        const observer = await AL.Game.startObserver(region, identifier)

        // // Server Status
        // observer.socket.on("server_info", async (data: AL.ServerData) => {
        //     const statuses = Object.keys(data).filter(k => { typeof data[k] === "object" }).map(e => {
        //         data[e].eventname = e
        //         data[e].server_region = region
        //         data[e].server_identifier = identifier

        //         return data[e]
        //     })

        //     axios.post("https://aldata.info/api/serverstatuses", statuses, { headers: { "Content-Type": "application/json" } })
        // })

        // // NPCs
        // observer.socket.on("new_map", async (data: AL.NewMapData) => {
        //     // Help out super in his data gathering
        //     const npcInfos = []
        //     data.entities
        //     for (const npc of notableNPCs) {
        //         for (const player of data.entities.players) {
        //             if (npc == player.id) {
        //                 npcInfos.push({
        //                     server_region: region,
        //                     server_identifier: identifier,
        //                     map: data.name,
        //                     x: player.going_x,
        //                     y: player.going_y,
        //                     name: npc
        //                 })
        //             }
        //         }
        //     }

        //     if (npcInfos.length > 0) {
        //         axios.post("https://aldata.info/api/npcinfos", npcInfos, { headers: { "Content-Type": "application/json" } })
        //     }
        // })
    }
}
run()