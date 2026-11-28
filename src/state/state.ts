import type { BankInfo, PingCompensatedCharacter } from 'alclient';

import type { Context } from '@/context/context';
import { StateStrategy } from '@/strategies/state';

export class State {
  private static instance: State;
  private contextsMap = new Map<string, Context>();
  private banksMap = new Map<string, BankInfo>();
  private readonly stateStrategy = new StateStrategy(this);

  public constructor() {}

  /**
   * Returns the singleton instance of State.
   */
  public static getInstance(): State {
    if (!State.instance) {
      State.instance = new State();
    }
    return State.instance;
  }

  /**
   * Adds and registers a bot context to the state.
   */
  public addContext<BotType extends PingCompensatedCharacter>(context: Context<BotType>): Context<BotType> {
    const existing = this.contextsMap.get(context.bot.id);
    if (existing && existing !== (context as unknown as Context)) {
      // Detach state listeners from the replaced context
      existing.removeStrategy(this.stateStrategy);
    }

    this.contextsMap.set(context.bot.id, context as unknown as Context);
    context.applyStrategy(this.stateStrategy);
    return context;
  }

  /**
   * Removes a bot context by character name or Context instance.
   */
  public removeContext(nameOrContext: string | Context): boolean {
    const name = typeof nameOrContext === 'string' ? nameOrContext : nameOrContext.bot.id;
    const context = this.contextsMap.get(name);
    if (!context) return false;

    context.removeStrategy(this.stateStrategy);
    return this.contextsMap.delete(name);
  }

  /**
   * Returns a bot context by character name or Character instance.
   */
  public getContext(nameOrBot: string | PingCompensatedCharacter): Context | undefined {
    const name = typeof nameOrBot === 'string' ? nameOrBot : nameOrBot.id;
    return this.contextsMap.get(name);
  }

  /**
   * Returns all registered contexts.
   */
  public get contexts(): Context[] {
    return Array.from(this.contextsMap.values());
  }

  /**
   * Returns all bots from registered contexts.
   */
  public get bots(): PingCompensatedCharacter[] {
    return this.contexts.map((c) => c.bot);
  }

  /**
   * Returns all bots from registered contexts that belong to the specified owner
   */
  public getBotsByOwner(id: string): PingCompensatedCharacter[] {
    return this.bots.filter((c) => c.owner === id);
  }

  /**
   * Returns all bots from registered contexts that belong to the specified party
   */
  public getBotsByParty(id: string): PingCompensatedCharacter[] {
    return this.bots.filter((c) => c.party === id);
  }

  /**
   * Returns the cached bank snapshot for an owner if available.
   */
  public getBank(owner: string): BankInfo | undefined {
    // Prefer the socket-updated cache because alclient keeps stale bot.bank after leaving the bank
    const cached = this.banksMap.get(owner);
    if (cached) return cached;

    // Fall back to any registered bot that already holds bank data
    for (const bot of this.getBotsByOwner(owner)) {
      if (bot.bank) {
        this.updateBank(owner, bot.bank);
        return bot.bank;
      }
    }

    return undefined;
  }

  /**
   * Updates the cached bank snapshot for an owner.
   */
  public updateBank(owner: string, bank: BankInfo): void {
    this.banksMap.set(owner, bank);
  }

  /**
   * Stops all registered bot context loop runners and clears the state.
   */
  public stopAll(): void {
    for (const context of this.contexts) {
      context.stop();
    }
    this.contextsMap.clear();
  }
}

/**
 * Global State singleton instance.
 */
export const state = State.getInstance();
