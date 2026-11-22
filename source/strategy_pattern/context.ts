import AL, { PingCompensatedCharacter, ServerData, ServerIdentifier, ServerRegion, SkillName } from "alclient"
import { createErrorWithCause } from "../base/general.js"

export type Loop<Type> = {
    fn: (bot: Type) => Promise<unknown>
    /** If number, it will loop every this many ms. If SkillName, it will loop based on the cooldown of the skills in the array */
    interval: SkillName[] | number
}
type ContextLoop<Type> = Loop<Type> & {
    fn: (bot: Type) => Promise<unknown>
    interval: SkillName[] | number
    started: Date
}

export type LoopName =
    | "attack"
    | "avoid_death"
    | "avoid_stacking"
    | "booster"
    | "buy"
    | "charge"
    | "compound"
    | "connect"
    | "destroy"
    | "elixir"
    | "equip"
    | "exchange"
    | "heal"
    | "invis"
    | "item"
    | "loot"
    | "magiport"
    | "merchant_stand"
    | "mluck"
    | "move"
    | "party"
    | "partyheal"
    | "respawn"
    | "rspeed"
    | "sell"
    | "temporal"
    | "tracker"
    | "upgrade"

export type Loops<Type> = Map<LoopName, Loop<Type>>
type ContextLoops<Type> = Map<LoopName, ContextLoop<Type>>

export interface Strategy<Type> {
    loops?: Loops<Type>
    /** This function will be called when the strategy gets applied to the bot */
    onApply?: (bot: Type) => void
    /** If the strategy is removed, this function will be called */
    onRemove?: (bot: Type) => void
}

export class Strategist<Type extends PingCompensatedCharacter> {
    public bot: Type

    private connectAttempt = 0
    private disconnectHandler?: () => void
    private pendingConnectReject?: (reason: Error) => void
    private strategies = new Set<Strategy<Type>>()
    private loops: ContextLoops<Type> = new Map<LoopName, ContextLoop<Type>>()
    private started: Date
    private stopped = false
    private targetServerData?: { region: ServerRegion; name: ServerIdentifier }
    private timeouts = new Map<LoopName, NodeJS.Timeout>()

    public constructor(bot: Type, initialStrategy?: Strategy<Type>) {
        this.changeBot(bot)
        this.applyStrategy(initialStrategy)
    }

    public get targetServer(): { region: ServerRegion; name: ServerIdentifier } | undefined {
        if (this.targetServerData) return this.targetServerData
        if (!this.bot?.serverData) return undefined
        return { region: this.bot.serverData.region, name: this.bot.serverData.name }
    }

    public applyStrategy(strategy: Strategy<Type>) {
        if (!strategy) return // No strategy
        this.strategies.add(strategy)

        if (strategy.onApply) strategy.onApply(this.bot)

        if (!strategy.loops) return
        for (const [name, loop] of strategy.loops) {
            if (!loop) {
                // Stop the loop
                this.stopLoop(name)
            } else if (this.loops.has(name)) {
                const oldLoop = this.loops.get(name)
                // Change the loop
                this.loops.set(name, {
                    fn: loop.fn,
                    interval: loop.interval,
                    started: oldLoop.started,
                })
            } else {
                // Start the loop
                const now = new Date()
                this.loops.set(name, {
                    fn: loop.fn,
                    interval: loop.interval,
                    started: now,
                })

                const newLoop = async () => {
                    // Run the loop
                    const started = Date.now()
                    try {
                        const loop = this.loops.get(name)
                        if (!loop || this.stopped) return // Stop the loop
                        if (this.bot.ready) {
                            await loop.fn(this.bot) // Run the loop function
                        }
                    } catch (e) {
                        console.error(e)
                    }

                    // Setup the next run
                    const loop = this.loops.get(name)
                    if (!loop || this.stopped) return // Stop the loop
                    if (loop.started.getTime() > started) return
                    if (typeof loop.interval == "number")
                        this.timeouts.set(
                            name,
                            setTimeout(async () => {
                                newLoop()
                            }, loop.interval),
                        )
                    // Continue the loop
                    else if (Array.isArray(loop.interval)) {
                        const cooldown = Math.max(
                            50,
                            Math.min(...loop.interval.map((skill) => this.bot.getCooldown(skill))),
                        )
                        this.timeouts.set(
                            name,
                            setTimeout(async () => {
                                newLoop()
                            }, cooldown),
                        ) // Continue the loop
                    }
                }
                newLoop().catch(console.error)
            }
        }
    }

