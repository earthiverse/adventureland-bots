import AL, { type PingCompensatedCharacter, type ServerIdentifier, type ServerRegion } from 'alclient';
import { sleep } from 'bun';

import type { LoopDefinition, LoopName } from '@/types/loops';
import type { Strategy } from '@/types/strategy';

interface RegisteredLoopEntry<BotType extends PingCompensatedCharacter> {
  strategy: Strategy<BotType>;
  definition: LoopDefinition<BotType>;
}

export class Context<BotType extends PingCompensatedCharacter = PingCompensatedCharacter> {
  private strategies = new Set<Strategy<BotType>>();
  private loopRegistrations = new Map<LoopName, RegisteredLoopEntry<BotType>[]>();
  private activeTimeouts = new Map<LoopName, NodeJS.Timeout>();
  private isRunning = true;
  private isSwitchingOrReconnecting = false;

  public constructor(
    public bot: BotType,
    public serverRegion: ServerRegion,
    public serverIdentifier: ServerIdentifier,
  ) {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    this.bot.socket.on('disconnect', () => {
      if (this.isSwitchingOrReconnecting) return; // We're already handling it
      console.warn(`[Context] ${this.bot.id} disconnected. Attempting auto-reconnect...`);
      this.reconnect().catch(console.error);
    });
  }

  public async reconnect(): Promise<void> {
    if (this.isSwitchingOrReconnecting) return; // We're already handling it
    this.isSwitchingOrReconnecting = true;

    // Pause loop ticks
    for (const name of this.activeTimeouts.keys()) this.stopLoop(name);

    // Call remove on strategies
    for (const strategy of this.strategies) {
      if (strategy.onRemove) await strategy.onRemove(this.bot);
    }

    // Disconnect
    try {
      this.bot.disconnect();
    } catch {
      // May already be disconnected
    }

    // Retry loop
    while (this.isRunning) {
      try {
        console.log(`[Context] Connecting ${this.bot.id} to ${this.serverRegion} ${this.serverIdentifier}...`);
        const newBot = (await AL.Game.startCharacter(this.bot.id, this.serverRegion, this.serverIdentifier)) as BotType;
        this.bot = newBot;
        this.setupSocketListeners();

        // Reapply strategies
        for (const strategy of this.strategies) {
          if (strategy.onApply) await strategy.onApply(this.bot);
        }

        // Resume loops
        for (const name of this.loopRegistrations.keys()) {
          this.scheduleNextTick(name, 0);
        }

        this.isSwitchingOrReconnecting = false;
        console.log(
          `[Context] ${this.bot.id} successfully connected to ${this.serverRegion} ${this.serverIdentifier}.`,
        );
        return;
      } catch (error) {
        console.error(`[Context] Connection failed for ${this.bot.id}, retrying in 5s...`, error);
        await sleep(5000);
      }
    }
  }

  public async changeServer(serverRegion: ServerRegion, serverIdentifier: ServerIdentifier): Promise<void> {
    if (this.serverRegion === serverRegion && this.serverIdentifier === serverIdentifier) {
      console.log(`[Context] ${this.bot.id} is already on ${serverRegion} ${serverIdentifier}.`);
      return;
    }

    console.log(
      `[Context] Switching ${this.bot.id} from ${this.serverRegion} ${this.serverIdentifier} to ${serverRegion} ${serverIdentifier}...`,
    );
    this.serverRegion = serverRegion;
    this.serverIdentifier = serverIdentifier;
    await this.reconnect();
  }

  /**
   * Applies a strategy
   */
  public async applyStrategy(strategy: Strategy<BotType>): Promise<void> {
    if (this.strategies.has(strategy)) return;
    this.strategies.add(strategy);

    if (strategy.onApply) await strategy.onApply(this.bot);

    if (!strategy.loops) return; // No loops

    for (const [name, definition] of Object.entries(strategy.loops) as [LoopName, LoopDefinition<BotType>][]) {
      if (!definition) continue;

      let entries = this.loopRegistrations.get(name);
      if (!entries) {
        entries = [];
        this.loopRegistrations.set(name, entries);
      }

      entries.push({ strategy, definition });

      // Sort entries by strategy priority descending (default 0)
      entries.sort((a, b) => (b.strategy.priority ?? 0) - (a.strategy.priority ?? 0));

      // Start the loop runner if not already ticking
      if (!this.activeTimeouts.has(name)) this.scheduleNextTick(name, 0);
    }
  }

  /**
   * Removes a strategy
   */
  public async removeStrategy(strategy: Strategy<BotType>): Promise<void> {
    if (!this.strategies.has(strategy)) return;
    this.strategies.delete(strategy);

    if (strategy.onRemove) await strategy.onRemove(this.bot);

    if (!strategy.loops) return; // No loops

    for (const name of Object.keys(strategy.loops) as LoopName[]) {
      const entries = this.loopRegistrations.get(name);
      if (!entries) continue;

      const filtered = entries.filter((e) => e.strategy !== strategy);
      if (filtered.length === 0) {
        this.loopRegistrations.delete(name);
        this.stopLoop(name);
      } else {
        this.loopRegistrations.set(name, filtered);
      }
    }
  }

  /**
   * Executes a loop tick: runs all registered strategy handlers sequentially in order,
   * then computes the dynamic delay via Math.min across all handlers.
   */
  private async runLoopTick(name: LoopName): Promise<void> {
    if (!this.isRunning) return;

    const entries = this.loopRegistrations.get(name);
    if (!entries || entries.length === 0) {
      this.stopLoop(name);
      return;
    }

    // Only run if bot is ready/connected
    const executedEntries: RegisteredLoopEntry<BotType>[] = [];
    if (this.bot.ready) {
      for (const entry of [...entries]) {
        if (!this.strategies.has(entry.strategy)) continue;
        executedEntries.push(entry);
        try {
          const shouldContinue = await entry.definition.fn(this.bot);
          if (shouldContinue === false) break; // Stop executing lower priority handlers
        } catch (error) {
          console.error(
            `[Context] Error executing ${name} loop in strategy ${entry.strategy.constructor.name}:`,
            error,
          );
        }
      }
    }

    // Dynamic delay calculation: minimum delay requested among all active handlers
    const activeEntries = executedEntries.length > 0 ? executedEntries : this.loopRegistrations.get(name);
    if (!activeEntries || activeEntries.length === 0) {
      this.stopLoop(name);
      return;
    }

    const delays = activeEntries.map((e) => Math.max(10, e.definition.getDelay(this.bot)));
    const nextDelay = Math.min(...delays);

    this.scheduleNextTick(name, nextDelay);
  }

  private scheduleNextTick(name: LoopName, delayMs: number): void {
    this.stopLoop(name);
    if (!this.isRunning) return;

    const timeout = setTimeout(() => {
      this.runLoopTick(name).catch(console.error);
    }, delayMs);

    this.activeTimeouts.set(name, timeout);
  }

  private stopLoop(name: LoopName): void {
    const timeout = this.activeTimeouts.get(name);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(name);
    }
  }

  public stop(): void {
    this.isRunning = false;
    for (const name of this.activeTimeouts.keys()) {
      this.stopLoop(name);
    }
    for (const strategy of this.strategies) {
      if (strategy.onRemove) strategy.onRemove(this.bot).catch(console.error);
    }
    try {
      this.bot.disconnect();
    } catch {
      // Suppress disconnection errors
    }
  }
}
