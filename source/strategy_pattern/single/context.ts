import { Single_Strategy } from "./strategy.js"

export class SingleCharacter<Type> {
    private character: Type
    private strategy: Single_Strategy<Type>

    private timeouts = new Map<string, NodeJS.Timeout>()
    private stopped = false

    public constructor(character: Type) {
        this.character = character
    }

    public setStrategy(strategy: Single_Strategy<Type>) {
        console.log(`Switching strategy from ${this.strategy?.name ?? "no_strategy"} to ${strategy.name}.`)
        this.strategy = strategy
    }

    public async attackLoop(): Promise<void> {
        try {
            await this.strategy?.attack(this.character)
        } catch (e) {
            console.error(e)
        }
        if (!this.stopped) this.timeouts.set("attack", setTimeout(async () => { this.attackLoop() }, 100))
    }

    public async healLoop(): Promise<void> {
        try {
            await this.strategy?.heal(this.character)
        } catch (e) {
            console.error(e)
        }
        if (!this.stopped) this.timeouts.set("heal", setTimeout(async () => { this.healLoop() }, 100))
    }

    public async lootLoop(): Promise<void> {
        try {
            await this.strategy?.loot(this.character)
        } catch (e) {
            console.error(e)
        }
        if (!this.stopped) this.timeouts.set("loot", setTimeout(async () => { this.lootLoop() }))
    }

    public async moveLoop(): Promise<void> {
        try {
            await this.strategy?.move(this.character)
        } catch (e) {
            console.error(e)
        }
        if (!this.stopped) this.timeouts.set("move", setTimeout(async () => { this.moveLoop() }, 100))
    }

    public stop(): void {
        this.stopped = true
        for (const [, timeout] of this.timeouts) clearTimeout(timeout)
    }
}