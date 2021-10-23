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

    // const bot = await AL.Game.startCharacter("earthMer3", "ASIA", "I")
    // try {
    //     let data2 = await bot.smartMove({ map: "winterland", x: -280, y: -123 })
    //     console.log(data2)
    //     data2 = await bot.move(-280, -123)
    //     console.log(data2)
    //     // data2 = await bot.smartMove("elixirluck", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
    //     // console.log(data2)
    //     data2 = await bot.smartMove("monsterhunter", { getWithin: AL.Constants.NPC_INTERACTION_DISTANCE - 1 })
    //     console.log(data2)
    // } catch (e) {
    //     console.error(e)
    // }

    const canWalk = AL.Pathfinder.canWalkPath({ map: "main", x: 17, y: -152 }, { map: "main", x: 0, y: 0 })
    console.log(`canWalk: ${canWalk}`)

    const data2 = await AL.Pathfinder.getPath({ map: "main", x: 17, y: -152 }, { map: "main", x: 383, y: 1480 }, { avoidTownWarps: true, costs: { town: 11450 } })
    console.log(data2)

    // bot.disconnect()
}
run()