    public hasStrategy(strategy: Strategy<Type>) {
        return this.strategies.has(strategy)
    }

    public applyStrategies(strategies: Strategy<Type>[]) {
        for (const strategy of strategies) this.applyStrategy(strategy)
    }

    protected changeBot(newBot: Type) {
        if (this.bot && this.bot !== newBot) {
            // Disconnect any previous bot so we never leak a second active socket
            this.disconnectBot(this.bot)
        }

        this.bot = newBot
        this.targetServerData = newBot.serverData
            ? { region: newBot.serverData.region, name: newBot.serverData.name }
            : undefined
        this.disconnectHandler = () => {
            if (this.bot !== newBot || this.stopped) return
            this.reconnect().catch(console.error)
        }
        this.bot.socket?.on("disconnect", this.disconnectHandler)
        this.started = new Date()

        for (const strategy of this.strategies) {
            if (strategy.onApply) {
                strategy.onApply(newBot)
            }
        }
    }

    private clearPendingConnect(reason?: string): void {
        const timeout = this.timeouts.get("connect")
        if (timeout) {
            clearTimeout(timeout)
            this.timeouts.delete("connect")
        }

        if (this.pendingConnectReject) {
            const reject = this.pendingConnectReject
            this.pendingConnectReject = undefined
            reject(new Error(reason ?? "Connection attempt cancelled"))
        }
    }

    private disconnectBot(bot?: PingCompensatedCharacter): void {
        if (!bot) return
        if (this.disconnectHandler && bot === this.bot) {
            // Detach only our listener so alclient's Observer disconnect cleanup still runs
            bot.socket?.off("disconnect", this.disconnectHandler)
            this.disconnectHandler = undefined
        }
        bot.disconnect()
    }

