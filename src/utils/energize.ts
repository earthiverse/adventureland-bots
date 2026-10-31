import { Mage, type PingCompensatedCharacter, Tools } from 'alclient';

import { DEFAULT_RESERVE_MP } from '@/config/defaults';
import { state } from '@/state/state';

import { noop } from './noop';

// TODO: Consider option for mp recovery or attack buff

export function getEnergizeFromNearbyBot(bot: PingCompensatedCharacter, requestedMp: number | 'auto'): void {
  let bestMage: Mage | undefined;
  let bestEnergizeMp: number = 0;

  for (const other of state.getBotsByOwner(bot.owner)) {
    if (!other.ready) continue;
    if (other.rip) continue;
    if (other.server.region !== bot.server.region) continue;
    if (other.server.name !== bot.server.name) continue;
    if (!(other instanceof Mage)) continue; // Only mages can energize
    if (!other.canUse('energize')) continue;
    if (other.mp <= DEFAULT_RESERVE_MP) continue; // Not enough MP
    if (Tools.distance(bot, other) > bot.G.skills.energize.range!) continue; // Too far away

    let energizeMp = requestedMp;
    energizeMp =
      energizeMp === 'auto'
        ? Math.max(1, Math.min(other.mp - DEFAULT_RESERVE_MP, bot.max_mp - bot.mp))
        : Math.min(other.mp - DEFAULT_RESERVE_MP, energizeMp);

    if (energizeMp <= bestEnergizeMp) continue; // Another mage can energize more MP
    bestMage = other;
    bestEnergizeMp = energizeMp;
  }

  if (bestMage) void bestMage.energize(bot.id, bestEnergizeMp).catch(noop);
}
