import { AttackStrategy } from '@/strategies/attack';
import { CheeseDoorMoveStrategy } from '@/strategies/move/cheese_door';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';
import { furthestPrioritization } from '@/utils/targeting';

const PRAT_ATTACK_STRATEGY = new AttackStrategy({ prioritization: furthestPrioritization, type: 'prat' });
const PRAT_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'prat' });
const PRAT_CHEESE_MOVE_STRATEGY = new CheeseDoorMoveStrategy({ location: { map: 'level1', x: 0, y: 0 } });

// TODO: Actual strategies per class

export const pratSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['prat'] }),
    configs: [
      {
        ctype: 'ranger',
        require: (bot) => bot.range > bot.G.monsters.prat.range + 25,
        strategies: [PRAT_RANGER_ATTACK_STRATEGY, PRAT_CHEESE_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['prat'] }),
    configs: [
      {
        require: (bot) => bot.range > bot.G.monsters.prat.range + 25,
        strategies: [PRAT_ATTACK_STRATEGY, PRAT_CHEESE_MOVE_STRATEGY],
      },
    ],
  },
];
