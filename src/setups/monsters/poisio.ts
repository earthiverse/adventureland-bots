import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const POISIO_ATTACK_STRATEGY = new AttackStrategy({ type: 'poisio' });
const POISIO_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'poisio' });
const POISIO_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'poisio' });

// TODO: Actual strategies per class
// TODO: require with minimum stats

export const poisioSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['poisio'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [POISIO_RANGER_ATTACK_STRATEGY, POISIO_MOVE_STRATEGY],
      },
    ],
  },

  {
    priority: (bots) => getPriority(bots, { typeList: ['poisio'] }),
    configs: [
      {
        strategies: [POISIO_ATTACK_STRATEGY, POISIO_MOVE_STRATEGY],
      },
    ],
  },
];
