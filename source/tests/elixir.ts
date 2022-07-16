import AL from "alclient"

async function run() {
    console.log("Logging in, etc...")
    await Promise.all([AL.Game.loginJSONFile("../../credentials_attack.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    const bot = await AL.Game.startMerchant("attackMer", "ASIA", "I")

    console.log(`Elixir: ${bot.slots.elixir}`)
    console.log(`Computer: ${bot.hasItem("computer") || bot.hasItem("supercomputer")}`)
    console.log(`CanBuy: ${bot.canBuy("elixirluck", { ignoreLocation: true })}`)
    console.log(`IsFull: ${bot.isFull()}`)

    bot.disconnect()
}

run()