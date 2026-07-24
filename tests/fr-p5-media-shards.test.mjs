import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import {
  MEDIA_SHARD_INDEX_PATH,
  MEDIA_SHARD_ROOT,
  buildMediaShardDocuments,
  validateMaterializedShardSet,
  writeMediaShardSetAtomic,
} from '../scripts/generate-media-shards.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writePinnedIndexHtml(root, sha256) {
  await writeFile(
    path.join(root, 'index.html'),
    `<!doctype html><meta name="fr-p5-media-manifest-sha256" content="${sha256}">\n`,
    'utf8',
  );
}

function fixture() {
  const media = [];
  const inventoryMedia = [];
  const books = [];
  const topics = [];

  for (let number = 1; number <= 12; number += 1) {
    const suffix = String(number).padStart(2, '0');
    const slug = `carmela-s1-${suffix}`;
    const sourcePath = `public/books/demo/${slug}.png`;
    const entry = {
      sourcePath,
      roles: ['carmela-book-cover', 'carmela-series-cover'],
      variants: [{
        profileId: 'cover',
        path: `public/media/derived/carmela-${suffix}.webp`,
      }],
    };
    media.push(entry);
    inventoryMedia.push({
      path: sourcePath,
      roles: entry.roles,
      useSites: [
        {
          domain: 'carmela',
          ownerType: 'book',
          ownerId: slug,
          role: 'carmela-series-cover',
          section: 'series',
          field: 'cover',
        },
        {
          domain: 'carmela',
          ownerType: 'book',
          ownerId: slug,
          role: 'carmela-book-cover',
          section: 'detail-hero',
          field: 'cover',
        },
      ],
    });
    books.push({ order: number, slug, cover: sourcePath });
  }

  for (let number = 1; number <= 27; number += 1) {
    const suffix = String(number).padStart(2, '0');
    const slug = `topic-${suffix}`;
    const sourcePath = `public/assets/cells-at-work/page-thumbnails/v01/${slug}.webp`;
    const entry = {
      sourcePath,
      roles: ['work-cells-series-thumbnail', 'work-cells-topic-hero'],
      variants: [{
        profileId: 'thumbnail',
        path: `public/media/derived/work-cells-${suffix}.webp`,
      }],
    };
    media.push(entry);
    inventoryMedia.push({
      path: sourcePath,
      roles: entry.roles,
      useSites: [
        {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: slug,
          role: 'work-cells-series-thumbnail',
          section: 'series',
          field: 'thumbnailPath',
        },
        {
          domain: 'work-cells',
          ownerType: 'topic',
          ownerId: slug,
          role: 'work-cells-topic-hero',
          section: 'detail-hero',
          field: 'thumbnailPath',
        },
      ],
    });
    topics.push({ order: number, slug, thumbnailPath: sourcePath });
  }

  media.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath, 'en'));
  inventoryMedia.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  const policyHash = 'b'.repeat(64);
  const manifest = { schemaVersion: 2, policyHash, media };
  const inventory = { schemaVersion: 1, media: inventoryMedia };
  const runtimeIndex = {
    series: [
      {
        seriesSlug: 'carmela-season-1',
        coverImage: books[0].cover,
      },
      {
        seriesSlug: 'work-cells',
        coverImage: topics[0].thumbnailPath,
      },
    ],
  };
  return {
    manifest,
    inventory,
    runtimeIndex,
    carmelaBooks: { books },
    workCellsTopics: { topics },
    canonicalManifestState: {
      bytes: 123456,
      sha256: 'a'.repeat(64),
      policyHash,
    },
  };
}

