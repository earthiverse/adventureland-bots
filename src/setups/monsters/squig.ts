import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const SQUIG_ATTACK_STRATEGY = new AttackStrategy({ type: 'squig' });
const SQUIG_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'squig' });
const SQUIG_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'squig' });

// TODO: Actual strategies per class

export const squigSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['squig'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [SQUIG_RANGER_ATTACK_STRATEGY, SQUIG_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['squig'] }),
    configs: [
      {
        strategies: [SQUIG_ATTACK_STRATEGY, SQUIG_MOVE_STRATEGY],
      },
    ],
  },
];
