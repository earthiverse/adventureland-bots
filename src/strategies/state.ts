import type { CharacterData, PingCompensatedCharacter } from 'alclient';

import type { State } from '@/state/state';
import type { Strategy } from '@/types/strategy';

/**
 * Passive strategy that updates State from socket events.
 */
export class StateStrategy<
  BotType extends PingCompensatedCharacter = PingCompensatedCharacter,
> implements Strategy<BotType> {
  protected readonly onPlayerListeners = new Map<string, (data: CharacterData) => void>();

  public constructor(protected readonly targetState: State) {}

  public onApply(bot: BotType): void {
    // Seed bank cache if the bot connected already inside the bank
    if (bot.bank && bot.owner) {
      this.targetState.updateBank(bot.owner, bot.bank);
    }

    // Keep bank snapshot fresh whenever player updates include bank data
    const onPlayer = (data: CharacterData): void => {
      if (!data.user) return; // Not in the bank
      // Prefer bot.owner because packets can omit owner; prefer bot.bank for alclient's normalized pack lengths
      const owner = bot.owner || data.owner;
      if (!owner) return;
      this.targetState.updateBank(owner, bot.bank ?? data.user);
    };
    bot.socket.on('player', onPlayer);
    this.onPlayerListeners.set(bot.id, onPlayer);
  }

  public onRemove(bot: BotType): void {
    const onPlayer = this.onPlayerListeners.get(bot.id);
    if (onPlayer) bot.socket.off('player', onPlayer);
    this.onPlayerListeners.delete(bot.id);
  }
}
