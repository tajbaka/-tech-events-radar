import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import "dotenv/config";

let _client: Sql | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  _client = postgres(connectionString, { prepare: false });
  _db = drizzle(_client);
  return _db;
}

// Proxy so importers get `db.select(...)` etc. without triggering a connection at import time.
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const target = getDb();
    const value = Reflect.get(target, prop, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
