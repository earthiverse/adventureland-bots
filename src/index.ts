import { Game, Observer } from "alclient";

const game = new Game();
await Promise.all([game.updateG(), game.updateServers()]);

const observer = new Observer(game);
await observer.start("US", "I");

const start = performance.now();
const ms = await observer.ping();
const finish = performance.now();
console.log(ms, "vs", finish - start);

const start2 = performance.now();
const finish2 = performance.now();
console.log(finish2 - start2);

observer.stop();