test('FR-P5 owner shards have the exact deterministic 42-route topology', () => {
  const input = fixture();
  const documents = buildMediaShardDocuments(input);
  assert.equal(documents.shards.length, 42);
  assert.equal(documents.index.totals.shards, 42);
  assert.equal(documents.index.policyHash, input.manifest.policyHash);
  assert.equal(documents.index.canonicalManifest.sha256, input.canonicalManifestState.sha256);
  assert.deepEqual(
    documents.index.shards.map((record) => record.path),
    [...documents.index.shards.map((record) => record.path)].sort(),
  );

  const byRoute = new Map(documents.shards.map((shard) => [shard.document.route.id, shard]));
  assert.equal(byRoute.get('home').document.media.length, 2);
  assert.deepEqual(
    byRoute.get('home').document.media.map((entry) => entry.sourcePath).sort(),
    [
      input.carmelaBooks.books[0].cover,
      input.workCellsTopics.topics[0].thumbnailPath,
    ].sort(),
  );
  assert.equal(byRoute.get('carmela-series').document.media.length, 12);
  assert.equal(byRoute.get('work-cells-series').document.media.length, 27);
  assert.equal(byRoute.get('carmela-book/carmela-s1-07').document.media.length, 1);
  assert.equal(byRoute.get('work-cells-topic/topic-19').document.media.length, 1);

  const canonicalEntry = input.manifest.media.find((entry) => entry.sourcePath.endsWith('carmela-s1-07.png'));
  assert.deepEqual(byRoute.get('carmela-book/carmela-s1-07').document.media[0], canonicalEntry);
  for (const record of documents.index.shards) {
    const shard = documents.shards.find((item) => item.path === record.path);
    assert.equal(shard.document.generatorVersion, documents.index.generatorVersion);
    assert.equal(shard.document.policyHash, documents.index.policyHash);
    assert.deepEqual(shard.document.canonicalManifest, documents.index.canonicalManifest);
    assert.equal(record.bytes, Buffer.byteLength(shard.serialized));
    assert.equal(record.sha256, shard.sha256);
    assert.equal(record.sources, shard.document.media.length);
  }
});

