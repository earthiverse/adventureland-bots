import type { Entity, Ranger } from 'alclient';

import { canSafelyTarget, consumeCourageSlot, type CourageBudget, getCourageBudget } from '@/utils/courage';

import { AttackStrategy, type AttackStrategyOptions, IGNORED_MONSTERS } from '../attack';

export interface RangerAttackStrategyOptions extends AttackStrategyOptions {
  disableMultiShot?: boolean;
  disableSuperShot?: boolean;
}

export class RangerAttackStrategy extends AttackStrategy<Ranger, RangerAttackStrategyOptions> {
  protected override async attack(bot: Ranger): Promise<void> {
    const courageBudget = getCourageBudget(bot, this.options.maxTargets);
    let attacked = this.tryMultishot(bot, courageBudget);
    if (!attacked) attacked = this.trySuperShot(bot, courageBudget);
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

    const can5Shot = bot.canUse('5shot') && bot.mp >= bot.G.skills['5shot'].mp_cost! + (this.options.reserveMp ?? 0);

    const courage3: CourageBudget = { ...courageBudget };
    const courage5: CourageBudget = { ...courageBudget };
    const targets3: Entity[] = [];
    const targets5: Entity[] = [];

    for (const potentialTarget of potentialTargets) {
      if (can5Shot && targets5.length < 5) {
        const willDie = bot.canKillInOneShot(potentialTarget, '5shot');
        if (willDie || canSafelyTarget(courage5, potentialTarget)) {
          targets5.push(potentialTarget);
          if (!willDie) consumeCourageSlot(courage5, potentialTarget);
        }
      }

      if (targets3.length < 3) {
        const willDie = bot.canKillInOneShot(potentialTarget, '3shot');
        if (willDie || canSafelyTarget(courage3, potentialTarget)) {
          targets3.push(potentialTarget);
          if (!willDie) consumeCourageSlot(courage3, potentialTarget);
        }
      }

      if (targets5.length >= 5) break;
      if (!can5Shot && targets3.length >= 3) break;
    }

    const [f1, f2, f3, f4, f5] = targets5;
    if (f1 && f2 && f3 && f4 && f5) {
      const dyingTargets = targets5.filter((t) => bot.canKillInOneShot(t, '5shot'));
      for (const t of dyingTargets) IGNORED_MONSTERS.set(t.id, true);

      void bot.fiveShot(f1.id, f2.id, f3.id, f4.id, f5.id).catch(() => {
        for (const t of dyingTargets) IGNORED_MONSTERS.delete(t.id);
      });
      for (const t of targets5) {
        if (!dyingTargets.includes(t)) consumeCourageSlot(courageBudget, t);
      }
      return true;
    }

    const [t1, t2, t3] = targets3;
    if (t1 && t2 && t3) {
      const dyingTargets = targets3.filter((t) => bot.canKillInOneShot(t, '3shot'));
      for (const t of dyingTargets) IGNORED_MONSTERS.set(t.id, true);

      void bot.threeShot(t1.id, t2.id, t3.id).catch(() => {
        for (const t of dyingTargets) IGNORED_MONSTERS.delete(t.id);
      });
      for (const t of targets3) {
        if (!dyingTargets.includes(t)) consumeCourageSlot(courageBudget, t);
      }
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

    if (bot.canKillInOneShot(target, 'supershot')) IGNORED_MONSTERS.set(target.id, true);
    void bot.superShot(target.id).catch(() => {
      IGNORED_MONSTERS.delete(target.id);
    });
    consumeCourageSlot(courageBudget, target);
    return true;
  }
}
