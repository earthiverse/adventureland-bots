import { PingCompensatedGame as Game } from "./game.js"
import { Bot } from "./bot.js"
import neo from "@neopass/wordlist"
const { wordList } = neo
import { ServerRegion, ServerIdentifier } from "./definitions/adventureland.js"

let words: string[]

async function startMainframeBot(auth: string, character: string, user: string, server: ServerRegion, identifier: ServerIdentifier) {
    const game = new Game(server, identifier)
    await game.connect(auth, character, user)

    console.info(`Starting MainFrameBot (${character})!`)
    const bot = new Bot(game)

    bot.game.socket.on("disconnect_reason", (data: string) => {
        console.warn(`Disconnecting (${data})`)
        bot.game.disconnect()
    })

    async function lootLoop() {
        try {
            for (const id of bot.game.chests.keys()) {
                bot.game.socket.emit("open_chest", { id: id })
            }
        } catch (e) {
            console.error(e)
        }

        setTimeout(async () => { lootLoop() }, 1000)
    }
    lootLoop()

    async function submitLoop() {
        if (game.players.size > 0) {

            // Wait for players to go away
            console.log("waiting for players to go away")
            console.log(game.players.keys())
            setTimeout(async () => { submitLoop() }, 10000)
            return
        }
        const word = words.pop()
        const then = Date.now()
        const mainframeCheck = (data: { owner: string, message: string, id: string }) => {
            console.log(`${data.owner}: ${data.message}`)
            if (data.owner == "mainframe") {
                bot.game.socket.removeListener("chat_log", mainframeCheck)
                setTimeout(async () => { submitLoop() }, 100 - (Date.now() - then))
            }
        }
        bot.game.socket.on("chat_log", mainframeCheck)
        console.log(`give ${word}`)
        bot.game.socket.emit("eval", { command: `give ${word}` })
    }
    submitLoop()
}

async function run() {
    words = await wordList()
    // startMainframeBot("secret", "secret", "secret", "ASIA", "I") // earthiverse
    // startMainframeBot("secret", "secret", "secret", "ASIA", "I") // earthMag
    startMainframeBot("secret", "secret", "secret", "US", "III") // earthMag2
}
run()