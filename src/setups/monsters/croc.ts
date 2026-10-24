import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const CROC_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'croc' });
const CROC_MOVE_STRATEGY = new MoveStrategy({ targetType: 'croc' });

// TODO: Actual strategies per class

export const crocSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['croc'] }),
    configs: [
      {
        strategies: [CROC_ATTACK_STRATEGY, CROC_MOVE_STRATEGY],
      },
    ],
  },
];
