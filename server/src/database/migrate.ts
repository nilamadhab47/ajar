import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://ajar:ajar@localhost:55432/ajar";

async function migrate() {
  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query(`
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
    const already = await pool.query(
      "select 1 from schema_migrations where version = $1",
      [file],
    );
    if (already.rowCount) continue;

    const sql = await readFile(join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (version) values ($1)", [
        file,
      ]);
      await client.query("commit");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

migrate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
