import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
import {
  discoverApplicationFiles,
  discoverRuntimeJsonClosure,
  mediaShardReleaseFiles,
} from '../scripts/media-release-plan.mjs';

const EMPTY_HASH = createHash('sha256').update('').digest('hex');

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function plan(contents = {}) {
  const applicationFiles = ['assets/app.js', 'index.html'];
  const runtimeJsonFiles = [
    'public/runtime/index.json',
    'public/runtime/runtime-manifest.json',
  ];
  const audioFiles = [];
  const mediaFiles = ['public/media/media-manifest.json'];
  const mediaShardFiles = [];
  const derivativeFiles = [];
  const fallbackFiles = [];
  const fallbackOriginals = [];
  const files = [
    '.nojekyll',
    ...applicationFiles,
    ...runtimeJsonFiles,
    ...audioFiles,
    ...mediaFiles,
  ].sort();
  const integrity = files.map((filePath) => {
    const content = filePath === '.nojekyll' ? '' : (contents[filePath] ?? '');
    return { path: filePath, bytes: Buffer.byteLength(content), sha256: sha256(content) };
  });
  const integrityByPath = new Map(integrity.map((item) => [item.path, item]));
  const bytesFor = (filePaths) => filePaths.reduce(
    (sum, filePath) => sum + integrityByPath.get(filePath).bytes,
    0,
  );
  return {
    schemaVersion: 1,
    sourceManifest: 'public/media/media-manifest.json',
    sourceInventory: 'reports/portfolio/fr-p5/fr-p5-media-reference-inventory.json',
    entrypoints: {
      application: 'index.html',
      runtime: 'public/runtime/index.json',
      runtimeManifest: 'public/runtime/runtime-manifest.json',
    },
    applicationFiles,
    runtimeJsonFiles,
    mediaShardFiles,
    audioFiles,
    mediaFiles,
    files,
    integrity,
    byteTotals: {
      total: bytesFor(files),
      applicationFiles: bytesFor(applicationFiles),
      runtimeJsonFiles: bytesFor(runtimeJsonFiles),
      mediaShardFiles: bytesFor(mediaShardFiles),
      audioFiles: bytesFor(audioFiles),
      mediaFiles: bytesFor(mediaFiles),
      derivativeFiles: bytesFor(derivativeFiles),
      fallbackFiles: bytesFor(fallbackFiles),
      fallbackOriginals: bytesFor(fallbackOriginals),
    },
    counts: {
      total: files.length,
      applicationFiles: applicationFiles.length,
      runtimeJsonFiles: runtimeJsonFiles.length,
      mediaShardFiles: mediaShardFiles.length,
      audioFiles: audioFiles.length,
      mediaFiles: mediaFiles.length,
      derivativeFiles: derivativeFiles.length,
      fallbackFiles: fallbackFiles.length,
      fallbackOriginals: fallbackOriginals.length,
    },
    derivativeFiles,
    fallbackFiles,
    fallbackOriginals,
  };
}

test('FR-P5 release plans are stable, unique, integrity-complete and exclude evidence roots', () => {
  const valid = validateMediaReleasePlan(plan());
  assert.equal(valid.files.length, 6);
  assert.equal(valid.integrity.find((item) => item.path === '.nojekyll').sha256, EMPTY_HASH);
  assert.equal(valid.byteTotals.total, 0);
  assert.equal(valid.byteTotals.mediaFiles, 0);

  const unstable = plan();
  [unstable.files[0], unstable.files[1]] = [unstable.files[1], unstable.files[0]];
  assert.throws(() => validateMediaReleasePlan(unstable), /stable ordinal order/);

  const privatePath = plan();
  privatePath.files[0] = 'reports/portfolio/fr-p5/private.json';
  assert.throws(() => validateMediaReleasePlan(privatePath), /forbidden path/);

  const duplicate = plan();
  duplicate.files[1] = duplicate.files[0];
  assert.throws(() => validateMediaReleasePlan(duplicate), /duplicate/);

  const incompleteIntegrity = plan();
  incompleteIntegrity.integrity.pop();
  assert.throws(() => validateMediaReleasePlan(incompleteIntegrity), /integrity must cover/);

  const incorrectAccounting = plan();
  incorrectAccounting.byteTotals.total += 1;
  assert.throws(() => validateMediaReleasePlan(incorrectAccounting), /byteTotals\.total/);
});

