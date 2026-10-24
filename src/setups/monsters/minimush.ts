import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const MINIMUSH_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'minimush' });
const MINIMUSH_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'minimush' });

// TODO: Actual strategies per class

export const minimushSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['minimush'] }),
    configs: [
      {
        strategies: [MINIMUSH_ATTACK_STRATEGY, MINIMUSH_MOVE_STRATEGY],
      },
    ],
  },
];
