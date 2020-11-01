import alclient from "alclient"
const { Game, Pathfinder } = alclient

async function run() {
    await Promise.all([Game.loginJSONFile("../credentials.json"), Pathfinder.prepare()])

    const merchant = await Game.startMerchant("earthMer2", "ASIA", "I")
    console.log("Moving to main")
    await merchant.smartMove("main")
    console.log("Moving to cyberland")
    await merchant.smartMove("cyberland")
    console.log("Moving to main")
    await merchant.smartMove("main")

    Game.disconnect()
}
run()