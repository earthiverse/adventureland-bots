import { performance } from "perf_hooks"
import { Game } from "./Game.js"

async function run() {
    let then = performance.now()
    await Game.getVersion()
    console.log(performance.now() - then)

    then = performance.now()
    await Game.getGData(true)
    console.log(performance.now() - then)
    Game.disconnect()
}
run()