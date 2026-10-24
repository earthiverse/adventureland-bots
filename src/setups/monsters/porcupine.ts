import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const PORCUPINE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'porcupine' });
const PORCUPINE_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'porcupine' });

// TODO: Actual strategies per class

export const porcupineSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['porcupine'] }),
    configs: [
      {
        require: (bot) => bot.range > 64, // Need high range to avoid dreturn
        strategies: [PORCUPINE_ATTACK_STRATEGY, PORCUPINE_MOVE_STRATEGY],
      },
    ],
  },
];
