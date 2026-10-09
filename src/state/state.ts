import type { CharacterType, PingCompensatedCharacter } from 'alclient';

import type { Context } from '@/context/context';

export class State {
  private static instance: State;
  private contextsMap = new Map<string, Context>();

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
   * Retrieves all contexts of a specific character type.
   */
  public getContextsByType(type: CharacterType): Context[] {
    return this.contexts.filter((c) => c.bot.ctype === type);
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