test('FR-P5 shard writer atomically replaces stale files and validator detects drift', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-shards-'));
  const documents = buildMediaShardDocuments(fixture());
  const indexPath = path.join(root, ...MEDIA_SHARD_INDEX_PATH.split('/'));
  const shardRoot = path.join(root, ...MEDIA_SHARD_ROOT.split('/'));
  const homePath = path.join(shardRoot, 'home.json');
  try {
    await writePinnedIndexHtml(root, documents.index.canonicalManifest.sha256);
    await mkdir(shardRoot, { recursive: true });
    await writeFile(path.join(shardRoot, 'stale.json'), '{}\n', 'utf8');
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(indexPath, '{"stale":true}\n', 'utf8');

    const summary = await writeMediaShardSetAtomic({ projectRoot: root, documents });
    assert.equal(summary.expectedShards, 42);
    assert.equal(summary.actualShards, 42);
    await assert.rejects(readFile(path.join(shardRoot, 'stale.json'), 'utf8'), /ENOENT/);
    assert.deepEqual(
      (await validateMaterializedShardSet({ projectRoot: root, expected: documents })).findings,
      [],
    );

    await writeFile(homePath, '{"tampered":true}\n', 'utf8');
    const drift = await validateMaterializedShardSet({ projectRoot: root, expected: documents });
    assert.ok(drift.findings.some((finding) => finding.code === 'MEDIA_SHARD_INDEX_HASH_MISMATCH'));
    assert.ok(drift.findings.some((finding) => finding.code === 'MEDIA_SHARD_STALE'));

    await writeMediaShardSetAtomic({ projectRoot: root, documents });
    await writeFile(path.join(shardRoot, 'orphan.json'), '{}\n', 'utf8');
    const orphaned = await validateMaterializedShardSet({ projectRoot: root, expected: documents });
    assert.ok(orphaned.findings.some((finding) => finding.code === 'MEDIA_SHARD_EXTRA'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 shard writer rolls back both index and shards after installed-set validation fails', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-shards-rollback-'));
  const documents = buildMediaShardDocuments(fixture());
  const indexPath = path.join(root, ...MEDIA_SHARD_INDEX_PATH.split('/'));
  const homePath = path.join(root, ...`${MEDIA_SHARD_ROOT}/home.json`.split('/'));
  try {
    await writePinnedIndexHtml(root, documents.index.canonicalManifest.sha256);
    await writeMediaShardSetAtomic({ projectRoot: root, documents });
    const previousIndex = await readFile(indexPath, 'utf8');
    const previousHome = await readFile(homePath, 'utf8');
    const invalid = {
      ...documents,
      indexSerialized: stableJson({
        ...documents.index,
        shards: [],
      }),
    };
    await assert.rejects(
      writeMediaShardSetAtomic({ projectRoot: root, documents: invalid }),
      /failed validation/,
    );
    assert.equal(await readFile(indexPath, 'utf8'), previousIndex);
    assert.equal(await readFile(homePath, 'utf8'), previousHome);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 shard writer never rolls back a validated install after partial stage cleanup failure', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-shards-committed-cleanup-'));
  const previous = buildMediaShardDocuments(fixture());
  const nextInput = fixture();
  nextInput.manifest.media[0].variants[0].path = 'public/media/derived/carmela-01-v2.webp';
  const next = buildMediaShardDocuments(nextInput);
  const indexPath = path.join(root, ...MEDIA_SHARD_INDEX_PATH.split('/'));
  const homePath = path.join(root, ...`${MEDIA_SHARD_ROOT}/home.json`.split('/'));
  try {
    await writePinnedIndexHtml(root, next.index.canonicalManifest.sha256);
    await writeMediaShardSetAtomic({ projectRoot: root, documents: previous });
    const previousIndex = await readFile(indexPath, 'utf8');
    const previousHome = await readFile(homePath, 'utf8');

    const marker = 'injected-partial-committed-cleanup-failure';
    const summary = await writeMediaShardSetAtomic({
      projectRoot: root,
      documents: next,
      cleanupStageRoot: async (stageRoot) => {
        await rm(path.join(stageRoot, 'previous-media-shard-index.json'), { force: true });
        throw new Error(marker);
      },
    });
    assert.equal(summary.cleanupWarnings.length, 1);
    assert.match(summary.cleanupWarnings[0], new RegExp(marker));
    assert.notEqual(await readFile(indexPath, 'utf8'), previousIndex);
    assert.notEqual(await readFile(homePath, 'utf8'), previousHome);
    assert.deepEqual(
      (await validateMaterializedShardSet({ projectRoot: root, expected: next })).findings,
      [],
    );

    const retry = await writeMediaShardSetAtomic({ projectRoot: root, documents: next });
    assert.deepEqual(retry.cleanupWarnings, []);
    assert.deepEqual(
      (await validateMaterializedShardSet({ projectRoot: root, expected: next })).findings,
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 shard validation fails closed when the HTML release identity is stale', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'fr-p5-shards-html-pin-'));
  const documents = buildMediaShardDocuments(fixture());
  try {
    await writePinnedIndexHtml(root, documents.index.canonicalManifest.sha256);
    await writeMediaShardSetAtomic({ projectRoot: root, documents });
    await writePinnedIndexHtml(root, 'c'.repeat(64));
    const result = await validateMaterializedShardSet({ projectRoot: root, expected: documents });
    assert.ok(result.findings.some((finding) => finding.code === 'MEDIA_HTML_IDENTITY_STALE'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('FR-P5 shard topology fails closed when route inventory is incomplete', () => {
  const input = fixture();
  input.inventory.media = input.inventory.media.filter((record) => !record.path.endsWith('topic-27.webp'));
  assert.throws(
    () => buildMediaShardDocuments(input),
    /exactly equal the logical media inventory/,
  );
});

test('FR-P5 shard generation, verification, release planning and dist audit are wired fail-closed', async () => {
  const packageJson = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'));
  const verifySource = await readFile(path.join(rootDir, 'scripts', 'verify-release.mjs'), 'utf8');
  const runnerSource = await readFile(path.join(rootDir, 'scripts', 'run-tests.mjs'), 'utf8');
  const releasePlanSource = await readFile(path.join(rootDir, 'scripts', 'media-release-plan.mjs'), 'utf8');
  const auditSource = await readFile(path.join(rootDir, 'scripts', 'audit-dist-assets.mjs'), 'utf8');

  assert.equal(
    packageJson.scripts['generate:media-shards'],
    'node scripts/generate-media-shards.mjs --write',
  );
  assert.equal(
    packageJson.scripts['validate:media-shards'],
    'node scripts/generate-media-shards.mjs --check',
  );
  assert.ok(
    verifySource.indexOf("scripts/generate-media-shards.mjs', '--check")
      < verifySource.indexOf("scripts/media-release-plan.mjs', '--check"),
    'verify-release must validate shards before the exact release plan',
  );
  assert.equal((runnerSource.match(/tests\/fr-p5-media-shards\.test\.mjs/g) ?? []).length, 1);
  assert.match(releasePlanSource, /mediaShardFiles/);
  assert.match(releasePlanSource, /validateMaterializedShardSet/);
  assert.match(auditSource, /validateMediaShardSet/);
});
