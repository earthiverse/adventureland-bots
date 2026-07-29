import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import path from "path";
import * as schema from "./schema.js";

const dbPath = path.resolve(process.cwd(), "data", "database.sqlite");
const client = new Database(dbPath);

export const db = drizzle(client, { schema });
