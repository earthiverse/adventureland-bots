import neo from "@neopass/wordlist"
const { wordList } = neo
import { Game } from "./Game.js"
import { Player } from "./Player.js"

let words: string[]

async function startMainframeBot(bot: Player) {
    console.info(`Starting MainFrameBot (${bot.character.id})!`)

    bot.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.disconnect()
    })

    async function lootLoop() {
        try {
            for (const id of bot.chests.keys()) {
                bot.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function submitLoop() {
        if (bot.players.size > 0) {

            // Wait for players to go away
            console.log("waiting for players to go away")
            console.log(bot.players.keys())
            setTimeout(async () => { submitLoop() }, 10000)
            return
        }
        const word = words.pop()
        const then = Date.now()
        const mainframeCheck = (data: { owner: string, message: string, id: string }) => {
            console.log(`${data.owner}: ${data.message}`)
            if (data.owner == "mainframe") {
                bot.socket.removeListener("chat_log", mainframeCheck)
                setTimeout(async () => { submitLoop() }, 100 - (Date.now() - then))
            }
        }
        bot.socket.on("chat_log", mainframeCheck)
        console.log(`give ${word}`)
        bot.socket.emit("eval", { command: `give ${word}` })
    }
    submitLoop()
}

async function run() {
    await Game.loginJSONFile("../credentials.json")

    words = await wordList()

    const earthiverse = await Game.startCharacter("earthiverse", "ASIA", "I")
    startMainframeBot(earthiverse)
    const earthMag = await Game.startCharacter("earthMag", "US", "I")
    startMainframeBot(earthMag)
    const earthMag2 = await Game.startCharacter("earthMag2", "US", "II")
    startMainframeBot(earthMag2)

}
run()