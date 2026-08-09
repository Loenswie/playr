import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

// SESSION_SECRET is only allowed to fall back outside production so that a fresh
// clone runs without setup; production must always provide a real secret.
const sessionSecret = isProduction
  ? required('SESSION_SECRET')
  : process.env.SESSION_SECRET ?? 'dev-only-insecure-secret';

export const config = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  sessionSecret,
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  // Empty when the API also serves the frontend (the default deployment).
  corsOrigin: process.env.CORS_ORIGIN?.trim() || null,
  igdb: {
    clientId: process.env.TWITCH_CLIENT_ID?.trim() || null,
    clientSecret: process.env.TWITCH_CLIENT_SECRET?.trim() || null,
  },
} as const;

export const igdbConfigured = Boolean(config.igdb.clientId && config.igdb.clientSecret);
