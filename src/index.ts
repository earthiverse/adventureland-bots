import AL, { type ServerIdentifier, type ServerRegion } from 'alclient';

import { env } from './config/env';
import { Context } from './context/context';
import { state } from './state/state';
import { AttackStrategy } from './strategies/attack';
import { LootStrategy } from './strategies/loot';
import { MoveStrategy } from './strategies/move';
import { RegenStrategy } from './strategies/regen';

// Login
await AL.Game.login(env.EMAIL, env.PASSWORD, env.MONGO_URI, true);

// Get game data & prepare the pathfinder
await AL.Game.getGData();
await AL.Pathfinder.prepare(AL.Game.G);

// TODO: Move to config
const REGION: ServerRegion = 'US';
const IDENTIFIER: ServerIdentifier = 'II';

const GOO_ATTACK_STRATEGY = new AttackStrategy({ targetType: 'goo' });
const GOO_MOVE_STRATEGY = new MoveStrategy({ targetType: 'goo' });
const LOOT_STRATEGY = new LootStrategy();
const REGEN_STRATEGY = new RegenStrategy();

const warrior = await AL.Game.startWarrior('Warzair', REGION, IDENTIFIER);
const mage = await AL.Game.startMage('Magzair', REGION, IDENTIFIER);
const ranger = await AL.Game.startRanger('Ranzair', REGION, IDENTIFIER);

const warriorContext = new Context(warrior, REGION, IDENTIFIER);
state.addContext(warriorContext);
const mageContext = new Context(mage, REGION, IDENTIFIER);
state.addContext(mageContext);
const rangerContext = new Context(ranger, REGION, IDENTIFIER);
state.addContext(rangerContext);

// TODO: Logic
for (const context of [warriorContext, mageContext, rangerContext]) {
  context.applyStrategy(GOO_ATTACK_STRATEGY);
  context.applyStrategy(GOO_MOVE_STRATEGY);

  context.applyStrategy(LOOT_STRATEGY);
  context.applyStrategy(REGEN_STRATEGY);
}
