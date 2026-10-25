import type { Entity, GetEntitiesFilters, GetEntityFilters, MonsterName, PingCompensatedCharacter } from 'alclient';
import { LRUCache } from 'lru-cache/raw';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export const IGNORED_MONSTERS = new LRUCache<string, true>({
  max: 50,
  ttl: 2500,
});

export interface AttackStrategyOptions {
  targetType?: MonsterName;
  couldDieToProjectiles?: boolean;
  couldGiveCredit?: boolean;
  disableBasicAttack?: boolean;
  willBurnToDeath?: boolean;
  willDieToProjectiles?: boolean;
  maxTargets?: number;
}

export class AttackStrategy<
  BotType extends PingCompensatedCharacter,
  Options extends AttackStrategyOptions = AttackStrategyOptions,
> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    attack: {
      fn: (bot) => this.attack(bot),
      getDelay: (bot) => this.getAttackDelay(bot),
    },
  };

  public constructor(protected options: Options = {} as Options) {}

  protected async attack(bot: BotType): Promise<void> {
    await this.tryBasicAttack(bot);
  }

  protected async tryBasicAttack(bot: BotType): Promise<void> {
    if (this.options.disableBasicAttack) return;
    if (!bot.canUse('attack')) return;

    // Target nearest entity
    const target = this.getEntity(bot, {
      canDamage: 'attack',
      returnNearest: true,
      withinRange: 'attack',
    });
    if (!target) return;

    const willDie = bot.canKillInOneShot(target, 'attack');
    if (willDie) IGNORED_MONSTERS.set(target.id, true);
    try {
      await bot.basicAttack(target.id);
    } catch {
      if (willDie) IGNORED_MONSTERS.delete(target.id);
    }
  }

  protected getAttackDelay(bot: BotType): number {
    return Math.max(50, bot.getCooldown('attack'));
  }

  protected getBaseEntityFilters(): GetEntityFilters {
    return {
      couldDieToProjectiles: this.options.couldDieToProjectiles,
      couldGiveCredit: this.options.couldGiveCredit ?? true,
      ignoreIDs: [...IGNORED_MONSTERS.keys()],
      type: this.options.targetType,
      willBurnToDeath: this.options.willBurnToDeath ?? false,
      willDieToProjectiles: this.options.willDieToProjectiles ?? false,
    };
  }

  protected getEntity(bot: BotType, extraFilters: GetEntityFilters = {}): Entity | undefined {
    return bot.getEntity({
      ...this.getBaseEntityFilters(),
      ...extraFilters,
    });
  }

  protected getEntities(bot: BotType, extraFilters: GetEntitiesFilters = {}): Entity[] {
    return bot.getEntities({
      ...this.getBaseEntityFilters(),
      ...extraFilters,
    });
  }
}
