import AL, { type PingCompensatedCharacter, type ServerIdentifier, type ServerRegion } from 'alclient';
import { sleep } from 'bun';

import type { BusyReason } from '@/types/context';
import type { LoopDefinition, LoopName } from '@/types/loops';
import type { Strategy } from '@/types/strategy';
import { getReconnectDelayMs, isFatalReconnectError } from '@/utils/errors';

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
  private busyReasons = new Set<BusyReason>();
  private disconnectListener: (() => void) | undefined;

  public constructor(
    public bot: BotType,
    public serverRegion: ServerRegion,
    public serverIdentifier: ServerIdentifier,
  ) {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    const currentBot = this.bot;
    const listener = (): void => {
      if (this.bot !== currentBot || !this.canRunLoops()) return; // Stale, stopped, or reconnecting
      console.warn(`[Context] ${this.bot.id} disconnected. Attempting auto-reconnect...`);
      void this.reconnect().catch(console.error);
    };
    this.disconnectListener = listener;
    currentBot.socket.on('disconnect', listener);
  }

  private disconnectCurrentBot(): void {
    if (this.disconnectListener) {
      this.bot.socket?.off('disconnect', this.disconnectListener);
      this.disconnectListener = undefined;
    }
    try {
      this.bot.disconnect();
    } catch {
      // May already be disconnected
    }
  }

  public async reconnect(): Promise<void> {
    if (!this.canRunLoops()) return; // Stopped or already reconnecting
    this.isSwitchingOrReconnecting = true;

    try {
      // Pause loop ticks
      for (const name of this.activeTimeouts.keys()) this.stopLoop(name);

      // Call remove on strategies
      for (const strategy of this.strategies) {
        if (strategy.onRemove) strategy.onRemove(this.bot);
      }

      this.busyReasons.clear();
      this.disconnectCurrentBot();

      // Retry loop
      while (this.isRunning) {
        if (await this.tryReconnectOnce()) return;
      }
    } finally {
      this.isSwitchingOrReconnecting = false;
    }
  }

  private async tryReconnectOnce(): Promise<boolean> {
    try {
      console.log(`[Context] Connecting ${this.bot.id} to ${this.serverRegion} ${this.serverIdentifier}...`);
      const newBot = (await AL.Game.startCharacter(this.bot.id, this.serverRegion, this.serverIdentifier)) as BotType;
      if (!this.isRunning) {
        // Stopped while startCharacter was in flight; disconnect the newly opened socket
        try {
          newBot.disconnect();
        } catch {
          // Suppress disconnection errors
        }
        return true;
      }

      this.bot = newBot;
      this.setupSocketListeners();

      // Reapply strategies
      for (const strategy of this.strategies) {
        if (strategy.onApply) strategy.onApply(this.bot);
      }

      // Clear reconnecting flag before resuming loops so scheduleNextTick accepts them
      this.isSwitchingOrReconnecting = false;

      // Resume loops
      for (const name of this.loopRegistrations.keys()) {
        this.scheduleNextTick(name, 0);
      }

      console.log(`[Context] ${this.bot.id} successfully connected to ${this.serverRegion} ${this.serverIdentifier}.`);
      return true;
    } catch (error) {
      if (!this.isRunning) return true;

      if (isFatalReconnectError(error)) {
        console.error(`[Context] Authorization failed for ${this.bot.id}; stopping reconnect retries.`, error);
        this.stop();
        return true;
      }

      const delay = getReconnectDelayMs(error);
      console.error(`[Context] Connection failed for ${this.bot.id}, retrying in ${delay}ms...`, error);
      await sleep(delay);
      return false;
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

  public addBusy(reason: BusyReason): void {
    this.busyReasons.add(reason);
  }

  public removeBusy(reason: BusyReason): void {
    this.busyReasons.delete(reason);
  }

  public isBusyWith(reason: BusyReason): boolean {
    return this.busyReasons.has(reason);
  }

  public get isBusy(): boolean {
    return this.busyReasons.size > 0;
  }

  public get shouldFarm(): boolean {
    return !this.isBusy;
  }

  /**
   * Applies a strategy
   */
  public applyStrategy(strategy: Strategy<BotType>): void {
    if (this.strategies.has(strategy)) return;
    this.strategies.add(strategy);

    if (strategy.onApply) strategy.onApply(this.bot);

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
  public removeStrategy(strategy: Strategy<BotType>): void {
    if (!this.strategies.has(strategy)) return;
    this.strategies.delete(strategy);

    if (strategy.onRemove) strategy.onRemove(this.bot);

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

  private canRunLoops(): boolean {
    return this.isRunning && !this.isSwitchingOrReconnecting;
  }

  /**
   * Executes a loop tick: runs all registered strategy handlers sequentially in order,
   * then computes the dynamic delay via Math.min across all handlers.
   */
  private async runLoopTick(name: LoopName): Promise<void> {
    if (!this.canRunLoops()) return;

    const entries = this.loopRegistrations.get(name);
    if (!entries || entries.length === 0) {
      this.stopLoop(name);
      return;
    }

    // Only run if bot is ready/connected
    const executedEntries = this.bot.ready ? await this.executeLoopEntries(name, entries) : [];
    if (!this.canRunLoops()) return;

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

  /**
   * Runs registered loop entries in priority order until one returns `false` or loops pause,
   * returning the entries that ran so the next tick delay is computed only from active handlers.
   */
  private async executeLoopEntries(
    name: LoopName,
    entries: RegisteredLoopEntry<BotType>[],
  ): Promise<RegisteredLoopEntry<BotType>[]> {
    const executedEntries: RegisteredLoopEntry<BotType>[] = [];
    for (const entry of entries) {
      if (!this.canRunLoops()) return executedEntries;
      if (!this.strategies.has(entry.strategy)) continue;
      executedEntries.push(entry);
      try {
        const shouldContinue = await entry.definition.fn(this.bot);
        if (!this.canRunLoops()) return executedEntries; // Reconnect or stop started while awaiting
        if (shouldContinue === false) break; // Stop executing lower priority handlers
      } catch (error) {
        console.error(`[Context] Error executing ${name} loop in strategy ${entry.strategy.constructor.name}:`, error);
      }
    }
    return executedEntries;
  }

  private scheduleNextTick(name: LoopName, delayMs: number): void {
    this.stopLoop(name);
    if (!this.canRunLoops()) return;

    const timeout = setTimeout(() => {
      void this.runLoopTick(name).catch(console.error);
    }, delayMs);

    this.activeTimeouts.set(name, timeout);
  }

  private stopLoop(name: LoopName): void {
    const timeout = this.activeTimeouts.get(name);
    if (!timeout) {
      return;
    }

    clearTimeout(timeout);
    this.activeTimeouts.delete(name);
  }

  public stop(): void {
    if (!this.isRunning) return; // Already stopped
    this.isRunning = false;
    for (const name of this.activeTimeouts.keys()) {
      this.stopLoop(name);
    }
    if (!this.isSwitchingOrReconnecting) {
      // Skip if reconnect() already ran onRemove before disconnecting the old bot
      for (const strategy of this.strategies) {
        if (strategy.onRemove) strategy.onRemove(this.bot);
      }
    }
    this.busyReasons.clear();
    this.disconnectCurrentBot();
  }
}