test('FR-P5 release copier preserves the public/ projection and writes exactly the allowlist', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-release-plan-'));
  const output = path.join(root, 'dist');
  const contents = {
    'assets/app.js': 'export {};\n',
    'index.html': '<!doctype html>\n',
    'public/media/media-manifest.json': '{}\n',
    'public/runtime/index.json': '{"series":[]}\n',
    'public/runtime/runtime-manifest.json': '{"outputs":[]}\n',
  };
  try {
    for (const [filePath, content] of Object.entries(contents)) {
      const target = path.join(root, ...filePath.split('/'));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }
    await writeFile(path.join(root, 'not-allowed.txt'), 'do not copy\n', 'utf8');

    const releasePlan = plan(contents);
    const result = await copyMediaReleasePlan({ rootDir: root, outputDir: output, plan: releasePlan });
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.extra, []);
    assert.deepEqual(result.mismatched, []);
    assert.equal(await readFile(path.join(output, '.nojekyll'), 'utf8'), '');
    assert.equal(await readFile(path.join(output, 'assets', 'app.js'), 'utf8'), 'export {};\n');
    assert.equal(
      await readFile(path.join(output, 'public', 'media', 'media-manifest.json'), 'utf8'),
      '{}\n',
    );
    const audit = await auditMediaReleaseOutput(output, validateMediaReleasePlan(releasePlan));
    assert.equal(audit.expectedCount, 6);
    assert.equal(audit.actualCount, 6);
    await assert.rejects(readFile(path.join(output, 'media', 'media-manifest.json'), 'utf8'), /ENOENT/);
    await assert.rejects(readFile(path.join(output, 'not-allowed.txt'), 'utf8'), /ENOENT/);

    await writeFile(path.join(output, 'assets', 'app.js'), 'tampered\n', 'utf8');
    assert.deepEqual(
      (await auditMediaReleaseOutput(output, validateMediaReleasePlan(releasePlan))).mismatched,
      ['assets/app.js'],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 release copier refuses outputs outside the project root', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-release-root-'));
  const outside = await mkdtemp(path.join(tmpdir(), 'fr-p5-release-outside-'));
  try {
    await assert.rejects(
      copyMediaReleasePlan({ rootDir: root, outputDir: path.join(outside, 'dist'), plan: plan() }),
      /inside the project root/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('FR-P5 application discovery follows imports and excludes unreferenced assets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-app-closure-'));
  try {
    await mkdir(path.join(root, 'assets'), { recursive: true });
    await writeFile(
      path.join(root, 'index.html'),
      '<link rel="stylesheet" href="assets/site.css?v=1"><script type="module" src="assets/app.js"></script>',
      'utf8',
    );
    await writeFile(path.join(root, 'assets', 'site.css'), '.x{background:url("./icon.svg")}\n', 'utf8');
    await writeFile(path.join(root, 'assets', 'icon.svg'), '<svg></svg>\n', 'utf8');
    await writeFile(path.join(root, 'assets', 'app.js'), "import './module.js';\n", 'utf8');
    await writeFile(path.join(root, 'assets', 'module.js'), 'export {};\n', 'utf8');
    await writeFile(path.join(root, 'assets', 'unused.js'), 'throw new Error();\n', 'utf8');
    assert.deepEqual(await discoverApplicationFiles(root), [
      'assets/app.js',
      'assets/icon.svg',
      'assets/module.js',
      'assets/site.css',
      'index.html',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 runtime discovery follows JSON references and locks runtime-manifest outputs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-runtime-closure-'));
  try {
    await mkdir(path.join(root, 'public', 'runtime', 'topics'), { recursive: true });
    await writeFile(
      path.join(root, 'public', 'runtime', 'index.json'),
      '{"indexPath":"public/runtime/topics.json"}\n',
      'utf8',
    );
    await writeFile(
      path.join(root, 'public', 'runtime', 'topics.json'),
      '{"topics":[{"detailPath":"public/runtime/topics/one.json"}]}\n',
      'utf8',
    );
    await writeFile(path.join(root, 'public', 'runtime', 'topics', 'one.json'), '{"title":"one"}\n', 'utf8');
    await writeFile(
      path.join(root, 'public', 'runtime', 'runtime-manifest.json'),
      JSON.stringify({
        outputs: [
          { path: 'public/runtime/index.json' },
          { path: 'public/runtime/topics.json' },
          { path: 'public/runtime/topics/one.json' },
        ],
      }),
      'utf8',
    );
    assert.deepEqual(await discoverRuntimeJsonClosure(root), [
      'public/runtime/index.json',
      'public/runtime/runtime-manifest.json',
      'public/runtime/topics.json',
      'public/runtime/topics/one.json',
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 release planning requires the canonical index plus exactly 42 unique route shards', () => {
  const shardSet = {
    indexPath: 'public/media/media-shard-index.json',
    shards: Array.from({ length: 42 }, (_, index) => ({
      path: `public/media/shards/test/route-${String(index + 1).padStart(2, '0')}.json`,
    })),
  };
  const files = mediaShardReleaseFiles(shardSet);
  assert.equal(files.length, 43);
  assert.equal(files[0], 'public/media/media-shard-index.json');
  assert.equal(files.filter((filePath) => filePath.startsWith('public/media/shards/')).length, 42);

  assert.throws(
    () => mediaShardReleaseFiles({ ...shardSet, shards: shardSet.shards.slice(0, 41) }),
    /exactly 42/,
  );
  const duplicate = {
    ...shardSet,
    shards: [...shardSet.shards.slice(0, 41), shardSet.shards[0]],
  };
  assert.throws(() => mediaShardReleaseFiles(duplicate), /must be unique/);
});
