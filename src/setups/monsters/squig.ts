import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SQUIG_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'squig' });
const SQUIG_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'squig' });

// TODO: Actual strategies per class

export const squigSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['squig'] }),
    configs: [
      {
        strategies: [SQUIG_ATTACK_STRATEGY, SQUIG_MOVE_STRATEGY],
      },
    ],
  },
];
