import AL from "alclient"
AL.Game.loginJSONFile("../credentials.json").then(async () => {
    console.log("Preparing pathfinding...")
    await AL.Pathfinder.prepare()

    console.log("Finding path from 'main' to 'spookytown'")
    let start = Date.now()
    let path = AL.Pathfinder.getPath({ map: "main", x: 0, y: 0 }, { map: "spookytown", x: 0, y: 0 })
    console.log(`Computed path in ${Date.now() - start}ms`)

    console.log("Finding path from 'spookytown' to 'main'")
    start = Date.now()
    path = AL.Pathfinder.getPath({ map: "spookytown", x: 0, y: 0 }, { map: "main", x: 0, y: 0 })
    console.log(`Computed path in ${Date.now() - start}ms`)

    console.log("Finding path from 'winterland' to 'main'")
    start = Date.now()
    path = AL.Pathfinder.getPath({ map: "winterland", x: 0, y: 0 }, { map: "main", x: 0, y: 0 })
    console.log(`Computed path in ${Date.now() - start}ms`)
})