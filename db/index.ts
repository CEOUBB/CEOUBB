import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is unset. Point it at the libSQL database (for example `file:local.db` during development) before using the database."
    );
  }
  cached = drizzle(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }), { schema });
  return cached;
}
