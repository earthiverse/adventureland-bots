import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";
import config from "../../config/config.js";
import * as schema from "./schema.js";

const dbPath = config.db.path === ":memory:" ? ":memory:" : path.resolve(process.cwd(), config.db.path);
const client = new Database(dbPath);

export const db = drizzle(client, { schema });
