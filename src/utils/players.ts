import type { PingCompensatedCharacter, Player, ServerIdentifier, ServerRegion } from 'alclient';

import type { Context } from '@/context/context';
import { state } from '@/state/state';

export interface GetVisiblePlayersOptions {
  /**
   * Bots to check visibility
   */
  bots?: PingCompensatedCharacter[];

  /**
   * Contexts to check visibility
   */
  contexts?: Context[];

  /**
   * If set, we will filter players by the appropriate .rip
   */
  isDead?: boolean;

  /**
   * If set, we will filter players by whether they are missing HP
   */
  isMissingHp?: boolean;

  /**
   * If set, we will only include players in the given party
   */
  party?: string;

  /**
   * If set, we will only include players if they're on a server with the same identifier
   */
  serverIdentifier?: ServerIdentifier;

  /**
   * If set, we will only include players if they're on a server in the same region
   */
  serverRegion?: ServerRegion;
}

/**
 * Returns a list of players (including our own) visible across the specified bots or contexts
 */
export function getVisiblePlayers(options?: GetVisiblePlayersOptions): (PingCompensatedCharacter | Player)[] {
  let inputBots = [...(options?.bots ?? []), ...(options?.contexts?.map((c) => c.bot) ?? [])];
  if (!inputBots.length) inputBots.push(...state.bots); // Use state if options are empty

  if (options?.serverIdentifier !== undefined) {
    inputBots = inputBots.filter((c) => c.serverData.name === options.serverIdentifier);
  }
  if (options?.serverRegion !== undefined) {
    inputBots = inputBots.filter((c) => c.serverData.region === options.serverRegion);
  }

  const controlledById = new Map(state.bots.map((b) => [b.id, b]));
  const visible = new Map<string, PingCompensatedCharacter | Player>();

  // Input bots first, so they win over any Player view of themselves
  for (const bot of inputBots) visible.set(bot.id, bot);

  // Then everything they can see, preferring the controlled instance
  for (const bot of inputBots) {
    for (const player of bot.players.values()) {
      if (visible.has(player.id)) continue;
      visible.set(player.id, controlledById.get(player.id) ?? player);
    }
  }

  const results: (PingCompensatedCharacter | Player)[] = [];
  for (const c of visible.values()) {
    if (options?.party !== undefined && options.party !== c.party) continue;
    if (options?.isDead !== undefined && options.isDead !== Boolean(c.rip)) continue;
    if (options?.isMissingHp !== undefined && options.isMissingHp !== c.hp < c.max_hp) continue;
    results.push(c);
  }
  return results;
}
