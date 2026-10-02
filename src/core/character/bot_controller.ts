import type { PingCompensatedCharacter } from "alclient"
import { ActionRunner } from "../actions/action_runner.js"
import { EventBus, globalEventBus } from "../events/event_bus.js"
import { TeamBlackboard, globalTeamBlackboard } from "../blackboard/team_blackboard.js"

export interface ReconnectOptions<TBot extends PingCompensatedCharacter = PingCompensatedCharacter> {
    enabled?: boolean
    maxAttempts?: number
    initialDelayMs?: number
    maxDelayMs?: number
    reconnectFn?: () => Promise<TBot>
}

export interface BotControllerOptions<TBot extends PingCompensatedCharacter = PingCompensatedCharacter> {
    eventBus?: EventBus
    blackboard?: TeamBlackboard
    telemetryIntervalMs?: number
    actionIntervalMs?: number
    reconnect?: ReconnectOptions<TBot>
}

export class BotController<TBot extends PingCompensatedCharacter = PingCompensatedCharacter> {
    public bot: TBot
    public readonly runner: ActionRunner<TBot>
    public readonly eventBus: EventBus
    public readonly blackboard: TeamBlackboard

    private telemetryTimer: NodeJS.Timeout | null = null
    private reconnectTimer: NodeJS.Timeout | null = null
    private reconnectAttempts = 0
    private reconnectOptions?: ReconnectOptions<TBot>
    private isRunning = false
    private options: Required<Omit<BotControllerOptions<TBot>, "reconnect">>

    public constructor(bot: TBot, options: BotControllerOptions<TBot> = {}) {
        this.bot = bot
        this.eventBus = options.eventBus ?? globalEventBus
        this.blackboard = options.blackboard ?? globalTeamBlackboard
        this.runner = new ActionRunner<TBot>()
        this.reconnectOptions = options.reconnect
        this.options = {
            eventBus: this.eventBus,
            blackboard: this.blackboard,
            telemetryIntervalMs: options.telemetryIntervalMs ?? 1000,
            actionIntervalMs: options.actionIntervalMs ?? 250,
        }
    }

    /**
     * Configures reconnect backoff behavior.
     */
    public setReconnect(reconnect: ReconnectOptions<TBot>): void {
        this.reconnectOptions = reconnect
    }

    public getReconnectAttempts(): number {
        return this.reconnectAttempts
    }

    /**
     * Starts autonomous operation: registers telemetry heartbeat and starts action runner.
     */
    public start(): void {
        if (this.isRunning) return
        this.isRunning = true

        // Push initial telemetry
        this.syncTelemetry()

        // Setup periodic telemetry heartbeat
        this.telemetryTimer = setInterval(() => {
            this.syncTelemetry()
        }, this.options.telemetryIntervalMs)

        // Start utility action runner
        this.runner.start(
            this.bot,
            {
                blackboard: this.blackboard,
                eventBus: this.eventBus,
            },
            this.options.actionIntervalMs,
        )

        // Listen for socket events
        this.bot.socket.on("disconnect", this.onDisconnect)
    }

    /**
     * Stops autonomous operation, cancels timers, and clears socket listeners.
     */
    public async stop(disconnectSocket = false): Promise<void> {
        this.isRunning = false

        if (this.telemetryTimer) {
            clearInterval(this.telemetryTimer)
            this.telemetryTimer = null
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
        }
        this.reconnectAttempts = 0

        this.runner.stop()
        this.bot.socket.off("disconnect", this.onDisconnect)
        this.blackboard.removeMember(this.bot.name)

        if (disconnectSocket && this.bot.socket.connected) {
            this.bot.disconnect()
        }
    }

    /**
     * Synchronizes current character metrics into the TeamBlackboard and emits alerts.
     */
    public syncTelemetry(): void {
        if (!this.bot.ready) return

        const hp = this.bot.hp ?? 0
        const maxHp = this.bot.max_hp ?? 1
        const mp = this.bot.mp ?? 0
        const maxMp = this.bot.max_mp ?? 1
        const freeSlots = this.bot.esize ?? 0
        const isDead = Boolean(this.bot.rip)

        this.blackboard.updateMemberStatus({
            name: this.bot.name,
            type: this.bot.ctype,
            map: this.bot.map,
            x: Math.round(this.bot.x ?? 0),
            y: Math.round(this.bot.y ?? 0),
            hp,
            maxHp,
            mp,
            maxMp,
            freeInventorySlots: freeSlots,
            gold: this.bot.gold ?? 0,
            isReady: this.bot.ready && this.bot.socket.connected,
            isDead,
            lastUpdated: Date.now(),
        })

        // Alert on critical health (< 25%)
        if (!isDead && hp / maxHp < 0.25) {
            this.eventBus.publish({
                type: "bot:health_critical",
                botName: this.bot.name,
                hp,
                maxHp,
                map: this.bot.map,
            })
        }

        // Alert on full inventory
        if (freeSlots <= 0) {
            this.eventBus.publish({
                type: "bot:inventory_full",
                botName: this.bot.name,
                freeSlots,
            })
        }
    }

    private onDisconnect = (reason: string): void => {
        console.warn(`[BotController] Character ${this.bot.name} disconnected: ${reason}`)
        this.syncTelemetry()

        if (this.isRunning && this.reconnectOptions?.enabled && this.reconnectOptions.reconnectFn) {
            const maxAttempts = this.reconnectOptions.maxAttempts ?? 10
            if (this.reconnectAttempts < maxAttempts) {
                this.reconnectAttempts++
                const initialDelay = this.reconnectOptions.initialDelayMs ?? 2000
                const maxDelay = this.reconnectOptions.maxDelayMs ?? 30000
                const delay = Math.min(maxDelay, initialDelay * Math.pow(2, this.reconnectAttempts - 1))
                console.info(
                    `[BotController] Reconnecting ${this.bot.name} in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})...`,
                )

                this.reconnectTimer = setTimeout(async () => {
                    try {
                        const newBot = await this.reconnectOptions!.reconnectFn!()
                        this.bot = newBot
                        this.reconnectAttempts = 0
                        this.bot.socket.on("disconnect", this.onDisconnect)
                        this.syncTelemetry()
                        console.info(`[BotController] Character ${this.bot.name} successfully reconnected!`)
                    } catch (err) {
                        console.error(`[BotController] Reconnect attempt failed for ${this.bot.name}:`, err)
                        this.onDisconnect("reconnect_failed")
                    }
                }, delay)
            } else {
                console.error(`[BotController] Max reconnect attempts reached for ${this.bot.name}. Giving up.`)
            }
        }
    }

    public isActive(): boolean {
        return this.isRunning
    }
}
