import type { Entity, GetEntitiesFilters, GetEntityFilters, MonsterName, PingCompensatedCharacter } from 'alclient';
import { LRUCache } from 'lru-cache/raw';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import type { TargetPrioritizer } from '@/types/targeting';
import { defaultPrioritization } from '@/utils/targeting';

export const IGNORED_MONSTERS = new LRUCache<string, true>({
  max: 50,
  ttl: 2500,
});

export interface AttackStrategyOptions {
  type?: MonsterName;
  typeList?: MonsterName[];
  couldBurnToDeath?: boolean;
  couldDieToProjectiles?: boolean;
  couldGiveCredit?: boolean;
  disableBasicAttack?: boolean;
  reserveMp?: number;
  willBurnToDeath?: boolean;
  willDieToProjectiles?: boolean;
  maxTargets?: number;
  prioritization?: TargetPrioritizer | undefined;
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

    // Target best entity
    const target = this.getEntity(bot, {
      canDamage: 'attack',
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
      couldBurnToDeath: this.options.couldBurnToDeath ?? false,
      couldDieToProjectiles: this.options.couldDieToProjectiles ?? false,
      couldGiveCredit: this.options.couldGiveCredit ?? true,
      ignoreIDs: [...IGNORED_MONSTERS.keys()],
      type: this.options.type,
      typeList: this.options.typeList,
      willBurnToDeath: this.options.willBurnToDeath ?? false,
      willDieToProjectiles: this.options.willDieToProjectiles ?? false,
    };
  }

  protected getEntity(bot: BotType, extraFilters: GetEntitiesFilters = {}): Entity | undefined {
    return this.getEntities(bot, extraFilters)[0];
  }

  protected getEntities(bot: BotType, extraFilters: GetEntitiesFilters = {}): Entity[] {
    const entities = bot.getEntities({
      ...this.getBaseEntityFilters(),
      ...extraFilters,
    });

    // Prioritize targets
      const prioritizer = this.options.prioritization ?? defaultPrioritization;
      entities.sort(prioritizer(bot));

    return entities;
  }
}
