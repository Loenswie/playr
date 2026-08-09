import pg from 'pg';
import { config } from '../config.js';

// Postgres returns NUMERIC as a string by default to avoid precision loss.
// Playr only stores small ratings, so parsing them as numbers is safe here.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

// TLS is decided by the connection string first, so a hosted database (Render,
// Neon, Supabase) works in development too. Without an sslmode parameter it
// falls back to "on in production, off locally".
// rejectUnauthorized is false because managed providers present certificates the
// Node trust store does not know.
const sslMode = /[?&]sslmode=([a-z-]+)/.exec(config.databaseUrl)?.[1];
const useSsl =
  sslMode === undefined ? config.isProduction : sslMode !== 'disable' && sslMode !== 'allow';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}
