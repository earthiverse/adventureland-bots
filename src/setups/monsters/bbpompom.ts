import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const BBPOMPOM_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'bbpompom' });
const BBPOMPOM_MOVE_STRATEGY = new MoveStrategy({ targetType: 'bbpompom' });

const BBPOMPOM_CONFIG = {
  strategies: [BBPOMPOM_ATTACK_STRATEGY, BBPOMPOM_MOVE_STRATEGY],
};

// TODO: Actual strategies per class

export const bbpompomSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['bbpompom'] }),
    configs: [
      {
        ctype: 'priest',
        strategies: [BBPOMPOM_ATTACK_STRATEGY, BBPOMPOM_MOVE_STRATEGY],
      },
      BBPOMPOM_CONFIG,
      BBPOMPOM_CONFIG,
    ],
  },
];
