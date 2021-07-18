import AL from "alclient"

async function run() {
    // Login and prepare pathfinding
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json"), AL.Game.getGData(true)])
    await AL.Pathfinder.prepare(AL.Game.G)

    // We are having trouble with this path
    const data = await AL.Pathfinder.getPath({ map: "winterland", x: -280, y: -123 }, { map: "main", x: 127, y: -416 })
    console.log(data)

    const standable = await AL.Pathfinder.canStand({ map: "winterland", x: -280, y: -123 })
    console.log(standable)

    const bot = await AL.Game.startCharacter("earthPal", "ASIA", "I")
    try {
        let data2 = await bot.smartMove({ map: "winterland", x: -280, y: -123 })
        console.log(data2)
        data2 = await bot.move(-280, -123)
        console.log(data2)
        data2 = await bot.smartMove("elixirluck", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
        console.log(data2)
        data2 = await bot.smartMove({ map: "main", x: 127, y: -416 })
        console.log(data2)
    } catch (e) {
        console.error(e)
    }
    bot.disconnect()
}
run()