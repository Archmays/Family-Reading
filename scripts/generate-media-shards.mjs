import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  MEDIA_MANIFEST_PATH,
  MEDIA_REFERENCE_REPORT_PATH,
  assertAllowedOutput,
  normalizeImagePath,
  normalizeRepositoryPath,
  projectPath,
  stableCompare,
} from './media-path-policy.mjs';
import { validateMediaManifest } from './media-manifest-policy.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MEDIA_SHARD_INDEX_PATH = 'public/media/media-shard-index.json';
export const MEDIA_SHARD_ROOT = 'public/media/shards';
export const MEDIA_SHARD_SCHEMA_VERSION = 1;
export const MEDIA_SHARD_GENERATOR_VERSION = 'fr-p5-media-shards/1';
export const MEDIA_MANIFEST_META_NAME = 'fr-p5-media-manifest-sha256';

const runtimePaths = Object.freeze({
  index: 'public/runtime/index.json',
  carmelaBooks: 'public/runtime/carmela/books.json',
  workCellsTopics: 'public/runtime/work-cells/topics.json',
});
const expectedCounts = Object.freeze({
  carmelaBooks: 12,
  workCellsTopics: 27,
  shards: 42,
});
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sortedUnique(values) {
  return [...new Set(values)].sort(stableCompare);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function readJson(projectRoot, repositoryPath) {
  return JSON.parse(await readFile(projectPath(projectRoot, repositoryPath), 'utf8'));
}

function requiredArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function requiredSlug(value, label) {
  const slug = String(value ?? '');
  if (!SLUG_PATTERN.test(slug)) throw new Error(`${label} is invalid: ${slug || '<empty>'}`);
  return slug;
}

function inventoryPath(record, index) {
  return normalizeImagePath(record?.path, { label: `inventory.media[${index}].path` });
}

function manifestEntryMap(manifest) {
  const entries = new Map(manifest.media.map((entry) => [entry.sourcePath, entry]));
  if (entries.size !== manifest.media.length) throw new Error('Canonical manifest contains duplicate sourcePath entries.');
  return entries;
}

function inventoryRecordMap(inventory) {
  const records = requiredArray(inventory.media, 'inventory.media');
  const entries = new Map(records.map((record, index) => (
    [inventoryPath(record, index), record]
  )));
  if (entries.size !== records.length) throw new Error('Media inventory contains duplicate logical paths.');
  return entries;
}

function assertInventoryRole(recordByPath, sourcePath, role, label) {
  const record = recordByPath.get(sourcePath);
  if (!record) throw new Error(`${label} is absent from the media inventory: ${sourcePath}`);
  if (!(record.roles ?? []).includes(role)) {
    throw new Error(`${label} lacks inventory role ${role}: ${sourcePath}`);
  }
}

function ownerSourcePaths(inventory, domain, ownerId) {
  return sortedUnique(inventory.media
    .filter((record) => (record.useSites ?? []).some((useSite) => (
      useSite.domain === domain && useSite.ownerId === ownerId
    )))
    .map((record) => record.path));
}

function mediaEntriesForPaths(entryByPath, sourcePaths, label) {
  const normalized = sortedUnique(sourcePaths.map((sourcePath) => normalizeImagePath(sourcePath, {
    label: `${label} source`,
  })));
  const entries = normalized.map((sourcePath) => {
    const entry = entryByPath.get(sourcePath);
    if (!entry) throw new Error(`${label} source is absent from the canonical manifest: ${sourcePath}`);
    return entry;
  });
  if (entries.length === 0) throw new Error(`${label} must contain at least one canonical media entry.`);
  return entries;
}

function requiredSeries(runtimeIndex, seriesSlug) {
  const series = requiredArray(runtimeIndex.series, 'runtime index series')
    .find((item) => item.seriesSlug === seriesSlug);
  if (!series) throw new Error(`Runtime index is missing series ${seriesSlug}.`);
  return series;
}

function shardDefinition({ routeId, kind, ownerId = null, repositoryPath, sourcePaths }) {
  const route = { id: routeId, kind };
  if (ownerId) route.ownerId = ownerId;
  return {
    route,
    path: normalizeRepositoryPath(repositoryPath, {
      label: `Shard ${routeId} path`,
    }),
    sourcePaths: sortedUnique(sourcePaths),
  };
}

export function buildMediaShardDocuments({
  manifest,
  inventory,
  runtimeIndex,
  carmelaBooks,
  workCellsTopics,
  canonicalManifestState,
}) {
  if (!manifest || !Array.isArray(manifest.media)) throw new Error('Canonical manifest media is required.');
  if (!inventory || !Array.isArray(inventory.media)) throw new Error('Media inventory is required.');
  if (
    !canonicalManifestState
    || !Number.isInteger(canonicalManifestState.bytes)
    || canonicalManifestState.bytes <= 0
    || !HASH_PATTERN.test(String(canonicalManifestState.sha256 ?? ''))
    || !HASH_PATTERN.test(String(canonicalManifestState.policyHash ?? ''))
  ) {
    throw new Error('Canonical manifest bytes, SHA-256 and policy SHA-256 are required.');
  }
  if (
    !HASH_PATTERN.test(String(manifest.policyHash ?? ''))
    || manifest.policyHash !== canonicalManifestState.policyHash
  ) {
    throw new Error('Canonical manifest policyHash must match its materialized state.');
  }

  const books = requiredArray(carmelaBooks.books, 'Carmela books');
  const topics = requiredArray(workCellsTopics.topics, 'Work Cells topics');
  if (books.length !== expectedCounts.carmelaBooks) {
    throw new Error(`Carmela shard topology requires exactly ${expectedCounts.carmelaBooks} books; found ${books.length}.`);
  }
  if (topics.length !== expectedCounts.workCellsTopics) {
    throw new Error(`Work Cells shard topology requires exactly ${expectedCounts.workCellsTopics} topics; found ${topics.length}.`);
  }

  const entryByPath = manifestEntryMap(manifest);
  const recordByPath = inventoryRecordMap(inventory);
  const inventoryPaths = [...recordByPath.keys()].sort(stableCompare);
  const manifestPaths = [...entryByPath.keys()].sort(stableCompare);
  if (!sameJson(inventoryPaths, manifestPaths)) {
    throw new Error('Canonical manifest sources must exactly equal the logical media inventory before sharding.');
  }

  const carmelaSeries = requiredSeries(runtimeIndex, 'carmela-season-1');
  const workCellsSeries = requiredSeries(runtimeIndex, 'work-cells');
  const carmelaHomeCover = normalizeImagePath(carmelaSeries.coverImage, { label: 'Carmela home cover' });
  const workCellsHomeCover = normalizeImagePath(workCellsSeries.coverImage, { label: 'Work Cells home cover' });
  const homeSources = sortedUnique([carmelaHomeCover, workCellsHomeCover]);
  if (homeSources.length !== 2) throw new Error(`Home media shard must contain exactly 2 distinct sources; found ${homeSources.length}.`);

  const carmelaCoverPaths = books.map((book, index) => {
    const slug = requiredSlug(book.slug, `Carmela books[${index}].slug`);
    const cover = normalizeImagePath(book.cover, { label: `Carmela ${slug} cover` });
    assertInventoryRole(recordByPath, cover, 'carmela-series-cover', `Carmela ${slug} cover`);
    return cover;
  });
  if (new Set(carmelaCoverPaths).size !== expectedCounts.carmelaBooks) {
    throw new Error('Carmela series shard requires one distinct cover per book.');
  }

  const workCellsThumbnailPaths = topics.map((topic, index) => {
    const slug = requiredSlug(topic.slug, `Work Cells topics[${index}].slug`);
    const thumbnail = normalizeImagePath(topic.thumbnailPath, { label: `Work Cells ${slug} thumbnail` });
    assertInventoryRole(recordByPath, thumbnail, 'work-cells-series-thumbnail', `Work Cells ${slug} thumbnail`);
    return thumbnail;
  });
  if (new Set(workCellsThumbnailPaths).size !== expectedCounts.workCellsTopics) {
    throw new Error('Work Cells series shard requires one distinct thumbnail per topic.');
  }
  if (!carmelaCoverPaths.includes(carmelaHomeCover)) {
    throw new Error('Carmela home cover must be one of the exact Carmela series covers.');
  }
  if (!workCellsThumbnailPaths.includes(workCellsHomeCover)) {
    throw new Error('Work Cells home cover must be one of the exact Work Cells series thumbnails.');
  }

  const definitions = [
    shardDefinition({
      routeId: 'home',
      kind: 'home',
      repositoryPath: `${MEDIA_SHARD_ROOT}/home.json`,
      sourcePaths: homeSources,
    }),
    shardDefinition({
      routeId: 'carmela-series',
      kind: 'carmela-series',
      repositoryPath: `${MEDIA_SHARD_ROOT}/carmela-series.json`,
      sourcePaths: carmelaCoverPaths,
    }),
    ...books.map((book, index) => {
      const slug = requiredSlug(book.slug, `Carmela books[${index}].slug`);
      return shardDefinition({
        routeId: `carmela-book/${slug}`,
        kind: 'carmela-book',
        ownerId: slug,
        repositoryPath: `${MEDIA_SHARD_ROOT}/carmela-book/${slug}.json`,
        sourcePaths: ownerSourcePaths(inventory, 'carmela', slug),
      });
    }),
    shardDefinition({
      routeId: 'work-cells-series',
      kind: 'work-cells-series',
      repositoryPath: `${MEDIA_SHARD_ROOT}/work-cells-series.json`,
      sourcePaths: workCellsThumbnailPaths,
    }),
    ...topics.map((topic, index) => {
      const slug = requiredSlug(topic.slug, `Work Cells topics[${index}].slug`);
      return shardDefinition({
        routeId: `work-cells-topic/${slug}`,
        kind: 'work-cells-topic',
        ownerId: slug,
        repositoryPath: `${MEDIA_SHARD_ROOT}/work-cells-topic/${slug}.json`,
        sourcePaths: ownerSourcePaths(inventory, 'work-cells', slug),
      });
    }),
  ].sort((left, right) => stableCompare(left.path, right.path));

  if (definitions.length !== expectedCounts.shards) {
    throw new Error(`Media shard topology requires exactly ${expectedCounts.shards} shards; found ${definitions.length}.`);
  }
  const routeIds = definitions.map((definition) => definition.route.id);
  const shardPaths = definitions.map((definition) => definition.path);
  if (new Set(routeIds).size !== routeIds.length || new Set(shardPaths).size !== shardPaths.length) {
    throw new Error('Media shard routes and paths must be unique.');
  }

  const canonicalManifest = {
    path: MEDIA_MANIFEST_PATH,
    bytes: canonicalManifestState.bytes,
    sha256: canonicalManifestState.sha256,
    policyHash: canonicalManifestState.policyHash,
    sources: manifest.media.length,
    variants: manifest.media.reduce((sum, entry) => sum + entry.variants.length, 0),
  };

  const shards = definitions.map((definition) => {
    const media = mediaEntriesForPaths(entryByPath, definition.sourcePaths, `Shard ${definition.route.id}`);
    const document = {
      schemaVersion: MEDIA_SHARD_SCHEMA_VERSION,
      generatorVersion: MEDIA_SHARD_GENERATOR_VERSION,
      policyHash: canonicalManifest.policyHash,
      canonicalManifestPath: MEDIA_MANIFEST_PATH,
      canonicalManifest,
      route: definition.route,
      media,
      totals: {
        sources: media.length,
        variants: media.reduce((sum, entry) => sum + entry.variants.length, 0),
      },
    };
    const serialized = stableJson(document);
    const bytes = Buffer.byteLength(serialized);
    return {
      path: definition.path,
      document,
      serialized,
      bytes,
      sha256: sha256(serialized),
    };
  });

  const index = {
    schemaVersion: MEDIA_SHARD_SCHEMA_VERSION,
    generatorVersion: MEDIA_SHARD_GENERATOR_VERSION,
    policyHash: canonicalManifest.policyHash,
    canonicalManifest,
    shards: shards.map((shard) => ({
      routeId: shard.document.route.id,
      path: shard.path,
      sha256: shard.sha256,
      bytes: shard.bytes,
      sources: shard.document.totals.sources,
      variants: shard.document.totals.variants,
    })),
    totals: {
      shards: shards.length,
      sourcesAcrossShards: shards.reduce((sum, shard) => sum + shard.document.totals.sources, 0),
      variantsAcrossShards: shards.reduce((sum, shard) => sum + shard.document.totals.variants, 0),
    },
  };
  return {
    indexPath: MEDIA_SHARD_INDEX_PATH,
    index,
    indexSerialized: stableJson(index),
    shards,
  };
}

export async function generateMediaShardSet({ projectRoot = rootDir } = {}) {
  const manifestBytes = await readFile(projectPath(projectRoot, MEDIA_MANIFEST_PATH));
  const manifest = validateMediaManifest(JSON.parse(manifestBytes.toString('utf8')));
  const inventory = await readJson(projectRoot, MEDIA_REFERENCE_REPORT_PATH);
  const [runtimeIndex, carmelaBooks, workCellsTopics] = await Promise.all([
    readJson(projectRoot, runtimePaths.index),
    readJson(projectRoot, runtimePaths.carmelaBooks),
    readJson(projectRoot, runtimePaths.workCellsTopics),
  ]);
  return buildMediaShardDocuments({
    manifest,
    inventory,
    runtimeIndex,
    carmelaBooks,
    workCellsTopics,
    canonicalManifestState: {
      bytes: manifestBytes.length,
      sha256: sha256(manifestBytes),
      policyHash: manifest.policyHash,
    },
  });
}

async function walkFiles(directory) {
  const files = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => stableCompare(left.name, right.name));
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  try {
    await walk(directory);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return files;
}

function addFinding(findings, code, message, item = '') {
  findings.push({ code, message, item });
}

async function validateHtmlManifestIdentity(projectRoot, expectedSha256, findings) {
  const htmlPath = projectPath(projectRoot, 'index.html');
  let html;
  try {
    html = await readFile(htmlPath, 'utf8');
  } catch (error) {
    addFinding(findings, 'MEDIA_HTML_IDENTITY_MISSING', error.message, 'index.html');
    return;
  }
  const escapedName = MEDIA_MANIFEST_META_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...html.matchAll(new RegExp(
    `<meta\\s+name=["']${escapedName}["']\\s+content=["']([a-f0-9]{64})["']\\s*\\/?>`,
    'giu',
  ))];
  if (matches.length !== 1) {
    addFinding(
      findings,
      'MEDIA_HTML_IDENTITY_INVALID',
      `index.html must contain exactly one ${MEDIA_MANIFEST_META_NAME} 64-hex meta identity.`,
      'index.html',
    );
    return;
  }
  if (matches[0][1].toLowerCase() !== expectedSha256) {
    addFinding(
      findings,
      'MEDIA_HTML_IDENTITY_STALE',
      `HTML media manifest SHA-256 ${matches[0][1].toLowerCase()} does not match ${expectedSha256}.`,
      'index.html',
    );
  }
}

