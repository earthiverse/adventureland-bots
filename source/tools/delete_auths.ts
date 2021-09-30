import AL from "alclient"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    console.log("Logging all sessions...")
    await AL.Game.logoutEverywhere()

    AL.Database.disconnect()
})
