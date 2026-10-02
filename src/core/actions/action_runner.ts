import type { Action, ActionContext } from "./action.js"

export interface ActionRunnerOptions {
    /** Minimum score required to execute an action (default: 0) */
    minScore?: number
    /** Whether to log selected action executions */
    debug?: boolean
}

export class ActionRunner<TBot = any> {
    private actions: Action<TBot>[] = []
    private intervalId: NodeJS.Timeout | null = null
    private isTicking = false
    private abortController: AbortController | null = null
    private options: Required<ActionRunnerOptions>

    public constructor(options: ActionRunnerOptions = {}) {
        this.options = {
            minScore: options.minScore ?? 0,
            debug: options.debug ?? false,
        }
    }

    public register(action: Action<TBot>): this {
        this.actions.push(action)
        return this
    }

    public registerAll(actions: Action<TBot>[]): this {
        for (const action of actions) {
            this.register(action)
        }
        return this
    }

    public getActions(): readonly Action<TBot>[] {
        return this.actions
    }

    public clearActions(): void {
        this.actions = []
    }

    /**
     * Executes a single evaluation and dispatch tick.
     * Evaluates all candidates and executes the highest-scoring action.
     */
    public async tick(bot: TBot, context: ActionContext): Promise<string | null> {
        if (this.isTicking) return null
        this.isTicking = true

        try {
            let bestAction: Action<TBot> | null = null
            let highestScore = this.options.minScore

            for (const action of this.actions) {
                try {
                    if (!action.canExecute(bot, context)) continue
                    const score = action.score(bot, context)
                    if (score > highestScore) {
                        highestScore = score
                        bestAction = action
                    }
                } catch (err) {
                    console.error(`[ActionRunner] Error scoring action '${action.name}':`, err)
                }
            }

            if (bestAction && highestScore > this.options.minScore) {
                if (this.options.debug) {
                    console.log(`[ActionRunner] Executing '${bestAction.name}' (score: ${highestScore.toFixed(1)})`)
                }
                await bestAction.execute(bot, context)
                return bestAction.name
            }

            return null
        } finally {
            this.isTicking = false
        }
    }

    /**
     * Starts continuous background evaluation at the specified interval.
     */
    public start(bot: TBot, context: ActionContext, intervalMs = 250): void {
        this.stop()
        this.abortController = new AbortController()
        const scopedContext: ActionContext = {
            ...context,
            signal: this.abortController.signal,
        }

        this.intervalId = setInterval(() => {
            if (this.abortController?.signal.aborted) {
                this.stop()
                return
            }
            this.tick(bot, scopedContext).catch((err) => {
                console.error("[ActionRunner] Unhandled error during tick:", err)
            })
        }, intervalMs)
    }

    /**
     * Stops continuous evaluation.
     */
    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
        if (this.abortController) {
            this.abortController.abort()
            this.abortController = null
        }
        this.isTicking = false
    }

    public isRunning(): boolean {
        return this.intervalId !== null
    }
}
