import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { canAvoidDreturn } from '@/utils/combat';
import { getPriority } from '@/utils/priority';

const ARMADILLO_ATTACK_STRATEGY = new AttackStrategy({ type: 'armadillo' });
const ARMADILLO_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'armadillo' });
const ARMADILLO_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'armadillo' });

// TODO: Actual strategies per class

export const armadilloSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['armadillo'] }),
    configs: [
      {
        ctype: 'ranger',
        require: canAvoidDreturn,
        strategies: [ARMADILLO_RANGER_ATTACK_STRATEGY, ARMADILLO_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['armadillo'] }),
    configs: [
      {
        require: canAvoidDreturn,
        strategies: [ARMADILLO_ATTACK_STRATEGY, ARMADILLO_MOVE_STRATEGY],
      },
    ],
  },
];
