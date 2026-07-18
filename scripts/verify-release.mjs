import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const steps = [
  {
    label: 'full test suite',
    args: ['scripts/run-tests.mjs'],
  },
  {
    label: 'validated static build and dist audit',
    args: ['scripts/build.mjs'],
  },
];

for (const step of steps) {
  console.log(`Running ${step.label} with ${process.version}...`);
  const result = spawnSync(process.execPath, step.args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Release verification passed with ${process.version}.`);
