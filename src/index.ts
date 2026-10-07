import AL from 'alclient';
import { env } from './config/env';

// Login
await AL.Game.login(env.EMAIL, env.PASSWORD, env.MONGO_URI, true);

// Get game data & prepare the pathfinder
await AL.Game.getGData();
await AL.Pathfinder.prepare(AL.Game.G);

// TODO: Logic
