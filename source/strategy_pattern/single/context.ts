import { PingCompensatedCharacter } from "alclient"

export type Loop<Type> = {
    fn: (bot: Type) => Promise<void>,
    interval: number
}

export type Loops<Type> = Map<string, Loop<Type>>

export interface SingleCharStrategy<Type> {
    name: string
    loops: Loops<Type>
}

export class SingleChar<Type extends PingCompensatedCharacter> {
    private bot: Type

    private loops: Loops<Type> = new Map<string, Loop<Type>>()
    private stopped = false
    private timeouts = new Map<string, NodeJS.Timeout>()

    public constructor(bot: Type, initialStrategy?: SingleCharStrategy<Type>) {
        this.bot = bot

        this.setStrategies(initialStrategy)
    }

    public setStrategies(strategy: SingleCharStrategy<Type>) {
        if (!strategy) return // No strategy

        for (const [name, fn] of strategy.loops) {
            if (fn == undefined) {
                // Stop the loop
                if (this.loops.has(name)) console.log(`Strategy '${strategy.name}' is stopping the '${name}' loop`)
                this.loops.delete(name)
            } else if (this.loops.has(name)) {
                // Change the loop
                if (this.loops.has(name)) console.log(`Strategy '${strategy.name}' is changing the '${name}' loop`)
                this.loops.set(name, fn)
            } else {
                // Start the loop
                console.log(`Strategy '${strategy.name}' is adding the '${name}' loop`)
                this.loops.set(name, fn)

                const newLoop = async () => {
                    try {
                        const loop = this.loops.get(name)
                        if (!loop || this.stopped) return // Stop the loop
                        await loop.fn(this.bot) // Run the loop
                    } catch (e) {
                        console.error(e)
                    }
                    if (!this.stopped) {
                        const loop = this.loops.get(name)
                        if (loop) this.timeouts.set(name, setTimeout(async () => { newLoop() }, loop.interval)) // Continue the loop
                    }
                }
                newLoop()
            }
        }
    }

    public stop(): void {
        this.stopped = true
        for (const [, timeout] of this.timeouts) clearTimeout(timeout)
    }
}