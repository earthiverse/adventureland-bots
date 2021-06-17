import AL from "alclient-mongo"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    console.log("Pruning achievements...")

    // TODO: Prune achievements

    AL.Database.disconnect()
})