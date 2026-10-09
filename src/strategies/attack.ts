import { type MonsterName, type PingCompensatedCharacter } from 'alclient';
import { LRUCache } from 'lru-cache/raw';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export const IGNORED_MONSTERS = new LRUCache<string, true>({
  max: 50,
  ttl: 2_500,
});

export interface AttackStrategyOptions {
  targetType?: MonsterName;
  couldDieToProjectiles?: boolean;
  couldGiveCredit?: boolean;
  willBurnToDeath?: boolean;
  willDieToProjectiles?: boolean;
}

export class AttackStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    attack: {
      fn: (bot) => this.attack(bot),
      getDelay: (bot) => this.getAttackDelay(bot),
    },
  };

  public constructor(protected options: AttackStrategyOptions = {}) {}

  protected async attack(bot: BotType): Promise<void> {
    if (!bot.canUse('attack')) return;

    // Target nearest entity
    const target = bot.getEntity({
      couldDieToProjectiles: this.options.couldDieToProjectiles ?? undefined,
      couldGiveCredit: this.options.couldGiveCredit ?? true,
      ignoreIDs: [...IGNORED_MONSTERS.keys()],
      returnNearest: true,
      type: this.options.targetType,
      willBurnToDeath: this.options.willBurnToDeath ?? false,
      willDieToProjectiles: this.options.willDieToProjectiles ?? false,
      withinRange: 'attack',
    });
    if (!target) return;

    const willDie = bot.canKillInOneShot(target, 'attack');
    if (willDie) IGNORED_MONSTERS.set(target.id, true);
    await bot.basicAttack(target.id).catch(() => {
      if (willDie) IGNORED_MONSTERS.delete(target.id);
    });
  }

  protected getAttackDelay(bot: BotType): number {
    return Math.max(50, bot.getCooldown('attack'));
  }
}
