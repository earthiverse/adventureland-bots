import type { BankInfo, PingCompensatedCharacter } from 'alclient';

import type { Context } from '@/context/context';

export class State {
  private static instance: State;
  private contextsMap = new Map<string, Context>();
  private banksMap = new Map<string, BankInfo>();

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
    this.contextsMap.set(context.bot.id, context as unknown as Context);
    return context;
  }

  /**
   * Removes a bot context by character name or Context instance.
   */
  public removeContext(nameOrContext: string | Context): boolean {
    const name = typeof nameOrContext === 'string' ? nameOrContext : nameOrContext.bot.id;
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
    // Check bots first for the freshest bank data
    for (const bot of this.getBotsByOwner(owner)) {
      if (bot.bank) {
        this.updateBank(owner, bot.bank);
        return bot.bank;
      }
    }

    // Fall back to cache
    return this.banksMap.get(owner);
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
