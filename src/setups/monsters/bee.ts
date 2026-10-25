import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const BEE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'bee' });
const BEE_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ targetType: 'bee' });
const BEE_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'bee' });

// TODO: Actual strategies per class

export const beeSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['bee'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [BEE_RANGER_ATTACK_STRATEGY, BEE_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['bee'] }),
    configs: [
      {
        strategies: [BEE_ATTACK_STRATEGY, BEE_MOVE_STRATEGY],
      },
    ],
  },
];
