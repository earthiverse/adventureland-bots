import type { DamageType, Entity, PingCompensatedCharacter } from 'alclient';

export type MonsterDamageType = Exclude<DamageType, 'heal' | 'none'>;

export interface CourageBudget {
  physical: number;
  magical: number;
  pure: number;
  total: number;
}

export function getCourageBudget(bot: PingCompensatedCharacter, maxTargets = Infinity): CourageBudget {
  const current = bot.calculateTargets();
  return {
    magical: Math.max(0, bot.mcourage - current.magical),
    physical: Math.max(0, bot.courage - current.physical),
    pure: Math.max(0, bot.pcourage - current.pure),
    total: Math.max(0, maxTargets - bot.targets),
  };
}

export function canSafelyTarget(budget: CourageBudget, entity: Entity): boolean {
  if (entity.target) return true;
  if (budget.total <= 0) return false;
  const type = entity.damage_type as MonsterDamageType;
  return budget[type] > 0;
}

export function consumeCourageSlot(budget: CourageBudget, entity: Entity): void {
  if (entity.target) return;
  budget.total = Math.max(0, budget.total - 1);
  const type = entity.damage_type as MonsterDamageType;
  budget[type] = Math.max(0, budget[type] - 1);
}
