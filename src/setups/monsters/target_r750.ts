import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TARGETR750_ATTACK_STRATEGY = new AttackStrategy({ type: 'target_r750' });
const TARGETR750_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'target_r750' });
const TARGETR750_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'target_r750' });

// TODO: Actual strategies per class

export const targetr750Setups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['target_r750'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [TARGETR750_RANGER_ATTACK_STRATEGY, TARGETR750_MOVE_STRATEGY],
      },
    ],
  },

  {
    priority: (bots) => getPriority(bots, { typeList: ['target_r750'] }),
    configs: [
      {
        strategies: [TARGETR750_ATTACK_STRATEGY, TARGETR750_MOVE_STRATEGY],
      },
    ],
  },
];
