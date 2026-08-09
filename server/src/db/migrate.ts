import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';
import { pool } from './index.js';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Creates the database named in DATABASE_URL if it does not exist yet, so a new
 * developer does not have to run createdb by hand. Skipped in production, where
 * the database is provisioned by the host and the app may not have permission.
 */
async function ensureDatabaseExists(log: (message: string) => void): Promise<void> {
  if (config.isProduction) return;

  const url = new URL(config.databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!name) return;

  // Connect to the default maintenance database to ask about the target one.
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';
  const client = new pg.Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();
  } catch {
    // The server itself is unreachable; let the normal connection report that.
    return;
  }

  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!rowCount) {
      // Database names cannot be parameterised. The value comes from our own
      // DATABASE_URL and is double-quoted so it stays a single identifier.
      await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
      log(`created database ${name}`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Applies every .sql file in migrations/ exactly once, in filename order.
 * Each migration runs inside a transaction, so a failure leaves no partial schema.
 */
export async function migrate(log: (message: string) => void = console.log): Promise<void> {
  await ensureDatabaseExists(log);

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(
        (row) => row.name,
      ),
    );

    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    log('migrations up to date');
  } finally {
    client.release();
  }
}

// Only run automatically when invoked directly (npm run db:migrate).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  migrate()
    .then(() => pool.end())
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
