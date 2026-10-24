import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TORTOISE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'tortoise' });
const TORTOISE_MOVE_STRATEGY = new MoveStrategy({ targetType: 'tortoise' });

// TODO: Actual strategies per class

export const tortoiseSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['tortoise'] }),
    configs: [
      {
        strategies: [TORTOISE_ATTACK_STRATEGY, TORTOISE_MOVE_STRATEGY],
      },
    ],
  },
];
