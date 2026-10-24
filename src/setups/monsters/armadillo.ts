import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const ARMADILLO_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'armadillo' });
const ARMADILLO_MOVE_STRATEGY = new BasicMoveStrategy({ targetType: 'armadillo' });

// TODO: Actual strategies per class

export const armadilloSetups: Setups = [
  {
    priority: (bots) => getPriority(bots, { typeList: ['armadillo'] }),
    configs: [
      {
        require: (bot) => bot.range > 64, // Need high range to avoid dreturn
        strategies: [ARMADILLO_ATTACK_STRATEGY, ARMADILLO_MOVE_STRATEGY],
      },
    ],
  },
];
