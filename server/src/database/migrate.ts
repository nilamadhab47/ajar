import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigModule } from "@nestjs/config";
import { Pool, type PoolClient } from "pg";

const fallbackDatabaseUrl = "postgres://ajar:ajar@localhost:55432/ajar";
const migrationLockKey = [741001, 55432] as const;

/** Applies pending SQL files once, even when two runners start together. */
async function migrate() {
  await ConfigModule.forRoot();
  const databaseUrl = process.env.DATABASE_URL ?? fallbackDatabaseUrl;
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  let locked = false;

  try {
    await client.query("select pg_advisory_lock($1, $2)", [...migrationLockKey]);
    locked = true;
    await applyMigrations(client);
  } finally {
    try {
      if (locked) {
        await client.query("select pg_advisory_unlock($1, $2)", [
          ...migrationLockKey,
        ]);
      }
    } finally {
      client.release();
      await pool.end();
    }
  }
}

/** Creates the version table and applies each SQL file that is not recorded yet. */
async function applyMigrations(client: PoolClient) {
  await client.query(`
    create table if not exists schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = join(__dirname, "../../migrations");
  const files = (await readdir(dir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await client.query(
      "select 1 from schema_migrations where version = $1",
      [file],
    );
    if (already.rowCount) continue;

    const sql = await readFile(join(dir, file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (version) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
}

migrate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