function validateExpectedShardDocuments(expected) {
  if (!expected?.index || !expected.indexSerialized || !Array.isArray(expected.shards)) {
    throw new Error('Expected media shard documents are required.');
  }
  if (expected.shards.length !== expectedCounts.shards) {
    throw new Error(`Expected media shard documents must contain exactly ${expectedCounts.shards} shards.`);
  }
  const paths = expected.shards.map((shard, index) => {
    const shardPath = normalizeRepositoryPath(shard.path, {
      label: `Expected shard[${index}].path`,
    });
    if (!shardPath.startsWith(`${MEDIA_SHARD_ROOT}/`) || !shardPath.endsWith('.json')) {
      throw new Error(`Expected shard path is outside ${MEDIA_SHARD_ROOT}: ${shardPath}`);
    }
    if (typeof shard.serialized !== 'string') {
      throw new Error(`Expected shard serialization is missing: ${shardPath}`);
    }
    return shardPath;
  });
  if (new Set(paths).size !== paths.length) throw new Error('Expected media shard paths must be unique.');
  return paths;
}

export async function validateMaterializedShardSet({
  projectRoot = rootDir,
  expected,
} = {}) {
  validateExpectedShardDocuments(expected);
  const findings = [];
  await validateHtmlManifestIdentity(
    projectRoot,
    expected.index.canonicalManifest.sha256,
    findings,
  );
  const expectedByPath = new Map(expected.shards.map((shard) => [shard.path, shard]));
  const shardRoot = projectPath(projectRoot, MEDIA_SHARD_ROOT);
  const actualFiles = (await walkFiles(shardRoot))
    .map((filePath) => path.relative(projectRoot, filePath).split(path.sep).join('/'))
    .sort(stableCompare);
  const expectedPaths = [...expectedByPath.keys()].sort(stableCompare);
  for (const missing of expectedPaths.filter((filePath) => !actualFiles.includes(filePath))) {
    addFinding(findings, 'MEDIA_SHARD_MISSING', 'Expected route shard is missing.', missing);
  }
  for (const extra of actualFiles.filter((filePath) => !expectedByPath.has(filePath))) {
    addFinding(findings, 'MEDIA_SHARD_EXTRA', 'Unexpected or stale route shard is present.', extra);
  }

  let actualIndex = null;
  let actualIndexBytes = null;
  try {
    actualIndexBytes = await readFile(projectPath(projectRoot, MEDIA_SHARD_INDEX_PATH));
    actualIndex = JSON.parse(actualIndexBytes.toString('utf8'));
  } catch (error) {
    addFinding(findings, 'MEDIA_SHARD_INDEX_INVALID', error.message, MEDIA_SHARD_INDEX_PATH);
  }
  if (actualIndexBytes && actualIndexBytes.toString('utf8').replaceAll('\r\n', '\n') !== expected.indexSerialized) {
    addFinding(findings, 'MEDIA_SHARD_INDEX_STALE', 'Media shard index bytes differ from the canonical route closure.', MEDIA_SHARD_INDEX_PATH);
  }

  const actualIndexByPath = new Map(
    Array.isArray(actualIndex?.shards)
      ? actualIndex.shards.map((record) => [record.path, record])
      : [],
  );
  if (!Array.isArray(actualIndex?.shards)) {
    addFinding(findings, 'MEDIA_SHARD_INDEX_SCHEMA', 'Media shard index shards must be an array.', MEDIA_SHARD_INDEX_PATH);
  }

  for (const expectedShard of expected.shards) {
    let bytes;
    try {
      bytes = await readFile(projectPath(projectRoot, expectedShard.path));
    } catch (error) {
      if (error.code !== 'ENOENT') addFinding(findings, 'MEDIA_SHARD_INVALID', error.message, expectedShard.path);
      continue;
    }
    const actualHash = sha256(bytes);
    const indexRecord = actualIndexByPath.get(expectedShard.path);
    if (
      !indexRecord
      || indexRecord.sha256 !== actualHash
      || indexRecord.bytes !== bytes.length
      || indexRecord.sources !== expectedShard.document.totals.sources
      || indexRecord.variants !== expectedShard.document.totals.variants
    ) {
      addFinding(findings, 'MEDIA_SHARD_INDEX_HASH_MISMATCH', 'Shard bytes/hash/counts do not match the shard index.', expectedShard.path);
    }
    if (bytes.toString('utf8').replaceAll('\r\n', '\n') !== expectedShard.serialized) {
      addFinding(findings, 'MEDIA_SHARD_STALE', 'Shard entries differ from the canonical manifest route closure.', expectedShard.path);
      continue;
    }
    try {
      const document = JSON.parse(bytes.toString('utf8'));
      if (!sameJson(document.media, expectedShard.document.media)) {
        addFinding(findings, 'MEDIA_SHARD_ENTRY_MISMATCH', 'Shard media entries are not JSON-equivalent to canonical entries.', expectedShard.path);
      }
    } catch (error) {
      addFinding(findings, 'MEDIA_SHARD_INVALID', error.message, expectedShard.path);
    }
  }

  return {
    findings,
    summary: {
      expectedShards: expected.shards.length,
      actualShards: actualFiles.length,
      canonicalManifestBytes: expected.index.canonicalManifest.bytes,
      canonicalManifestSha256: expected.index.canonicalManifest.sha256,
      sourcesAcrossShards: expected.index.totals.sourcesAcrossShards,
      variantsAcrossShards: expected.index.totals.variantsAcrossShards,
    },
  };
}

