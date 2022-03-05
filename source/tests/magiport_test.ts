import AL from "alclient"
import { sleep } from "../base/general.js"

async function run() {
    // Prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // Login
    const promises: Promise<unknown>[] = []
    // const target = AL.Game.startMage("attackMag", "EU", "II")
    // promises.push(target)
    const magiporterP = AL.Game.startMage("attackMag2", "EU", "II")
    promises.push(magiporterP)
    const supporterP = AL.Game.startWarrior("attackWar", "EU", "II")
    promises.push(supporterP)
    await Promise.all(promises)

    const magiporter = await magiporterP
    const supporter = await supporterP

    // Setup positions
    promises.splice(0)
    // promises.push(target.smartMove({ map: "arena", x: 1100, y: 0 }))
    promises.push(magiporter.smartMove({ map: "arena", x: 150, y: 40 }))
    promises.push(supporter.smartMove({ map: "main", x: 0, y: 0 }))
    promises.push(sleep(10000)) // Can't attack right away from spawning
    await Promise.all(promises)

    // Blink -> Magiport -> Attack
    magiporter.blink(1090, 10)
    magiporter.magiport(supporter.id)
    supporter.acceptMagiport(magiporter.id)
    supporter.stomp()
    magiporter.basicAttack("attackMag")
    supporter.basicAttack("attackMag")
    magiporter.warpToJail()
    supporter.warpToJail()
}
run()