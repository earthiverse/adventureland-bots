import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { canAvoidDreturn } from '@/utils/combat';
import { getPriority } from '@/utils/priority';

const PORCUPINE_ATTACK_STRATEGY = new AttackStrategy({ type: 'porcupine' });
const PORCUPINE_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'porcupine' });
const PORCUPINE_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'porcupine' });

// TODO: Actual strategies per class

export const porcupineSetups: Setups = [
  // Ranger
  {
    priority: (bots) => getPriority(bots, { typeList: ['porcupine'] }),
    configs: [
      {
        ctype: 'ranger',
        require: canAvoidDreturn,
        strategies: [PORCUPINE_RANGER_ATTACK_STRATEGY, PORCUPINE_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['porcupine'] }),
    configs: [
      {
        require: canAvoidDreturn,
        strategies: [PORCUPINE_ATTACK_STRATEGY, PORCUPINE_MOVE_STRATEGY],
      },
    ],
  },
];
