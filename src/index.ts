import AL from 'alclient';

import { botsConfig } from './config/bots';
import { env } from './config/env';
import { Context } from './context/context';
import { SetupManager } from './setups/manager';
import { arcticbeeSetups } from './setups/monsters/arcticbee';
import { armadilloSetups } from './setups/monsters/armadillo';
import { batSetups } from './setups/monsters/bat';
import { bbpompomSetups } from './setups/monsters/bbpompom';
import { beeSetups } from './setups/monsters/bee';
import { bigbirdSetups } from './setups/monsters/bigbird';
import { cgooSetups } from './setups/monsters/cgoo';
import { crabSetups } from './setups/monsters/crab';
import { crabxSetups } from './setups/monsters/crabx';
import { crocSetups } from './setups/monsters/croc';
import { frogSetups } from './setups/monsters/frog';
import { gooSetups } from './setups/monsters/goo';
import { greenjrSetups } from './setups/monsters/greenjr';
import { iceroamerSetups } from './setups/monsters/iceroamer';
import { jrSetups } from './setups/monsters/jr';
import { minimushSetups } from './setups/monsters/minimush';
import { phoenixSetups } from './setups/monsters/phoenix';
import { poisioSetups } from './setups/monsters/poisio';
import { porcupineSetups } from './setups/monsters/porcupine';
import { pratSetups } from './setups/monsters/prat';
import { ratSetups } from './setups/monsters/rat';
import { scorpionSetups } from './setups/monsters/scorpion';
import { snakeSetups } from './setups/monsters/snake';
import { spiderSetups } from './setups/monsters/spider';
import { squigSetups } from './setups/monsters/squig';
import { stonewormSetups } from './setups/monsters/stoneworm';
import { targeta500Setups } from './setups/monsters/target_a500';
import { targeta750Setups } from './setups/monsters/target_a750';
import { targetar900Setups } from './setups/monsters/target_ar900';
import { targetr750Setups } from './setups/monsters/target_r750';
import { tortoiseSetups } from './setups/monsters/tortoise';
import { xscorpionSetups } from './setups/monsters/xscorpion';
import { state } from './state/state';
import { AvoidDeathStrategy } from './strategies/avoid_death';
import { ItemStrategy } from './strategies/item';
import { LootStrategy } from './strategies/loot';
import { MonsterHuntStrategy } from './strategies/monsterhunt';
import { AvoidStackingStrategy } from './strategies/move/avoid_stacking';
import { PartyStrategy } from './strategies/party';
import { RegenStrategy } from './strategies/regen';
import { RespawnStrategy } from './strategies/respawn';

// Shut down cleanly on SIGINT (Ctrl+C) and SIGTERM
const shutdownHandlers: (() => void)[] = [() => state.stopAll()];
const runShutdownHandlers = (): void => {
  for (const handler of shutdownHandlers) handler();
};
process.on('SIGINT', () => {
  runShutdownHandlers();
  process.exit(0);
});
process.on('SIGTERM', () => {
  runShutdownHandlers();
  process.exit(0);
});

// Login
await AL.Game.login(env.EMAIL, env.PASSWORD, env.MONGO_URI, true);

// Get game data & prepare the pathfinder
await AL.Game.getGData(true);
await AL.Pathfinder.prepare(AL.Game.G);

const AVOID_DEATH_STRATEGY = new AvoidDeathStrategy();
const AVOID_STACKING_STRATEGY = new AvoidStackingStrategy();
const ITEM_STRATEGY = new ItemStrategy();
const LOOT_STRATEGY = new LootStrategy();
const MONSTER_HUNT_STRATEGY = new MonsterHuntStrategy();
const partyLeader = botsConfig.partyLeader ?? botsConfig.characters[0];
const PARTY_STRATEGY = partyLeader ? new PartyStrategy({ partyLeader }) : undefined;
const REGEN_STRATEGY = new RegenStrategy();
const RESPAWN_STRATEGY = new RespawnStrategy();

// Start configured characters; AL.Game.startCharacter picks each character's class from account data
const contexts: Context[] = [];
for (const characterName of botsConfig.characters) {
  const bot = await AL.Game.startCharacter(characterName, botsConfig.server.region, botsConfig.server.identifier);
  const context = new Context(bot, botsConfig.server.region, botsConfig.server.identifier);
  state.addContext(context);
  contexts.push(context);
}

// Base strategies
for (const context of contexts) {
  context.applyStrategy(AVOID_DEATH_STRATEGY);
  context.applyStrategy(AVOID_STACKING_STRATEGY);
  context.applyStrategy(ITEM_STRATEGY);
  context.applyStrategy(LOOT_STRATEGY);
  if (PARTY_STRATEGY) context.applyStrategy(PARTY_STRATEGY);
  context.applyStrategy(REGEN_STRATEGY);
  context.applyStrategy(RESPAWN_STRATEGY);

  if (botsConfig.flags.enableMonsterHunts) context.applyStrategy(MONSTER_HUNT_STRATEGY);
}

const manager = new SetupManager([
  ...arcticbeeSetups,
  ...armadilloSetups,
  ...batSetups,
  ...bbpompomSetups,
  ...beeSetups,
  ...bigbirdSetups,
  ...cgooSetups,
  ...crabSetups,
  ...crabxSetups,
  ...crocSetups,
  ...frogSetups,
  ...gooSetups,
  ...greenjrSetups,
  ...iceroamerSetups,
  ...jrSetups,
  ...minimushSetups,
  ...phoenixSetups,
  ...poisioSetups,
  ...porcupineSetups,
  ...pratSetups,
  ...ratSetups,
  ...scorpionSetups,
  ...snakeSetups,
  ...spiderSetups,
  ...squigSetups,
  ...stonewormSetups,
  ...targeta500Setups,
  ...targeta750Setups,
  ...targetar900Setups,
  ...targetr750Setups,
  ...tortoiseSetups,
  ...xscorpionSetups,
]);
shutdownHandlers.unshift(() => manager.stop());
manager.start();
