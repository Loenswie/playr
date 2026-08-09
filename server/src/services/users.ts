import { hash, verify } from '@node-rs/argon2';
import { query } from '../db/index.js';

export type User = { id: number; email: string; username: string; createdAt: string };

// Argon2id with parameters in line with the OWASP password storage cheat sheet.
const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

type UserRow = { id: number; email: string; username: string; created_at: Date };

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    createdAt: row.created_at.toISOString(),
  };
}

export class EmailTakenError extends Error {}
export class UsernameTakenError extends Error {}

export async function createUser(
  email: string,
  username: string,
  password: string,
): Promise<User> {
  const passwordHash = await hash(password, ARGON_OPTIONS);
  try {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash],
    );
    return toUser(rows[0]!);
  } catch (error) {
    const constraint = (error as { constraint?: string }).constraint;
    if (constraint === 'users_email_lower_key') throw new EmailTakenError();
    if (constraint === 'users_username_lower_key') throw new UsernameTakenError();
    throw error;
  }
}

/** Returns the user when the password matches, otherwise null. */
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const { rows } = await query<UserRow & { password_hash: string }>(
    `SELECT id, email, username, created_at, password_hash
     FROM users WHERE lower(email) = lower($1)`,
    [email],
  );

  const row = rows[0];
  if (!row) {
    // Hash a dummy password so a missing account takes the same time as a wrong one.
    await hash(password, ARGON_OPTIONS);
    return null;
  }

  return (await verify(row.password_hash, password)) ? toUser(row) : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const { rows } = await query<UserRow>(
    'SELECT id, email, username, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0] ? toUser(rows[0]) : null;
}
