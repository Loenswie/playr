// Installs dependencies for server/ and client/.
//
// PLAYR is deliberately NOT an npm workspace and never uses `npm --prefix`.
// Both of those make npm create directory symlinks inside node_modules, which
// fails on Windows drives that do not support symlinks (EISDIR / EPERM).
// Running a plain `npm install` with the working directory set to each package
// needs no symlinks at all and works on any filesystem.

import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// npm exports its own configuration to child processes. Inheriting it here would
// re-apply the parent's prefix/workspace settings to these nested installs.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith('npm_config_')),
);

for (const dir of ['server', 'client']) {
  console.log(`\n> installing ${dir} dependencies`);
  const result = spawnSync(npm, ['install'], {
    cwd: dir,
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`\nInstalling ${dir} dependencies failed.`);
    process.exit(result.status ?? 1);
  }
}
