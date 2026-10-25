import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const CRABX_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'crabx' });
const CRABX_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ targetType: 'crabx' });
const CRABX_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'crabx' });

// TODO: Actual strategies per class

export const crabxSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['crabx'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [CRABX_RANGER_ATTACK_STRATEGY, CRABX_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['crabx'] }),
    configs: [
      {
        strategies: [CRABX_ATTACK_STRATEGY, CRABX_MOVE_STRATEGY],
      },
    ],
  },
];
