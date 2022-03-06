import AL from "alclient"

async function run() {
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData()])
    await AL.Pathfinder.prepare(AL.Game.G)

    const merchant = await AL.Game.startMerchant("attackMag", "EU", "I")
    console.log("Moving to main")
    await merchant.smartMove("main")
    console.log("Moving to cyberland")
    await merchant.smartMove("cyberland")
    console.log("Moving to halloween")
    await merchant.smartMove("halloween")

    console.log(merchant.pings)
    merchant.disconnect()
}
run()