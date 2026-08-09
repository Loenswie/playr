import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API key and session cookie never leave the backend, so the dev server
    // talks to Express exactly like production does.
    proxy: {
      '/api': {
        // 127.0.0.1, not localhost: since Node 17 'localhost' can resolve to the
        // IPv6 ::1 first, while the API listens on IPv4, giving ECONNREFUSED ::1:3000.
        target: 'http://127.0.0.1:3000',
        // Without this, an API that failed to start shows up in the browser as an
        // empty 500, which says nothing about the actual problem.
        configure: (proxy) => {
          proxy.on('error', (_error, _req, res) => {
            if ('writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error:
                    'The PLAYR API is not running on port 3000. Check the [api] output in your terminal.',
                }),
              );
            }
          });
        },
      },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
