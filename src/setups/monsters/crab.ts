import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const CRAB_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'crab' });
const CRAB_MOVE_STRATEGY = new MoveStrategy({ targetType: 'crab' });

// TODO: Actual strategies per class

export const crabSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['crab'] }),
    configs: [
      {
        strategies: [CRAB_ATTACK_STRATEGY, CRAB_MOVE_STRATEGY],
      },
    ],
  },
];
