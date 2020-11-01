import AL from "alclient"
const { Game, Pathfinder } = AL

let earthMer: AL.Merchant

async function run(region: AL.ServerRegion, identifier: AL.ServerIdentifier) {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    let lastServerTime = 0
    const loginLoop = async () => {
        try {
            if (lastServerTime > Date.now() - 30000) {
                setTimeout(async () => { loginLoop() }, Math.max(1000, lastServerTime - Date.now() - 30000))
                return
            }

            // TODO: Check if we have any characters disconnected

            // Start all characters
            let earthMerP = Game.startMerchant("earthMer", region, identifier)

            // Put all characters in to variables
            let earthMer = await earthMerP
        } catch (e) {
            console.error(e)
        }
    }
}
run("ASIA", "I")