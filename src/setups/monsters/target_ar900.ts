import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const TARGETAR900_ATTACK_STRATEGY = new AttackStrategy({ type: 'target_ar900' });
const TARGETAR900_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'target_ar900' });
const TARGETAR900_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'target_ar900' });

// TODO: Actual strategies per class

export const targetar900Setups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['target_ar900'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [TARGETAR900_RANGER_ATTACK_STRATEGY, TARGETAR900_MOVE_STRATEGY],
      },
    ],
  },

  {
    priority: (bots) => getPriority(bots, { typeList: ['target_ar900'] }),
    configs: [
      {
        strategies: [TARGETAR900_ATTACK_STRATEGY, TARGETAR900_MOVE_STRATEGY],
      },
    ],
  },
];
