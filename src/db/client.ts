import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  kboPool?: Pool;
};

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  const pool =
    globalForDb.kboPool ??
    new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  if (process.env.NODE_ENV !== "production") globalForDb.kboPool = pool;
  return drizzle({ client: pool });
}
