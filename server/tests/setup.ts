// Tests run against a real PostgreSQL database so that constraints, enums and
// unique indexes are exercised exactly as they behave in production.

// dotenv is loaded here, before the app imports it, so that anything read from
// server/.env can be overridden below. dotenv never overwrites variables that
// are already set, and only runs once per process.
process.env.NODE_ENV = 'test';
await import('dotenv/config');

process.env.SESSION_SECRET ??= 'test-secret-that-is-long-enough-for-tests';
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// The suite must behave identically whether or not the developer has IGDB
// credentials configured, and must never call a real external API.
delete process.env.TWITCH_CLIENT_ID;
delete process.env.TWITCH_CLIENT_SECRET;
