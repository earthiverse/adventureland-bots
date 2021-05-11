import AL, { Database } from "alclient-mongo"


async function run() {
    await Promise.all([AL.Game.loginJSONFile("../../credentials.json")])

    const bot = await AL.Game.startCharacter("earthPri", "ASIA", "I")
    await Promise.all([bot.getTrackerData(), bot.regenHP()])
    await bot.disconnect()
    await Database.disconnect()
}
run()