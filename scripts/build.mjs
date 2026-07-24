import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  copyMediaReleasePlan,
  loadMediaReleasePlan,
} from './copy-media-release-plan.mjs';
import { MEDIA_RELEASE_PLAN_PATH } from './media-release-plan.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(rootDir, 'dist');
const inputsAlreadyValidated = process.argv.slice(2).includes('--validated-inputs');

function runNodeGate(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!inputsAlreadyValidated) {
  runNodeGate('scripts/validate-public-repository.mjs');
  runNodeGate('scripts/generate-runtime-content.mjs', ['--check']);
  runNodeGate('scripts/inventory-runtime-media.mjs', ['--check']);
  runNodeGate('scripts/validate-responsive-media.mjs');
  runNodeGate('scripts/generate-media-shards.mjs', ['--check']);
  runNodeGate('scripts/media-release-plan.mjs', ['--check']);
} else {
  console.log('Reusing the release orchestrator input validation for this exact build process.');
}

const plan = await loadMediaReleasePlan(rootDir, MEDIA_RELEASE_PLAN_PATH);
const copyAudit = await copyMediaReleasePlan({
  rootDir,
  outputDir,
  plan,
  clean: true,
});
console.log(
  `Static GitHub Pages build written to dist from exact release plan `
  + `(${copyAudit.actualCount}/${copyAudit.expectedCount} files).`,
);
runNodeGate('scripts/audit-dist-assets.mjs', ['--validated-inputs']);
