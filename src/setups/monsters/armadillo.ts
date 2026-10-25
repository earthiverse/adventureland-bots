import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const ARMADILLO_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'armadillo' });
const ARMADILLO_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ targetType: 'armadillo' });
const ARMADILLO_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'armadillo' });

// TODO: Actual strategies per class

export const armadilloSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['armadillo'] }),
    configs: [
      {
        ctype: 'ranger',
        require: (bot) => bot.range > 64, // Need high range to avoid dreturn
        strategies: [ARMADILLO_RANGER_ATTACK_STRATEGY, ARMADILLO_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['armadillo'] }),
    configs: [
      {
        require: (bot) => bot.range > 64, // Need high range to avoid dreturn
        strategies: [ARMADILLO_ATTACK_STRATEGY, ARMADILLO_MOVE_STRATEGY],
      },
    ],
  },
];
