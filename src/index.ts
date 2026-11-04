import AL from 'alclient';

import { DEFAULT_IDENTIFIER, DEFAULT_REGION } from './config/defaults';
import { env } from './config/env';
import { ENABLE_MONSTER_HUNTS } from './config/flags';
import { Context } from './context/context';
import { SetupManager } from './setups/manager';
import { arcticbeeSetups } from './setups/monsters/arcticbee';
import { armadilloSetups } from './setups/monsters/armadillo';
import { batSetups } from './setups/monsters/bat';
import { bbpompomSetups } from './setups/monsters/bbpompom';
import { beeSetups } from './setups/monsters/bee';
import { cgooSetups } from './setups/monsters/cgoo';
import { crabSetups } from './setups/monsters/crab';
import { crabxSetups } from './setups/monsters/crabx';
import { crocSetups } from './setups/monsters/croc';
import { frogSetups } from './setups/monsters/frog';
import { gooSetups } from './setups/monsters/goo';
import { greenjrSetups } from './setups/monsters/greenjr';
import { jrSetups } from './setups/monsters/jr';
import { minimushSetups } from './setups/monsters/minimush';
import { phoenixSetups } from './setups/monsters/phoenix';
import { poisioSetups } from './setups/monsters/poisio';
import { porcupineSetups } from './setups/monsters/porcupine';
import { ratSetups } from './setups/monsters/rat';
import { snakeSetups } from './setups/monsters/snake';
import { squigSetups } from './setups/monsters/squig';
import { targeta500Setups } from './setups/monsters/target_a500';
import { targetar900Setups } from './setups/monsters/target_ar900';
import { targetr750Setups } from './setups/monsters/target_r750';
import { tortoiseSetups } from './setups/monsters/tortoise';
import { state } from './state/state';
import { LootStrategy } from './strategies/loot';
import { MonsterHuntStrategy } from './strategies/monsterhunt';
import { AvoidStackingStrategy } from './strategies/move/avoid_stacking';
import { PartyStrategy } from './strategies/party';
import { RegenStrategy } from './strategies/regen';
import { RespawnStrategy } from './strategies/respawn';

// Shut down cleanly on SIGINT (Ctrl+C)
process.on('SIGINT', () => process.exit(0));

// Login
await AL.Game.login(env.EMAIL, env.PASSWORD, env.MONGO_URI, true);

// Get game data & prepare the pathfinder
await AL.Game.getGData(true);
await AL.Pathfinder.prepare(AL.Game.G);

const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy();
const LOOT_STRATEGY = new LootStrategy();
const MONSTER_HUNT_STRATEGY = new MonsterHuntStrategy();
const PARTY_STRATEGY = new PartyStrategy({ partyLeader: 'Warzair' });
const REGEN_STRATEGY = new RegenStrategy();
const RESPAWN_STRATEGY = new RespawnStrategy();

const warrior = await AL.Game.startWarrior('Warzair', DEFAULT_REGION, DEFAULT_IDENTIFIER);
const mage = await AL.Game.startMage('Magzair', DEFAULT_REGION, DEFAULT_IDENTIFIER);
const ranger = await AL.Game.startRanger('Ranzair', DEFAULT_REGION, DEFAULT_IDENTIFIER);

const warriorContext = new Context(warrior, DEFAULT_REGION, DEFAULT_IDENTIFIER);
state.addContext(warriorContext);

const mageContext = new Context(mage, DEFAULT_REGION, DEFAULT_IDENTIFIER);
state.addContext(mageContext);

const rangerContext = new Context(ranger, DEFAULT_REGION, DEFAULT_IDENTIFIER);
state.addContext(rangerContext);

// Base strategies
for (const context of [warriorContext, mageContext, rangerContext]) {
  context.applyStrategy(AVOID_STACKING_STRATEGY);
  context.applyStrategy(LOOT_STRATEGY);
  context.applyStrategy(PARTY_STRATEGY);
  context.applyStrategy(REGEN_STRATEGY);
  context.applyStrategy(RESPAWN_STRATEGY);

  if (ENABLE_MONSTER_HUNTS) context.applyStrategy(MONSTER_HUNT_STRATEGY);
}

const manager = new SetupManager([
  ...arcticbeeSetups,
  ...armadilloSetups,
  ...batSetups,
  ...bbpompomSetups,
  ...beeSetups,
  ...cgooSetups,
  ...crabSetups,
  ...crabxSetups,
  ...crocSetups,
  ...frogSetups,
  ...gooSetups,
  ...greenjrSetups,
  ...jrSetups,
  ...minimushSetups,
  ...phoenixSetups,
  ...poisioSetups,
  ...porcupineSetups,
  ...ratSetups,
  ...snakeSetups,
  ...squigSetups,
  ...targeta500Setups,
  ...targetar900Setups,
  ...targetr750Setups,
  ...tortoiseSetups,
]);
manager.start();
