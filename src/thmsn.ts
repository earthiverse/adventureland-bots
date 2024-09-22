import { Game, Ranger } from "alclient";
import credentials from "../credentials.thmsn.json";

// Plugins
import "./plugins/auto_reconnect.js";
import "./plugins/g_cache.js";
import "./plugins/ping_compensation.js";

const game = new Game({ url: "https://thmsn.adventureland.community" });
await Promise.all([game.updateG(), game.updateServers()]);

const player = await game.login(credentials.email, credentials.password);

const earthiverse = player.createCharacter<Ranger>("earthiverse");

await earthiverse.start("EU", "I");

const pingLoop = async () => {
  try {
    if (earthiverse.socket.disconnected) return;

    await earthiverse.ping().catch();
  } catch (e) {
    // console.error(e);
  } finally {
    setTimeout(pingLoop, 10_000);
  }
};
pingLoop();

const regenLoop = async () => {
  try {
    if (earthiverse.socket.disconnected) return;

    await earthiverse.regenMp().catch();
  } catch (e) {
    // console.error(e);
  } finally {
    setTimeout(regenLoop, Math.max(100, earthiverse.getTimeout("use_mp")));
  }
};
regenLoop();

const attackLoop = async () => {
  try {
    if (earthiverse.socket.disconnected) return;

    const entity = [...earthiverse.monsters.values()].filter((m) => {
      if (!m) return false;
      if (m.type !== "goo") return false;
      if (
        (m.getDistanceTo(earthiverse) ?? Number.POSITIVE_INFINITY) >
        earthiverse.range
      )
        return false;
      return true;
    })[0];
    if (!entity) return;

    console.log("attacking", entity.id);
    await earthiverse.basicAttack(entity).catch();
  } catch (e) {
    // console.error(e);
  } finally {
    setTimeout(attackLoop, Math.max(100, earthiverse.getTimeout("attack")));
  }
};
attackLoop();
