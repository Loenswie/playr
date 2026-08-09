import { config } from './config.js';
import { createApp } from './app.js';
import { pool } from './db/index.js';
import { migrate } from './db/migrate.js';
import { isIgdbConfigured } from './services/igdb.js';

async function start(): Promise<void> {
  // Running migrations on boot keeps Render deploys to a single command.
  await migrate((message) => console.log(`[migrate] ${message}`));

  // No host argument: Node picks the dual-stack address when IPv6 is available
  // and falls back to IPv4 when it is not.
  const server = createApp().listen(config.port, () => {
    console.log(`PLAYR API listening on http://127.0.0.1:${config.port} (${config.nodeEnv})`);
    console.log(
      isIgdbConfigured
        ? 'Discovery source: IGDB'
        : 'Discovery source: local database only (no IGDB credentials). Run npm run db:seed if it is empty.',
    );
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${config.port} is already in use, so the API did not start.\n` +
          `Stop whatever is using it, or set PORT in server/.env to something else.\n`,
      );
    } else {
      console.error('\nThe API failed to start:', error.message, '\n');
    }
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((error: unknown) => {
  console.error('Failed to start PLAYR', error);
  process.exit(1);
});
