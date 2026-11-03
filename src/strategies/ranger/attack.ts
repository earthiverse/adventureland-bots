import type { Entity, Ranger } from 'alclient';

import { canSafelyTarget, consumeCourageSlot, type CourageBudget, getCourageBudget } from '@/utils/courage';
import { noop } from '@/utils/noop';

import { AttackStrategy, type AttackStrategyOptions, IGNORED_MONSTERS } from '../attack';

export interface RangerAttackStrategyOptions extends AttackStrategyOptions {
  disableMultiShot?: boolean;
  disableSuperShot?: boolean;
}

export class RangerAttackStrategy extends AttackStrategy<Ranger, RangerAttackStrategyOptions> {
  protected override async attack(bot: Ranger): Promise<void> {
    const courageBudget = getCourageBudget(bot, this.options.maxTargets);
    let attacked = this.trySuperShot(bot, courageBudget);
    if (!attacked) attacked = this.tryMultishot(bot, courageBudget);
    if (!attacked) await this.tryBasicAttack(bot);
  }

  protected tryMultishot(bot: Ranger, courageBudget: CourageBudget): boolean {
    if (this.options.disableMultiShot) return false;
    if (!bot.canUse('3shot')) return false;
    if (bot.mp < bot.G.skills['3shot'].mp_cost! + (this.options.reserveMp ?? 0)) return false;

    const potentialTargets = this.getEntities(bot, {
      canDamage: '3shot',
      withinRange: '3shot',
    });
    if (potentialTargets.length < 3) return false; // Not enough targets

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

      void bot.fiveShot(t1.id, t2.id, t3.id, t4.id, t5.id).catch(() => {
        for (const t of dyingTargets) IGNORED_MONSTERS.delete(t.id);
      });
      consumeCourageSlot(courageBudget, t1);
      consumeCourageSlot(courageBudget, t2);
      consumeCourageSlot(courageBudget, t3);
      consumeCourageSlot(courageBudget, t4);
      consumeCourageSlot(courageBudget, t5);
      return true;
    } else if (t1 && t2 && t3) {
      const shotTargets = [t1, t2, t3];
      const dyingTargets = shotTargets.filter((t) => bot.canKillInOneShot(t, '3shot'));
      for (const t of dyingTargets) IGNORED_MONSTERS.set(t.id, true);

      void bot.threeShot(t1.id, t2.id, t3.id).catch(() => {
        for (const t of dyingTargets) IGNORED_MONSTERS.delete(t.id);
      });
      consumeCourageSlot(courageBudget, t1);
      consumeCourageSlot(courageBudget, t2);
      consumeCourageSlot(courageBudget, t3);
      return true;
    }

    return false;
  }

  protected trySuperShot(bot: Ranger, courageBudget: CourageBudget): boolean {
    if (this.options.disableSuperShot) return false;
    if (!bot.canUse('supershot')) return false;
    if (bot.mp < bot.G.skills.supershot.mp_cost! + (this.options.reserveMp ?? 0)) return false;

    const target = this.getEntity(bot, { canDamage: 'supershot', withinRange: 'supershot' });
    if (!target) return false; // No target

    void bot.superShot(target.id).catch(noop);
    consumeCourageSlot(courageBudget, target);
    return true;
  }
}
