import { AttackStrategy } from '@/strategies/attack';
import { KiteMoveStrategy } from '@/strategies/move/kite';
import { RangerAttackStrategy } from '@/strategies/ranger/attack';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const CGOO_ATTACK_STRATEGY = new AttackStrategy({ type: 'cgoo' });
const CGOO_RANGER_ATTACK_STRATEGY = new RangerAttackStrategy({ type: 'cgoo' });
const CGOO_MOVE_STRATEGY = new KiteMoveStrategy({ type: 'cgoo' });

// TODO: Actual strategies per class

export const cgooSetups: Setups = [
  // Ranger
  {
    priority: (bots) => 1 + getPriority(bots, { typeList: ['cgoo'] }),
    configs: [
      {
        ctype: 'ranger',
        require: (bot) => bot.range > bot.G.monsters.cgoo.range + 25, // Enough range to kite
        strategies: [CGOO_RANGER_ATTACK_STRATEGY, CGOO_MOVE_STRATEGY],
      },
    ],
  },

  // Any
  {
    priority: (bots) => getPriority(bots, { typeList: ['cgoo'] }),
    configs: [
      {
        require: (bot) => bot.range > bot.G.monsters.cgoo.range + 25, // Enough range to kite
        strategies: [CGOO_ATTACK_STRATEGY, CGOO_MOVE_STRATEGY],
      },
    ],
  },
];
