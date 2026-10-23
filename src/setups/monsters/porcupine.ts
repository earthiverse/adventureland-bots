import type { CharacterType, PingCompensatedCharacter } from 'alclient';

import { AttackStrategy } from '@/strategies/attack';
import { MoveStrategy } from '@/strategies/move';
import type { Setups } from '@/types/setup';
import { getPriority } from '@/utils/priority';

const PORCUPINE_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'porcupine' });
const PORCUPINE_MOVE_STRATEGY = new MoveStrategy({ targetType: 'porcupine' });
const COMBAT_CLASSES = ['mage', 'paladin', 'priest', 'ranger', 'rogue', 'warrior'] as const satisfies CharacterType[];

// TODO: Actual strategies per class

export const porcupineSetups: Setups = COMBAT_CLASSES.map((ctype) => ({
  priority: (bots) => getPriority(bots, { typeList: ['porcupine'] }),
  configs: [
    {
      ctype,
      require: (bot: PingCompensatedCharacter) => bot.range > 64,
      strategies: [PORCUPINE_ATTACK_STRATEGY, PORCUPINE_MOVE_STRATEGY],
    },
  ],
}));