    private createBot(region: ServerRegion, id: ServerIdentifier): PingCompensatedCharacter {
        const serverData = AL.Game.servers[region]?.[id]
        if (!serverData) {
            throw new Error(`No server data for ${region} ${id}`)
        }

        switch (this.bot.ctype) {
            case "mage":
                return new AL.Mage(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            case "merchant":
                return new AL.Merchant(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            case "paladin":
                return new AL.Paladin(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            case "priest":
                return new AL.Priest(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            case "ranger":
                return new AL.Ranger(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            case "rogue":
                return new AL.Rogue(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            case "warrior":
                return new AL.Warrior(this.bot.owner, this.bot.userAuth, this.bot.characterID, AL.Game.G, serverData)
            default:
                throw new Error(`No handler for ${String(this.bot.ctype)}`)
        }
    }

    private getRetryDelayMs(error: unknown): number | "fatal" {
        const message = String(error)
        const wait = /wait_(\d+)_second/.exec(message)
        if (wait && wait[1]) return 2000 + Number.parseInt(wait[1]) * 1000
        if (/limits/.test(message)) return AL.Constants.RECONNECT_TIMEOUT_MS
        if (/ingame/.test(message)) return 500
        if (/nouser/.test(message)) return "fatal"
        return 10_000
    }

    public changeServer(region: ServerRegion, id: ServerIdentifier, retry = true): Promise<void> {
        const attempt = ++this.connectAttempt
        this.clearPendingConnect("Server change superseded")
        this.targetServerData = { region, name: id }
        this.disconnectBot(this.bot)

        if (this.stopped) {
            return Promise.reject(new Error("Context is stopped"))
        }

        return new Promise<void>((resolve, reject) => {
            this.pendingConnectReject = reject

            const settleResolve = () => {
                if (this.pendingConnectReject === reject) {
                    this.pendingConnectReject = undefined
                }
                resolve()
            }

            const settleReject = (err: Error) => {
                if (this.pendingConnectReject === reject) {
                    this.pendingConnectReject = undefined
                }
                reject(err)
            }

            const switchBots = async () => {
                if (this.stopped || attempt !== this.connectAttempt) return

                let newBot: PingCompensatedCharacter
                try {
                    newBot = this.createBot(region, id)
                    await newBot.connect()

                    if (this.stopped || attempt !== this.connectAttempt) {
                        // Discard if superseded or stopped while awaiting connect
                        this.disconnectBot(newBot)
                        return
                    }

                    if (!newBot.socket || newBot.socket.disconnected || !newBot.ready) {
                        throw new Error("Disconnected before bot became ready")
                    }

                    this.changeBot(newBot as Type)
                    settleResolve()
                } catch (e) {
                    this.disconnectBot(newBot)
                    newBot = undefined

                    if (this.stopped || attempt !== this.connectAttempt) return

                    console.error(e)
                    if (!retry) {
                        settleReject(createErrorWithCause("Failed connecting, not retrying...", e))
                        return
                    }

                    const delay = this.getRetryDelayMs(e)
                    if (delay === "fatal") {
                        // Reject with the auth error before stop() cancels pending connects
                        settleReject(
                            createErrorWithCause(
                                `Authorization failed for ${this.bot.name}! No longer trying to reconnect...`,
                                e,
                            ),
                        )
                        this.stop()
                        return
                    }

                    const existing = this.timeouts.get("connect")
                    if (existing) clearTimeout(existing)
                    this.timeouts.set(
                        "connect",
                        setTimeout(() => {
                            this.timeouts.delete("connect")
                            void switchBots()
                        }, delay),
                    )
                }
            }

            void switchBots()
        })
    }

    public isReady() {
        return !this.stopped && this.bot && this.bot.ready && this.bot.socket.connected
    }

    public isStopped() {
        return this.stopped
    }

    public removeStrategy(strategy: Strategy<Type>) {
        if (strategy.loops) {
            for (const [loopName] of strategy.loops) {
                this.stopLoop(loopName)
            }
        }
        if (strategy.onRemove) strategy.onRemove(this.bot)

        this.strategies.delete(strategy)
    }

    public async reconnect(retry = true): Promise<void> {
        const attempt = ++this.connectAttempt
        this.clearPendingConnect("Reconnect superseded server change")
        const server = this.targetServer
        this.disconnectBot(this.bot)

        if (this.stopped) return
        if (!server) {
            throw new Error(`No server data available to reconnect ${this.bot?.name ?? "bot"}`)
        }

        const attemptReconnect = async (): Promise<void> => {
            if (this.stopped || attempt !== this.connectAttempt) return

            let newBot: PingCompensatedCharacter
            try {
                newBot = this.createBot(server.region, server.name)
                await newBot.connect()

                if (this.stopped || attempt !== this.connectAttempt) {
                    // Discard if superseded or stopped while awaiting connect
                    this.disconnectBot(newBot)
                    return
                }

                if (!newBot.socket || newBot.socket.disconnected || !newBot.ready) {
                    throw new Error("Disconnected before bot became ready")
                }

                this.changeBot(newBot as Type)
            } catch (e) {
                this.disconnectBot(newBot)
                newBot = undefined

                if (this.stopped || attempt !== this.connectAttempt) return

                console.error(`Couldn't reconnect ${this.bot.name}!`)
                console.error(e)
                if (!retry) return

                const delay = this.getRetryDelayMs(e)
                if (delay === "fatal") {
                    this.stop()
                    throw createErrorWithCause(
                        `Authorization failed for ${this.bot.name}! No longer trying to reconnect...`,
                        e,
                    )
                }

                const existing = this.timeouts.get("connect")
                if (existing) clearTimeout(existing)
                this.timeouts.set(
                    "connect",
                    setTimeout(() => {
                        this.timeouts.delete("connect")
                        attemptReconnect().catch(console.error)
                    }, delay),
                )
            }
        }

        await attemptReconnect()
    }

    private stopLoop(loopName: LoopName): void {
        // Clear the timeout
        const timeout = this.timeouts.get(loopName)
        if (timeout) clearTimeout(timeout)

        // Delete the loop
        this.loops.delete(loopName)
    }

    public stop(): void {
        this.stopped = true
        this.connectAttempt++
        this.clearPendingConnect("Context stopped")
        for (const [, timeout] of this.timeouts) clearTimeout(timeout)
        this.timeouts.clear()
        this.disconnectBot(this.bot)
    }

    public uptime(): number {
        if (!this.isReady()) return 0
        return Date.now() - this.started.getTime()
    }
}

export type FilterContextsOptions = {
    /** If set, we will only return contexts whose `bot.owner` is equal to this value */
    owner?: string
    /** If set, we will return contexts only on this server */
    serverData?: ServerData
}

export function filterContexts(
    contexts: Strategist<PingCompensatedCharacter>[],
    options: FilterContextsOptions = {},
): Strategist<PingCompensatedCharacter>[] {
    const filteredContexts: Strategist<PingCompensatedCharacter>[] = []
    for (const context of contexts) {
        if (!context.isReady()) continue
        if (options.owner && context.bot.owner !== options.owner) continue // Different owner
        if (
            options.serverData &&
            (context.bot.serverData.region !== options.serverData.region ||
                context.bot.serverData.name !== options.serverData.name)
        )
            continue // Different server
        filteredContexts.push(context)
    }
    return filteredContexts
}
