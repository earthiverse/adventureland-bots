import type { PingCompensatedCharacter } from 'alclient';

import type { Context } from '@/context/context';
import { state } from '@/state/state';
import type { EvaluatedMatch, MatchedSlot, Setup, Setups } from '@/types/setup';
import type { Strategy } from '@/types/strategy';

export interface SetupManagerOptions {
  /**
   * Contexts to manage.
   * Defaults to `state.contexts`.
   */
  contexts?: Context[] | undefined;

  /**
   * Interval in ms between setup evaluations.
   * Defaults to 1000ms.
   */
  intervalMs?: number | undefined;
}

export class SetupManager {
  protected activeStrategies = new Map<Context, Set<Strategy>>();
  protected timeout: NodeJS.Timeout | undefined = undefined;
  protected isRunning = true;

  public constructor(
    public setups: Setups,
    protected options: SetupManagerOptions = {},
  ) {
    this.scheduleNextTick(0);
  }

  // TODO: this needs to be async for future logic
  // eslint-disable-next-line @typescript-eslint/require-await
  public async evaluate(): Promise<void> {
    if (!this.isRunning) return;

    const allContexts = this.options.contexts ?? state.contexts;
    const availableContexts = allContexts.filter((c) => c.bot.ready);
    const assignedContexts = new Set<Context>();

    while (availableContexts.length > 0) {
      let bestMatch: EvaluatedMatch | undefined = undefined;

      for (const setup of this.setups) {
        if (setup.configs.length === 0 || setup.configs.length > availableContexts.length) continue;

        const match = this.findBestMatchForSetup(setup, availableContexts);
        if (!match) continue;

        if (
          !bestMatch ||
          match.priority > bestMatch.priority ||
          (match.priority === bestMatch.priority && match.slots.length > bestMatch.slots.length)
        ) {
          bestMatch = match;
        }
      }

      if (!bestMatch) break;

      for (const { context, config } of bestMatch.slots) {
        this.applyConfigStrategies(context, config.strategies as Strategy[]);
        assignedContexts.add(context);
        const index = availableContexts.indexOf(context);
        if (index !== -1) availableContexts.splice(index, 1);
      }
    }

    // Remove setup strategies from ready contexts that didn't match any setup
    for (const context of this.activeStrategies.keys()) {
      if (!assignedContexts.has(context)) {
        this.clearConfigStrategies(context);
      }
    }
  }

  protected findBestMatchForSetup(setup: Setup, availableContexts: Context[]): EvaluatedMatch | undefined {
    let best: EvaluatedMatch | undefined = undefined;
    const currentSlots: MatchedSlot[] = [];
    const usedContexts = new Set<Context>();

    const search = (configIndex: number): void => {
      if (configIndex === setup.configs.length) {
        const bots: PingCompensatedCharacter[] = currentSlots.map((s) => s.context.bot);
        const priority = typeof setup.priority === 'function' ? setup.priority(bots) : (setup.priority ?? 0);
        if (!best || priority > best.priority) {
          best = { priority, slots: [...currentSlots] };
        }
        return;
      }

      const config = setup.configs[configIndex]!;
      for (const context of availableContexts) {
        if (usedContexts.has(context)) continue;
        if (context.bot.ctype !== config.ctype) continue;
        if (config.require && !config.require(context.bot as never)) continue;

        usedContexts.add(context);
        currentSlots.push({ context, config });
        search(configIndex + 1);
        currentSlots.pop();
        usedContexts.delete(context);

        if (best && typeof setup.priority !== 'function') return;
      }
    };

    search(0);
    return best;
  }

  protected applyConfigStrategies(context: Context, nextStrategies: Strategy[]): void {
    const nextSet = new Set(nextStrategies);
    const prevSet = this.activeStrategies.get(context);

    if (prevSet) {
      for (const strategy of prevSet) {
        if (!nextSet.has(strategy)) context.removeStrategy(strategy);
      }
    }

    for (const strategy of nextSet) context.applyStrategy(strategy);

    this.activeStrategies.set(context, nextSet);
  }

  protected clearConfigStrategies(context: Context): void {
    const prevStrategies = this.activeStrategies.get(context);
    if (!prevStrategies) return;

    for (const strategy of prevStrategies) {
      context.removeStrategy(strategy);
    }
    this.activeStrategies.delete(context);
  }

  protected scheduleNextTick(delayMs: number): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    if (!this.isRunning) return;

    this.timeout = setTimeout(() => {
      this.evaluate()
        .catch((error) => {
          console.error('[SetupManager] Error evaluating setups:', error);
        })
        .finally(() => {
          this.scheduleNextTick(this.options.intervalMs ?? 1000);
        });
    }, delayMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    for (const context of [...this.activeStrategies.keys()]) {
      this.clearConfigStrategies(context);
    }
  }
}
