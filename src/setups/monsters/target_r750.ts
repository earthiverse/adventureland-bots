import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TARGETR750_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'target_r750' });
const TARGETR750_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'target_r750' });

// TODO: Actual strategies per class

export const targetr750Setups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['target_r750'] }),
    configs: [
      {
        strategies: [TARGETR750_ATTACK_STRATEGY, TARGETR750_MOVE_STRATEGY],
      },
    ],
  },
];
