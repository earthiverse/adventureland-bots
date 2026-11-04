import type { Entity, GetEntitiesFilters, GetEntityFilters, MonsterName, PingCompensatedCharacter } from 'alclient';
import { LRUCache } from 'lru-cache/raw';

import type { Strategy, StrategyLoops } from '@/types/strategy';

export const IGNORED_MONSTERS = new LRUCache<string, true>({
  max: 50,
  ttl: 2500,
});

export interface AttackStrategyOptions {
  type?: MonsterName;
  typeList?: MonsterName[];
  couldDieToProjectiles?: boolean;
  couldGiveCredit?: boolean;
  disableBasicAttack?: boolean;
  reserveMp?: number;
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
      couldDieToProjectiles: this.options.couldDieToProjectiles ?? false,
      couldGiveCredit: this.options.couldGiveCredit ?? true,
      ignoreIDs: [...IGNORED_MONSTERS.keys()],
      type: this.options.type,
      typeList: this.options.typeList,
      willBurnToDeath: this.options.willBurnToDeath,
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
    entities.sort((a, b) => {
      // Prioritize monsters that won't burn to death
      const aWillBurn = a.willBurnToDeath();
      const bWillBurn = b.willBurnToDeath();
      if (aWillBurn && !bWillBurn) return 1;
      if (!aWillBurn && bWillBurn) return -1;

      // Prioritize monsters that aren't guaranteed to die to projectiles
      const aCouldDie = a.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities);
      const bCouldDie = b.couldDieToProjectiles(bot, bot.projectiles, bot.players, bot.entities);
      if (aCouldDie && !bCouldDie) return 1;
      if (!aCouldDie && bCouldDie) return -1;

      // Prioritize monsters with a target
      if (a.target && !b.target) return -1;
      // eslint-disable-next-line unicorn/prefer-ternary
      if (!a.target && b.target) return 1;

      // Prioritize monsters with lower HP
      return a.hp - b.hp;
    });

    return entities;
  }
}
