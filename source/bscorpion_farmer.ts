import AL from "alclient"
const { Game, Pathfinder } = AL

let earthMer: AL.Merchant
let earthPri: AL.Priest
let earthMag: AL.Mage
let earthiverse: AL.Ranger

async function startCharacter(character: AL.PingCompensatedCharacter) {
    async function moveLoop() {
        try {
            await character.smartMove("main", { getWithin: character.character.range })
            await character.smartMove("winterland", { getWithin: character.character.range })
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { moveLoop() }, 1000)
    }
    moveLoop()
}

async function run(region: AL.ServerRegion, identifier: AL.ServerIdentifier) {
    // Login and prepare pathfinding
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    // Start all characters
    console.log("Connecting...")
    let earthMerP = Game.startMerchant("earthMer", region, identifier)
    let earthPriP = Game.startPriest("earthPri", region, identifier)
    let earthMagP = Game.startMage("earthMag", region, identifier)
    let earthiverseP = Game.startRanger("earthiverse", region, identifier)
    earthMer = await earthMerP
    earthPri = await earthPriP
    earthMag = await earthMagP
    earthiverse = await earthiverseP

    const reconnect = async (character: AL.PingCompensatedCharacter) => {
        console.log(`Reconnecting ${character.character.id}...`)
        character.disconnect()
        character.connect()
        character.socket.on("disconnect", () => { reconnect(character) })
    }

    earthMer.socket.on("disconnect", () => { reconnect(earthMer) })
    earthPri.socket.on("disconnect", () => { reconnect(earthPri) })
    earthMag.socket.on("disconnect", () => { reconnect(earthMag) })
    earthiverse.socket.on("disconnect", () => { reconnect(earthiverse) })

    startCharacter(earthMer)
    startCharacter(earthPri)
    startCharacter(earthMag)
    startCharacter(earthiverse)
}
run("US", "II")