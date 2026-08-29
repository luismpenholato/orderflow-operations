import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const envFile = path.join(rootDir, ".vitest-integration-env.json");

async function runMigrations(databaseUrl: string): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
      )
    `);

    const migrationsDir = path.join(rootDir, "scripts", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const version = file.replace(".sql", "");
      const { rows } = await client.query(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [version],
      );

      if (rows.length > 0) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
          [version],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  execSync("npm run build -w @orderflow/contracts", {
    cwd: rootDir,
    stdio: "pipe",
  });

  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("orderflow_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const databaseUrl = container.getConnectionUri();
  await runMigrations(databaseUrl);

  fs.writeFileSync(envFile, JSON.stringify({ databaseUrl }), "utf-8");

  return async () => {
    await container.stop();
    if (fs.existsSync(envFile)) {
      fs.unlinkSync(envFile);
    }
  };
}
