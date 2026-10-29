import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const ARCTICBEE_ATTACK_STRATEGY = new AttackStrategy({ type: 'arcticbee' });
const ARCTICBEE_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'arcticbee' });
const ARCTICBEE_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'arcticbee' });

// TODO: Actual strategies per class

export const arcticbeeSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['arcticbee'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [ARCTICBEE_RANGER_ATTACK_STRATEGY, ARCTICBEE_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['arcticbee'] }),
    configs: [
      {
        strategies: [ARCTICBEE_ATTACK_STRATEGY, ARCTICBEE_MOVE_STRATEGY],
      },
    ],
  },
];
