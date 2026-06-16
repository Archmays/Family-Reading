import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--test', 'tests/mvp.test.mjs'], {
  stdio: 'inherit',
  shell: false,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Static MVP build check passed.');
