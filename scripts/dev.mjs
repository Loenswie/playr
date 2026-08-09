// Runs the API and the web app together, with prefixed output.
// Written by hand so that `npm run dev` has no dependency of its own - a missing
// dev-orchestration package should never be the first thing a developer hits.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const TARGETS = [
  { name: 'api', dir: 'server', bin: 'tsx', colour: '\x1b[36m' },
  { name: 'web', dir: 'client', bin: 'vite', colour: '\x1b[35m' },
];
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const isWindows = process.platform === 'win32';

// Check for the actual executables, not just the folder: a half-finished install
// leaves node_modules behind but no working binaries.
const broken = TARGETS.filter(
  ({ dir, bin }) =>
    !existsSync(`${dir}/node_modules/.bin/${bin}`) &&
    !existsSync(`${dir}/node_modules/.bin/${bin}.cmd`),
);

if (broken.length > 0) {
  console.error(
    `\nDependencies are missing or incomplete in: ${broken.map((t) => t.dir).join(', ')}.\n\n` +
      `Run this first:\n\n  npm install\n`,
  );
  process.exit(1);
}

if (!existsSync('server/.env')) {
  console.log(
    `${DIM}No server/.env found. Copy .env.example to server/.env and set DATABASE_URL.${RESET}`,
  );
}

const npm = isWindows ? 'npm.cmd' : 'npm';
const children = [];

// Kept so that a failed API start can be replayed below, where it will be read.
const recentApiOutput = [];

for (const { name, dir, colour } of TARGETS) {
  const child = spawn(npm, ['run', 'dev'], {
    cwd: dir,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Windows refuses to spawn a .cmd shim without a shell.
    shell: isWindows,
  });

  const prefix = (stream) => {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        console.log(`${colour}[${name}]${RESET} ${line}`);
        if (name === 'api') {
          recentApiOutput.push(line);
          if (recentApiOutput.length > 25) recentApiOutput.shift();
        }
      }
    });
  };
  prefix(child.stdout);
  prefix(child.stderr);

  child.on('exit', (code) => {
    console.log(`${colour}[${name}]${RESET} exited with code ${code ?? 0}`);
    stopAll();
    process.exit(code ?? 0);
  });

  children.push(child);
}

// tsx watch keeps running even when the server itself crashes, so a dead API
// looks like a healthy process. Check it directly and say so.
setTimeout(async () => {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/health');
    if (response.ok) return;
  } catch {
    // falls through to the report below
  }

  console.log(
    `\n\x1b[31mThe API is not responding on http://127.0.0.1:3000.\x1b[0m\n` +
      `The web app will show 503 errors until it starts.\n`,
  );

  if (recentApiOutput.some((line) => line.trim())) {
    console.log('What the API reported:\n');
    for (const line of recentApiOutput) if (line.trim()) console.log(`  ${line}`);
    console.log('');
  }

  console.log(
    'Most common causes:\n' +
      '  1. server/.env is missing, or DATABASE_URL is not set in it\n' +
      '  2. DATABASE_URL still contains the CHANGE_ME placeholder password\n' +
      '  3. PostgreSQL is not installed, or its service is not running\n' +
      '  4. The password in DATABASE_URL is wrong, or needs percent-encoding\n' +
      '  5. Port 3000 is already taken by something else\n',
  );
}, 8000).unref?.();

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});
process.on('SIGTERM', stopAll);