export async function validateMediaShardSet({ projectRoot = rootDir } = {}) {
  try {
    const expected = await generateMediaShardSet({ projectRoot });
    return await validateMaterializedShardSet({ projectRoot, expected });
  } catch (error) {
    return {
      findings: [{
        code: 'MEDIA_SHARD_GENERATION_INVALID',
        message: error.message,
        item: MEDIA_SHARD_INDEX_PATH,
      }],
      summary: null,
    };
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function writeMediaShardSetAtomic({
  projectRoot = rootDir,
  documents,
  cleanupStageRoot = (target) => rm(target, { recursive: true, force: true }),
} = {}) {
  validateExpectedShardDocuments(documents);
  const scratchRoot = projectPath(projectRoot, 'task-scratch/fr-p5');
  assertAllowedOutput(projectRoot, scratchRoot);
  await mkdir(scratchRoot, { recursive: true });
  const stageRoot = await mkdtemp(path.join(scratchRoot, 'media-shards-stage-'));
  assertAllowedOutput(projectRoot, stageRoot);
  const stagedShards = path.join(stageRoot, 'shards');
  const stagedIndex = path.join(stageRoot, 'media-shard-index.json');
  const backupShards = path.join(stageRoot, 'previous-shards');
  const backupIndex = path.join(stageRoot, 'previous-media-shard-index.json');
  const finalShards = projectPath(projectRoot, MEDIA_SHARD_ROOT);
  const finalIndex = projectPath(projectRoot, MEDIA_SHARD_INDEX_PATH);
  assertAllowedOutput(projectRoot, finalShards);
  assertAllowedOutput(projectRoot, finalIndex);

  let oldShardsMoved = false;
  let newShardsInstalled = false;
  let oldIndexMoved = false;
  let newIndexInstalled = false;
  let committedSummary = null;
  try {
    await mkdir(stagedShards, { recursive: true });
    for (const shard of documents.shards) {
      const shardPath = normalizeRepositoryPath(shard.path, { label: 'Staged media shard path' });
      const relative = shardPath.slice(`${MEDIA_SHARD_ROOT}/`.length);
      const target = path.join(stagedShards, ...relative.split('/'));
      const targetRelative = path.relative(stagedShards, target);
      if (!targetRelative || targetRelative.startsWith('..') || path.isAbsolute(targetRelative)) {
        throw new Error(`Staged media shard escaped its root: ${shardPath}`);
      }
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, shard.serialized, 'utf8');
    }
    await writeFile(stagedIndex, documents.indexSerialized, 'utf8');
    await mkdir(path.dirname(finalShards), { recursive: true });

    if (await pathExists(finalShards)) {
      await rename(finalShards, backupShards);
      oldShardsMoved = true;
    }
    await rename(stagedShards, finalShards);
    newShardsInstalled = true;
    if (await pathExists(finalIndex)) {
      await rename(finalIndex, backupIndex);
      oldIndexMoved = true;
    }
    await rename(stagedIndex, finalIndex);
    newIndexInstalled = true;

    const validation = await validateMaterializedShardSet({
      projectRoot,
      expected: documents,
    });
    if (validation.findings.length > 0) {
      throw new Error(`Installed media shard set failed validation: ${validation.findings[0].code}`);
    }
    committedSummary = validation.summary;
  } catch (error) {
    if (newIndexInstalled && await pathExists(finalIndex)) {
      await rm(finalIndex, { force: true });
    }
    if (oldIndexMoved && await pathExists(backupIndex)) {
      await rename(backupIndex, finalIndex);
    }
    if (newShardsInstalled && await pathExists(finalShards)) {
      await rm(finalShards, { recursive: true, force: true });
    }
    if (oldShardsMoved && await pathExists(backupShards)) {
      await rename(backupShards, finalShards);
    }
    await rm(stageRoot, { recursive: true, force: true });
    throw error;
  }

  // Commit boundary: once the installed index and shard set validate, they are
  // authoritative. Stage/backup deletion is post-commit hygiene and must never
  // enter rollback, even if cleanup partially removes recovery files first.
  const cleanupWarnings = [];
  try {
    await cleanupStageRoot(stageRoot);
  } catch (error) {
    cleanupWarnings.push(
      `Committed media shard set; could not fully remove ${stageRoot}: ${error.message}`,
    );
  }
  return {
    ...committedSummary,
    cleanupWarnings,
  };
}

function parseArguments(argv) {
  const options = { mode: 'print' };
  for (const argument of argv) {
    if (argument === '--write') options.mode = 'write';
    else if (argument === '--check') options.mode = 'check';
    else throw new Error(`Unknown media shard argument: ${argument}`);
  }
  return options;
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  const documents = await generateMediaShardSet();
  if (options.mode === 'write') {
    const summary = await writeMediaShardSetAtomic({ documents });
    for (const warning of summary.cleanupWarnings) console.warn(`WARNING: ${warning}`);
    console.log(`Media shard set written atomically: ${summary.actualShards}/${summary.expectedShards} shards.`);
    return;
  }
  if (options.mode === 'check') {
    const result = await validateMaterializedShardSet({ expected: documents });
    if (result.findings.length > 0) {
      for (const finding of result.findings) {
        console.error(`${finding.code}: ${finding.message}${finding.item ? ` (${finding.item})` : ''}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log(`Media shard set is current: ${result.summary.actualShards}/${result.summary.expectedShards} shards.`);
    return;
  }
  process.stdout.write(documents.indexSerialized);
}

const directExecutionPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const scriptPath = fileURLToPath(import.meta.url);
const sameScript = process.platform === 'win32'
  ? directExecutionPath.toLowerCase() === scriptPath.toLowerCase()
  : directExecutionPath === scriptPath;

if (sameScript) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
