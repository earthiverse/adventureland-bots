import AL from "alclient-mongo"


AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    // TODO: when ALClient is updated, add this

    AL.Database.disconnect()
})