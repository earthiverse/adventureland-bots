import { type ActionData, type PingCompensatedCharacter, Tools } from 'alclient';

import type { Strategy, StrategyLoops } from '@/types/strategy';
import { getCourageOverage, type MonsterDamageType } from '@/utils/courage';
import { ignoreErrors } from '@/utils/errors';

// TODO: Add if we could die to splash damage

export interface AvoidDeathStrategyOptions {
  /** Whether to attempt to scare monsters when under threat. Defaults to true. */
  useScare?: boolean | undefined;
  /** Scare if targeted by monsters and current HP <= this value. */
  scareIfHpBelow?: number | undefined;
  /** Scare if targeted by monsters and current HP ratio (hp / max_hp) <= this value. */
  scareIfHpRatioBelow?: number | undefined;
}

export class AvoidDeathStrategy<BotType extends PingCompensatedCharacter> implements Strategy<BotType> {
  public readonly loops: StrategyLoops<BotType> = {
    attack: {
      fn: (bot) => this.avoidDeath(bot),
      getDelay: (bot) => bot.G.conditions.burned.interval! ?? 200,
    },
  };
  public readonly priority = 1000;

  protected readonly onActionListeners = new Map<string, (data: ActionData) => void>();

  public constructor(protected readonly options: AvoidDeathStrategyOptions = {}) {}

  protected avoidDeath(bot: BotType): false | void {
    if (bot.rip) return false; // Already dead

    if (bot.s.burned) {
      const interval = bot.G.conditions.burned?.interval ?? 210;
      const numIntervals = Math.ceil(Math.min(bot.s.burned.ms, bot.ping * 4) / interval);
      const damagePerInterval = Math.ceil(bot.s.burned.intensity / 5);
      if (numIntervals * damagePerInterval >= bot.hp) {
        // We may die
        return this.suicide(bot);
      }
    }

    if (!bot.targets) return; // No targets, probably won't die
    let potentialIncomingDamage = 0;
    const overage = getCourageOverage(bot);
    for (const entity of bot.getEntities({ targetingMe: true })) {
      if (Tools.distance(bot, entity) > entity.range + entity.speed) continue; // Too far away to attack us
      let entityDamage = entity.calculateDamageRange(bot)[1];
      const numOver = overage[entity.damage_type as MonsterDamageType];
      if (numOver > 0) entityDamage *= 1 + 0.2 * numOver;
      potentialIncomingDamage += entityDamage;
    }

    const isLethal = potentialIncomingDamage >= bot.hp;
    const isLowHp =
      (this.options.scareIfHpBelow !== undefined && bot.hp <= this.options.scareIfHpBelow) ||
      (this.options.scareIfHpRatioBelow !== undefined && bot.hp / bot.max_hp <= this.options.scareIfHpRatioBelow);

    if ((isLethal || isLowHp) && (this.options.useScare ?? true)) {
      const scared = this.tryScare(bot);
      if (scared) return false;
    }

    if (isLethal) return this.suicide(bot); // We may die
  }

  /**
   * Returns true if we attempted to scare, false otherwise
   */
  protected tryScare(bot: BotType): boolean {
    if (!bot.canUse('scare', { ignoreEquipped: true })) return false;
    const hasJacko = bot.slots.orb?.name === 'jacko' || bot.hasItem('jacko');
    if (!hasJacko) return false;

    // Equip jacko if not already equipped
    if (bot.slots.orb?.name !== 'jacko') {
      const jackoSlot = bot.locateItem('jacko');
      if (jackoSlot === undefined) return false;
      void ignoreErrors(bot.equip(jackoSlot));
    }

    void ignoreErrors(bot.scare());
    return true;
  }

  /**
   * In-game penalty (xp / gold / tombofprotection) for dying to an entity is high.
   * In-game penalty for suicide is none.
   */
  protected suicide(bot: BotType): false {
    void ignoreErrors(bot.harakiri());
    return false;
  }

  /** Add a listener for projectiles so we can avoid death */
  public onApply(bot: BotType): void {
    const listener = (data: ActionData) => {
      if (bot.rip) return; // Already dead
      if (data.target !== bot.id) return; // Not for us
      if (!bot.couldDieToProjectiles()) return; // Won't die

      // We may die
      this.suicide(bot);
    };
    bot.socket.on('action', listener);
    this.onActionListeners.set(bot.id, listener);
  }

  public onRemove(bot: BotType): void {
    const listener = this.onActionListeners.get(bot.id);
    if (listener) bot.socket.off('action', listener);
    this.onActionListeners.delete(bot.id);
  }
}
