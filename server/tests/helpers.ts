import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { pool, query } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';

export const app: Express = createApp();

export async function resetDatabase(): Promise<void> {
  await migrate(() => {});
  await query('TRUNCATE users, games RESTART IDENTITY CASCADE');
  await seed(() => {});
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export type Session = { agent: ReturnType<typeof request.agent>; userId: number };

/** Registers a user and returns an agent that keeps the session cookie. */
export async function registerUser(
  username: string,
  password = 'correct-horse-battery',
): Promise<Session> {
  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/register')
    .send({ email: `${username}@example.com`, username, password });
  if (response.status !== 201) {
    throw new Error(`Registration failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { agent, userId: response.body.user.id };
}

/** Internal games.id for a seeded game, which is what library endpoints use. */
export async function gameIdByTitle(title: string): Promise<number> {
  const { rows } = await query<{ id: number }>('SELECT id FROM games WHERE title = $1', [title]);
  if (!rows[0]) throw new Error(`Seed game not found: ${title}`);
  return rows[0].id;
}

export async function externalIdByTitle(title: string): Promise<number> {
  const { rows } = await query<{ external_id: string }>(
    'SELECT external_id FROM games WHERE title = $1',
    [title],
  );
  if (!rows[0]) throw new Error(`Seed game not found: ${title}`);
  return Number(rows[0].external_id);
}
