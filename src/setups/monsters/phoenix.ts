import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const PHOENIX_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'phoenix' });
const PHOENIX_MOVE_STRATEGY = new MoveStrategy({ targetType: 'phoenix' });

// TODO: Actual strategies per class

export const phoenixSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['phoenix'] }),
    configs: [
      {
        strategies: [PHOENIX_ATTACK_STRATEGY, PHOENIX_MOVE_STRATEGY],
      },
    ],
  },
];
