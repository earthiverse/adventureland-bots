import {
  Game,
  type Mage,
  type Paladin,
  type Priest,
  type Ranger,
  type Rogue,
  type Warrior,
} from "alclient";
import credentials from "../credentials.thmsn.json";
import { setup } from "./setups/simple/base.js";

// Plugins
import "./plugins/auto_reconnect.js";
import "./plugins/g_cache.js";
import "./plugins/ping_compensation.js";

const game = new Game({ url: "https://thmsn.adventureland.community" });
await Promise.all([game.updateG(), game.updateServers()]);

const player = await game.login(credentials.email, credentials.password);

const earthiverse = player.createCharacter<Ranger>("earthiverse");
await earthiverse.start("EU", "I");
setup(earthiverse);

const earthMag = player.createCharacter<Mage>("earthMag");
await earthMag.start("EU", "I");
setup(earthMag);

const earthPri = player.createCharacter<Priest>("earthPri");
await earthPri.start("EU", "I");
setup(earthPri);

const earthWar = player.createCharacter<Warrior>("earthWar");
await earthWar.start("EU", "I");
setup(earthWar);

const earthRog = player.createCharacter<Rogue>("earthRog");
await earthRog.start("EU", "I");
setup(earthRog);

const earthPal = player.createCharacter<Paladin>("earthPal");
await earthPal.start("EU", "I");
setup(earthPal);
