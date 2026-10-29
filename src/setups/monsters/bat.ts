import { AttackStrategy } from '@/strategies/attack';
import { BasicMoveStrategy } from '@/strategies/move/basic';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const BAT_ATTACK_STRATEGY = new AttackStrategy({ type: 'bat' });
const BAT_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'bat' });
const BAT_MOVE_STRATEGY = new BasicMoveStrategy({ type: 'bat' });

// TODO: Actual strategies per class

export const batSetups: Setups = [
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['bat'] }),
    configs: [
      {
        ctype: 'ranger',
        strategies: [BAT_RANGER_ATTACK_STRATEGY, BAT_MOVE_STRATEGY],
      },
    ],
  },
  {
    priority: (bots) => getPriority(bots, { typeList: ['bat'] }),
    configs: [
      {
        strategies: [BAT_ATTACK_STRATEGY, BAT_MOVE_STRATEGY],
      },
    ],
  },
];
