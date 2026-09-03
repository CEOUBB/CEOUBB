import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as schema from "../../db/schema.ts";

export interface TestDatabaseContext {
  client: Client;
  db: ReturnType<typeof drizzle<typeof schema>>;
  cleanup: () => Promise<void>;
  beginTransaction: () => Promise<{ rollback: () => Promise<void> }>;
}

export async function createIsolatedTestDb(): Promise<TestDatabaseContext> {
  const client = createClient({ url: ":memory:" });

  // Activar obligatoriamente integridad referencial de SQLite
  await client.execute("PRAGMA foreign_keys = ON;");

  const drizzleDir = fileURLToPath(new URL("../../drizzle", import.meta.url));
  const entries = await readdir(drizzleDir);
  const sqlFiles = entries.filter((f) => f.endsWith(".sql")).sort();

  for (const file of sqlFiles) {
    const rawSql = await readFile(new URL(`../../drizzle/${file}`, import.meta.url), "utf8");
    const statements = rawSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim().replace(/;$/, ""))
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await client.execute(statement);
    }
  }

  const db = drizzle(client, { schema });

  return {
    client,
    db,
    cleanup: async () => {
      client.close();
    },
    beginTransaction: async () => {
      const savepointName = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await client.execute(`SAVEPOINT ${savepointName};`);
      return {
        rollback: async () => {
          await client.execute(`ROLLBACK TO SAVEPOINT ${savepointName};`);
          await client.execute(`RELEASE SAVEPOINT ${savepointName};`);
        },
      };
    },
  };
}
