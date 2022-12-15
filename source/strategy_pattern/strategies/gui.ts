import { addSocket, startServer } from "algui"
import AL, { Character } from "alclient"
import { Loop, LoopName, Strategy } from "../context.js"

export type GuiOptions = {
    /** What port to start the server on, if the GUI isn't already started */
    port: number
}

export class GuiStrategy implements Strategy<Character> {
    public loops = new Map<LoopName, Loop<Character>>()

    protected static started = false

    protected options: GuiOptions

    public constructor(options: GuiOptions) {
        this.options = options

        if (!GuiStrategy.started) {
            GuiStrategy.started = true
            startServer(options.port, AL.Game.G)
        }
    }

    public onApply(bot: Character) {
        addSocket(bot.id, bot.socket, bot)
    }
}