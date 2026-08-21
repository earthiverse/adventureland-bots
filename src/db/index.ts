import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";
import config from "../../config/config.js";
import * as schema from "./schema.js";

const dbPath = config.db.path === ":memory:" ? ":memory:" : path.resolve(process.cwd(), config.db.path);
const client = new Database(dbPath);

// Allow multiple processes to use the same DB
client.run("PRAGMA journal_mode = WAL;");
client.run("PRAGMA busy_timeout = 100;");

export const db = drizzle(client, { schema });
