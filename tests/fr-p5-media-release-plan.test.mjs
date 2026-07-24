import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  auditMediaReleaseOutput,
  copyMediaReleasePlan,
  validateMediaReleasePlan,
} from '../scripts/copy-media-release-plan.mjs';

function plan(files) {
  return {
    schemaVersion: 1,
    sourceManifest: 'public/media/media-manifest.json',
    sourceInventory: 'reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json',
    files,
    counts: {},
  };
}

test('FR-P5 release plans are stable, unique and exclude private/evidence roots', () => {
  const valid = validateMediaReleasePlan(plan([
    '.nojekyll',
    'assets/app.js',
    'index.html',
    'public/media/media-manifest.json',
  ]));
  assert.equal(valid.files.length, 4);
  assert.throws(() => validateMediaReleasePlan(plan([
    '.nojekyll',
    'index.html',
    'assets/app.js',
    'public/media/media-manifest.json',
  ])), /stable ordinal order/);
  assert.throws(() => validateMediaReleasePlan(plan([
    '.nojekyll',
    'index.html',
    'public/media/media-manifest.json',
    'source/private.png',
  ])), /forbidden path/);
  assert.throws(() => validateMediaReleasePlan(plan([
    '.nojekyll',
    'index.html',
    'index.html',
    'public/media/media-manifest.json',
  ])), /duplicate/);
});

test('FR-P5 release copier writes exactly the allowlist and creates .nojekyll', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-release-plan-'));
  const output = path.join(root, 'dist');
  try {
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await mkdir(path.join(root, 'public', 'media'), { recursive: true });
    await writeFile(path.join(root, 'index.html'), '<!doctype html>\n', 'utf8');
    await writeFile(path.join(root, 'assets', 'app.js'), 'export {};\n', 'utf8');
    await writeFile(path.join(root, 'public', 'media', 'media-manifest.json'), '{}\n', 'utf8');
    await writeFile(path.join(root, 'not-allowed.txt'), 'do not copy\n', 'utf8');

    const releasePlan = plan([
      '.nojekyll',
      'assets/app.js',
      'index.html',
      'public/media/media-manifest.json',
    ]);
    const result = await copyMediaReleasePlan({ rootDir: root, outputDir: output, plan: releasePlan });
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.extra, []);
    assert.equal(await readFile(path.join(output, '.nojekyll'), 'utf8'), '');
    assert.equal(await readFile(path.join(output, 'assets', 'app.js'), 'utf8'), 'export {};\n');
    const audit = await auditMediaReleaseOutput(output, validateMediaReleasePlan(releasePlan));
    assert.equal(audit.expectedCount, 4);
    assert.equal(audit.actualCount, 4);
    await assert.rejects(readFile(path.join(output, 'not-allowed.txt'), 'utf8'), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 release copier refuses outputs outside the project root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-release-root-'));
  const outside = await mkdtemp(path.join(tmpdir(), 'fr-p5-release-outside-'));
  try {
    await mkdir(path.join(root, 'public', 'media'), { recursive: true });
    await writeFile(path.join(root, 'index.html'), '<!doctype html>\n', 'utf8');
    await writeFile(path.join(root, 'public', 'media', 'media-manifest.json'), '{}\n', 'utf8');
    const releasePlan = plan([
      '.nojekyll',
      'index.html',
      'public/media/media-manifest.json',
    ]);
    await assert.rejects(
      copyMediaReleasePlan({ rootDir: root, outputDir: path.join(outside, 'dist'), plan: releasePlan }),
      /inside the project root/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
