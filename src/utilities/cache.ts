import fs from "fs";
import path from "path";
import type { GData } from "typed-adventureland";
import url from "url";

export const G_CACHE_FOLDER = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "../../data/g/");

export function getGFromCache(): GData | undefined {
  const files = fs.readdirSync(G_CACHE_FOLDER);
  if (files.length === 0) return undefined;
  const newestVersion = files.reduce((a, b) => {
    const versionA = parseInt(a.substring(0, a.indexOf(".")));
    const versionB = parseInt(b.substring(0, b.indexOf(".")));

    return versionA > versionB ? a : b;
  });
  return JSON.parse(
    fs.readFileSync(path.join(G_CACHE_FOLDER, newestVersion), {
      encoding: "utf8",
    }),
  ) as GData;
}
