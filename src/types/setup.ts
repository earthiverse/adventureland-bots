import type {
  CharacterType,
  Mage,
  Merchant,
  Paladin,
  PingCompensatedCharacter,
  Priest,
  Ranger,
  Rogue,
  Warrior,
} from 'alclient';

import type { Context } from '@/context/context';
import type { Strategy } from '@/types/strategy';

export interface CharacterTypeMap {
  mage: Mage;
  merchant: Merchant;
  paladin: Paladin;
  priest: Priest;
  ranger: Ranger;
  rogue: Rogue;
  warrior: Warrior;
}

export type CharacterConfig<T extends CharacterType = CharacterType> = {
  [K in T]: {
    ctype: K;
    require?(bot: CharacterTypeMap[K]): boolean;
    strategies: Strategy<CharacterTypeMap[K]>[];
  };
}[T];

export interface Setup {
  /**
   * Priority of the setup. Higher priority setups will be applied first.
   * Defaults to 0 if not specified.
   */
  priority?: number | ((bots: PingCompensatedCharacter[]) => number);

  /**
   * Character configurations required for this setup.
   */
  configs: CharacterConfig[];
}
export type Setups = Setup[];

export interface MatchedSlot {
  context: Context;
  config: CharacterConfig;
}

export interface EvaluatedMatch {
  priority: number;
  slots: MatchedSlot[];
}
