import AL from "alclient"
import { getTargetServerFromMonsters } from "../base/serverhop.js"
import { DEFAULT_IDENTIFIER, DEFAULT_REGION } from "../archive/monsterhunt/shared.js"

AL.Game.loginJSONFile("../../credentials.json").then(async () => {
    const G = await AL.Game.getGData(true)
    const targetServer = await getTargetServerFromMonsters(G, DEFAULT_REGION, DEFAULT_IDENTIFIER)

    console.log(`The target server is ${targetServer[0]} ${targetServer[1]}`)

    AL.Database.disconnect()
})