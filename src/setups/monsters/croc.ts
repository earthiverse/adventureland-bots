import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const CROC_ATTACK_STRATEGY = new AttackStrategy({ type: 'croc' });
const CROC_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'croc' });
const CROC_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'croc' });

// TODO: Actual strategies per class

export const crocSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['croc'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [CROC_RANGER_ATTACK_STRATEGY, CROC_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['croc'] }),
    configs: [
      {
        strategies: [CROC_ATTACK_STRATEGY, CROC_MOVE_STRATEGY],
      },
    ],
  },
];
