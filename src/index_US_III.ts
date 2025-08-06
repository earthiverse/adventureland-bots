import { Game, Observer } from "alclient";
import fs from "fs";
import path from "path";
import type { ServerIdentifier, ServerRegion } from "typed-adventureland";
import url from "url";

const game = new Game();
await Promise.all([game.updateG(), game.updateServers()]);

const observer = new Observer(game);
await observer.start("US", "III");

let assumption = "";

function cleanObject(key: string, value: unknown) {
  if (key === "game") return undefined;
  return value;
}

const handler = (error: Error) => {
  const dest = path.join(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "../data/unhandled-rejection/",
    Date.now().toString(),
  );
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, "error.json"), JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  fs.writeFileSync(
    path.join(dest, "monsters.json"),
    JSON.stringify(Array.from(observer.monsters.entries()), cleanObject, 2),
  );
  fs.writeFileSync(
    path.join(dest, "characters.json"),
    JSON.stringify(Array.from(observer.characters.entries()), cleanObject, 2),
  );
  fs.writeFileSync(
    path.join(dest, "projectiles.json"),
    JSON.stringify(Array.from(observer.projectiles.entries()), cleanObject, 2),
  );
};

process.on("unhandledRejection", handler);
process.on("uncaughtException", handler);

observer.socket?.on("entities", (data) => {
  for (const character of data.players) {
    if (character.attack === undefined)
      assumption = "ASSUMPTION FAILED -- no attack on character!" + JSON.stringify(character);

    if (character.armor === undefined)
      assumption = "ASSUMPTION FAILED -- no armor on character!" + JSON.stringify(character);

    if (character.range === undefined)
      assumption = "ASSUMPTION FAILED -- no range on character!" + JSON.stringify(character);
  }
});

setInterval(() => {
  const printStuff = async () => {
    console.clear();
    console.log("Connected:", observer.socket?.connected ?? "deleted");
    console.log("Server:", observer.server.region, observer.server.name);
    console.log("Position:", observer.map, observer.x, observer.y);
    console.log("# Monsters:", observer.monsters.size);
    console.log("# Characters:", observer.characters.size);
    console.log("# Projectiles:", observer.projectiles.size);
    console.log("Memory usage:", process.memoryUsage());
    console.log("Ping: ", await observer.ping());
    console.log();
    console.log(assumption);
  };
  printStuff().catch(console.log);
}, 1000);

for (const [server, region] of [
  ["US", "II"],
  ["US", "III"],
  ["EU", "I"],
  ["EU", "II"],
  ["ASIA", "I"],
] as [ServerRegion, ServerIdentifier][]) {
  const o = new Observer(game);
  o.start(server, region).catch(console.error);
}
