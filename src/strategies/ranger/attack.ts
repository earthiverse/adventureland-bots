import type { Entity, Ranger } from 'alclient';

import { canSafelyTarget, consumeCourageSlot, type CourageBudget, getCourageBudget } from '@/utils/courage';

import { AttackStrategy, type AttackStrategyOptions, IGNORED_MONSTERS } from '../attack';

export interface RangerAttackStrategyOptions extends AttackStrategyOptions {
  disableMultiShot?: boolean;
}

export class RangerAttackStrategy extends AttackStrategy<Ranger, RangerAttackStrategyOptions> {
  protected override async attack(bot: Ranger): Promise<void> {
    const courageBudget = getCourageBudget(bot, this.options.maxTargets);
    await this.tryMultishot(bot, courageBudget);
    await this.tryBasicAttack(bot);
  }

  protected async tryMultishot(bot: Ranger, courageBudget: CourageBudget): Promise<void> {
    if (this.options.disableMultiShot) return;
    if (!bot.canUse('3shot')) return;

    const potentialTargets = this.getEntities(bot, {
      canDamage: '3shot',
      withinRange: '3shot',
    });
    if (potentialTargets.length < 3) return; // Not enough targets

    // Prioritize targets
    potentialTargets.sort((a, b) => {
      if (a.target && !b.target) return -1;
      return !a.target && b.target ? 1 : a.hp - b.hp;
    });

    const neededTargets = bot.canUse('5shot') ? 5 : 3;
    const tempCourageBudget: CourageBudget = { ...courageBudget };
    const targets: Entity[] = [];
    for (const potentialTarget of potentialTargets) {
      if (!canSafelyTarget(tempCourageBudget, potentialTarget)) continue;

      targets.push(potentialTarget);
      consumeCourageSlot(tempCourageBudget, potentialTarget);
      if (targets.length >= neededTargets) break;
    }

    const [t1, t2, t3, t4, t5] = targets;
    if (t1 && t2 && t3 && t4 && t5 && bot.canUse('5shot')) {
      const shotTargets = [t1, t2, t3, t4, t5];
      const dyingTargets = shotTargets.filter((t) => bot.canKillInOneShot(t, '5shot'));
      for (const t of dyingTargets) IGNORED_MONSTERS.set(t.id, true);

      try {
        await bot.fiveShot(t1.id, t2.id, t3.id, t4.id, t5.id);
        consumeCourageSlot(courageBudget, t1);
        consumeCourageSlot(courageBudget, t2);
        consumeCourageSlot(courageBudget, t3);
        consumeCourageSlot(courageBudget, t4);
        consumeCourageSlot(courageBudget, t5);
      } catch {
        for (const t of dyingTargets) IGNORED_MONSTERS.delete(t.id);
      }
    } else if (t1 && t2 && t3 && bot.canUse('3shot')) {
      const shotTargets = [t1, t2, t3];
      const dyingTargets = shotTargets.filter((t) => bot.canKillInOneShot(t, '5shot'));
      for (const t of dyingTargets) IGNORED_MONSTERS.set(t.id, true);

      try {
        await bot.threeShot(t1.id, t2.id, t3.id);
        consumeCourageSlot(courageBudget, t1);
        consumeCourageSlot(courageBudget, t2);
        consumeCourageSlot(courageBudget, t3);
      } catch {
        for (const t of dyingTargets) IGNORED_MONSTERS.delete(t.id);
      }
    }
  }
}
